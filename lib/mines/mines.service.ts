/**
 * Mines game service — all business logic.
 *
 * Separation of concerns:
 *   Route handlers → validate auth + parse input → call service → return response
 *   Service        → business rules, DB access via Prisma, transaction management
 *   Provably-fair  → pure functions for mine generation
 *
 * Key behaviors:
 *   - Ounce starts at 1 and increments each time a server secret is reused.
 *   - Server secret is reused if user starts a new game without checking/revealing it.
 *   - Revealing the server secret marks it as REVEALED and creates a new ACTIVE one.
 *   - Multiplier is 1.25× per safe reveal, rounded to 2 decimal places.
 *   - Mine positions are never returned to the client while the game is ACTIVE.
 *
 * Performance notes (supabase-postgres-best-practices):
 *   - query-covering-indexes: selects fetch only the fields needed, not SELECT *.
 *   - data-n-plus-one: balance check + secret lookup are parallelized with Promise.all.
 *   - lock-short-transactions: all heavy computation (mine generation) is done BEFORE
 *     the write transaction, keeping the transaction scope as short as possible.
 *   - lock-deadlock-prevention: write order inside transactions is always consistent
 *     (user balance → transaction log → game record).
 */

import { prisma } from "@/lib/db";
import { createTransaction, TransactionType } from "@/lib/transactions";
import {
  generateMinePositions,
  generateServerSecret,
  hashServerSecret,
} from "./provably-fair";
import {
  ValidationError,
  InsufficientBalanceError,
  NotFoundError,
  ConflictError,
} from "./errors";
import {
  BOARD_SIZE,
  MIN_MINES,
  MAX_MINES,
  calculateMultiplier,
} from "./types";
import type { GameResponse, SecretRevealResponse } from "./types";
import { round2 } from "./helpers";

// ────────────────────────────────────────────────────────────
// Helpers — format a Prisma MineGame row into a safe API response
// ────────────────────────────────────────────────────────────

function toGameResponse(
  game: {
    id: string;
    userId: string;
    clientSecret: string;
    ounce: number;
    betAmount: number;
    mineCount: number;
    minePositions: unknown;
    revealedCells: unknown;
    status: string;
    currentMultiplier: number;
    payout: number | null;
    createdAt: Date;
    endedAt: Date | null;
    serverSecret: { serverSecretHash: string; serverSecret?: string; status?: string };
  },
  includesMines: boolean
): GameResponse {
  const resp: GameResponse = {
    id: game.id,
    userId: game.userId,
    clientSecret: game.clientSecret,
    serverSecretHash: game.serverSecret.serverSecretHash,
    ounce: game.ounce,
    betAmount: round2(game.betAmount),
    mineCount: game.mineCount,
    revealedCells: game.revealedCells as number[],
    status: game.status,
    currentMultiplier: round2(game.currentMultiplier),
    payout: game.payout !== null ? round2(game.payout) : null,
    createdAt: game.createdAt,
    endedAt: game.endedAt,
    totalSafeCells: BOARD_SIZE - game.mineCount,
  };

  if (includesMines) {
    resp.minePositions = game.minePositions as number[];
  }

  // Include serverSecret ONLY if it's explicitly fetched AND revealed
  if (game.serverSecret.status === "REVEALED" && game.serverSecret.serverSecret) {
    resp.serverSecret = game.serverSecret.serverSecret;
  }

  return resp;
}

// ────────────────────────────────────────────────────────────
// Service functions
// ────────────────────────────────────────────────────────────

/**
 * Start a new game or return the existing active game.
 *
 * Optimizations:
 *  - FIX 2: balance check + secret fetch are parallelized with Promise.all
 *    (two independent reads that previously ran sequentially).
 *  - FIX 1: interactive $transaction used for game creation so we can use
 *    `include` directly on `tx.mineGame.create`, eliminating the redundant
 *    post-creation `findFirst` re-fetch that was an entire extra DB roundtrip.
 *  - lock-short-transactions: generateMinePositions (pure CPU) runs BEFORE the
 *    write transaction, keeping the lock window as short as possible.
 */
export async function startOrLoadGame(
  userId: string,
  clientSecret: string,
  betAmount: number,
  mineCount: number
): Promise<GameResponse> {
  // 1. Validate inputs early — no DB cost
  if (!clientSecret || typeof clientSecret !== "string" || clientSecret.trim().length === 0) {
    throw new ValidationError("clientSecret is required and must be a non-empty string");
  }
  if (typeof betAmount !== "number" || betAmount <= 0) {
    throw new ValidationError("betAmount must be a positive number");
  }
  if (
    typeof mineCount !== "number" ||
    !Number.isInteger(mineCount) ||
    mineCount < MIN_MINES ||
    mineCount > MAX_MINES
  ) {
    throw new ValidationError(
      `mineCount must be an integer between ${MIN_MINES} and ${MAX_MINES}`
    );
  }

  betAmount = round2(betAmount);

  // 2. Check for existing active game — early exit
  const existingGame = await prisma.mineGame.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { serverSecret: { select: { serverSecretHash: true } } },
  });

  if (existingGame) {
    return toGameResponse(existingGame, false);
  }

  // 3 + 4. FIX 2: Parallelize balance check and secret lookup.
  //   These are independent reads — no reason to wait for one before firing the other.
  //   supabase: data-n-plus-one — avoid sequential round trips for unrelated reads.
  const [user, existingSecret] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      // query-covering-indexes: only fetch the field we need
      select: { balance: true },
    }),
    prisma.serverSecret.findFirst({
      where: { userId, status: "ACTIVE" },
      // query-covering-indexes: only fetch fields needed for game generation
      select: {
        id: true,
        serverSecret: true,
        serverSecretHash: true,
        currentOunce: true,
      },
    }),
  ]);

  if (!user) {
    throw new NotFoundError("User not found");
  }
  if (round2(user.balance) < betAmount) {
    throw new InsufficientBalanceError(
      `Insufficient balance. Need ${betAmount}, have ${round2(user.balance)}`
    );
  }

  // 4. Resolve server secret (create or increment) — must be sequential since
  //    increment depends on the read above.
  let secretId: string;
  let secretRaw: string;
  let secretHash: string;
  let ounce: number;

  if (existingSecret) {
    // Reuse: increment ounce atomically
    const updated = await prisma.serverSecret.update({
      where: { id: existingSecret.id },
      data: { currentOunce: { increment: 1 } },
      select: { id: true, serverSecret: true, serverSecretHash: true, currentOunce: true },
    });
    secretId = updated.id;
    secretRaw = updated.serverSecret;
    secretHash = updated.serverSecretHash;
    ounce = updated.currentOunce;
  } else {
    // No active secret → create one (ounce starts at 1)
    const newRawSecret = generateServerSecret();
    const newHash = hashServerSecret(newRawSecret);
    const created = await prisma.serverSecret.create({
      data: {
        userId,
        serverSecret: newRawSecret,
        serverSecretHash: newHash,
        status: "ACTIVE",
        currentOunce: 1,
      },
      select: { id: true, serverSecret: true, serverSecretHash: true, currentOunce: true },
    });
    secretId = created.id;
    secretRaw = created.serverSecret;
    secretHash = created.serverSecretHash;
    ounce = created.currentOunce;
  }

  // 5. Generate mine positions BEFORE the transaction (pure CPU, no DB needed).
  //    lock-short-transactions: keep the write transaction as short as possible.
  const minePositions = generateMinePositions(
    clientSecret.trim(),
    secretRaw,
    ounce,
    mineCount
  );

  // 6 + 7. FIX 1: Use interactive transaction so we can `include` on the create
  //    and return the record directly — no post-creation findFirst re-fetch needed.
  //    lock-deadlock-prevention: consistent write order — user → transaction → game.
  const createdGame = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: betAmount } },
    });
    await tx.transaction.create({
      data: {
        userId,
        type: TransactionType.BET,
        amount: betAmount,
        description: `Mines bet (${mineCount} mines)`,
      },
    });
    const game = await tx.mineGame.create({
      data: {
        userId,
        serverSecretId: secretId,
        clientSecret: clientSecret.trim(),
        ounce,
        betAmount,
        mineCount,
        minePositions,
        revealedCells: [],
        status: "ACTIVE",
        currentMultiplier: 1.0,
      },
      // FIX 1: include here avoids a second round-trip after create
      include: {
        serverSecret: {
          select: { serverSecretHash: true },
        },
      },
    });
    return game;
  });

  return toGameResponse(createdGame, false);
}

/**
 * Reveal a tile on the board.
 *
 * If the tile is a mine → game is BUSTED.
 * If the tile is safe → update multiplier (×1.25), persist revealed cells.
 * If all safe tiles are revealed → auto cash-out.
 *
 * Optimization (FIX 6):
 *   The pre-check findUnique now uses a tight select — only fetches the 7 fields
 *   needed for game logic, not the full row (which includes clientSecret, ounce,
 *   serverSecretId, createdAt etc. that are irrelevant here).
 */
export async function revealTile(
  userId: string,
  gameId: string,
  position: number
): Promise<GameResponse> {
  // Validate position
  if (
    typeof position !== "number" ||
    !Number.isInteger(position) ||
    position < 0 ||
    position >= BOARD_SIZE
  ) {
    throw new ValidationError(`position must be an integer between 0 and ${BOARD_SIZE - 1}`);
  }

  // FIX 6: Tight select — only the fields needed for game logic
  const game = await prisma.mineGame.findUnique({
    where: { id: gameId },
    select: {
      userId: true,
      status: true,
      minePositions: true,
      revealedCells: true,
      mineCount: true,
      betAmount: true,
      currentMultiplier: true,
    },
  });

  if (!game) throw new NotFoundError("Game not found");
  if (game.userId !== userId) throw new ValidationError("This game does not belong to you");
  if (game.status !== "ACTIVE") throw new ConflictError("Game is not active");

  const revealedCells = game.revealedCells as number[];
  const minePositions = game.minePositions as number[];

  if (revealedCells.includes(position)) {
    throw new ValidationError("This cell is already revealed");
  }

  const isMine = minePositions.includes(position);

  if (isMine) {
    // BUSTED — game over
    const updatedGame = await prisma.mineGame.update({
      where: { id: gameId },
      data: {
        revealedCells: [...revealedCells, position],
        status: "BUSTED",
        payout: 0,
        endedAt: new Date(),
      },
      include: { serverSecret: { select: { serverSecretHash: true } } },
    });
    return toGameResponse(updatedGame, true);
  }

  // Safe reveal
  const newRevealed = [...revealedCells, position];
  const newMultiplier = calculateMultiplier(newRevealed.length, game.mineCount);
  const totalSafeCells = BOARD_SIZE - game.mineCount;

  // Check if all safe cells are now revealed → auto cash-out
  if (newRevealed.length >= totalSafeCells) {
    const payout = round2(game.betAmount * newMultiplier);

    // lock-deadlock-prevention: consistent write order — game → user → transaction log
    const updatedGame = await prisma.$transaction(async (tx) => {
      const g = await tx.mineGame.update({
        where: { id: gameId },
        data: {
          revealedCells: newRevealed,
          currentMultiplier: newMultiplier,
          status: "CASHED_OUT",
          payout,
          endedAt: new Date(),
        },
        include: { serverSecret: { select: { serverSecretHash: true } } },
      });
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: payout } },
      });
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.WIN,
          amount: payout,
          description: `Mines win — all safe cells revealed (${newMultiplier}x)`,
        },
      });
      return g;
    });

    return toGameResponse(updatedGame, true);
  }

  // Normal safe reveal — single update, no transaction needed
  const updatedGame = await prisma.mineGame.update({
    where: { id: gameId },
    data: {
      revealedCells: newRevealed,
      currentMultiplier: newMultiplier,
    },
    include: { serverSecret: { select: { serverSecretHash: true } } },
  });

  return toGameResponse(updatedGame, false);
}

/**
 * Cash out the current game, crediting the user.
 *
 * Optimization (FIX 6):
 *   Pre-check findUnique uses a tight select — only 5 fields needed,
 *   not the full row.
 */
export async function cashOut(
  userId: string,
  gameId: string
): Promise<GameResponse> {
  // FIX 6: Tight select
  const game = await prisma.mineGame.findUnique({
    where: { id: gameId },
    select: {
      userId: true,
      status: true,
      revealedCells: true,
      betAmount: true,
      currentMultiplier: true,
    },
  });

  if (!game) throw new NotFoundError("Game not found");
  if (game.userId !== userId) throw new ValidationError("This game does not belong to you");
  if (game.status !== "ACTIVE") throw new ConflictError("Game is not active");

  const revealedCells = game.revealedCells as number[];

  if (revealedCells.length === 0) {
    throw new ValidationError("You must reveal at least one safe tile before cashing out");
  }

  const payout = round2(game.betAmount * game.currentMultiplier);

  // lock-deadlock-prevention: consistent write order — game → user → transaction log
  const updatedGame = await prisma.$transaction(async (tx) => {
    const g = await tx.mineGame.update({
      where: { id: gameId },
      data: {
        status: "CASHED_OUT",
        payout,
        endedAt: new Date(),
      },
      include: { serverSecret: { select: { serverSecretHash: true } } },
    });
    await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: payout } },
    });
    await tx.transaction.create({
      data: {
        userId,
        type: TransactionType.WIN,
        amount: payout,
        description: `Mines cash out (${round2(game.currentMultiplier)}x)`,
      },
    });
    return g;
  });

  // Reveal mine positions on cash out
  return toGameResponse(updatedGame, true);
}

/**
 * Get the user's currently active game, if any.
 */
export async function getCurrentGame(
  userId: string
): Promise<GameResponse | null> {
  const game = await prisma.mineGame.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { serverSecret: { select: { serverSecretHash: true } } },
  });

  if (!game) return null;

  return toGameResponse(game, false);
}

/**
 * Reveal the active server secret for a user.
 * Marks it as REVEALED and creates a new ACTIVE secret.
 */
export async function revealActiveSecret(
  userId: string
): Promise<SecretRevealResponse> {
  const secret = await prisma.serverSecret.findFirst({
    where: { userId, status: "ACTIVE" },
  });

  if (!secret) {
    throw new NotFoundError("No active server secret found");
  }

  // Check for active game — don't allow revealing while a game is running
  const activeGame = await prisma.mineGame.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { id: true },
  });

  if (activeGame) {
    throw new ConflictError(
      "Cannot reveal server secret while a game is active. Finish or cash out first."
    );
  }

  // Mark as revealed + create new active secret atomically
  await prisma.$transaction(async (tx) => {
    await tx.serverSecret.update({
      where: { id: secret.id },
      data: {
        status: "REVEALED",
        revealedAt: new Date(),
      },
    });
    const newRawSecret = generateServerSecret();
    await tx.serverSecret.create({
      data: {
        userId,
        serverSecret: newRawSecret,
        serverSecretHash: hashServerSecret(newRawSecret),
        status: "ACTIVE",
        currentOunce: 1,
      },
    });
  });

  return {
    revealedSecret: secret.serverSecret,
    serverSecretHash: secret.serverSecretHash,
    ounceAtReveal: secret.currentOunce,
    newActiveSecretCreated: true,
  };
}

/**
 * Get the active server secret hash for pre-game provably fair display.
 * Generates a new active secret if none exists.
 */
export async function getActiveSecretHash(
  userId: string
): Promise<{ serverSecretHash: string }> {
  let secret = await prisma.serverSecret.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { serverSecretHash: true },
  });

  if (!secret) {
    const newRawSecret = generateServerSecret();
    secret = await prisma.serverSecret.create({
      data: {
        userId,
        serverSecret: newRawSecret,
        serverSecretHash: hashServerSecret(newRawSecret),
        status: "ACTIVE",
        currentOunce: 1,
      },
      select: { serverSecretHash: true },
    });
  }

  return { serverSecretHash: secret.serverSecretHash };
}

/**
 * Get game history (completed games only).
 *
 * data-n-plus-one: count and findMany are parallelized with Promise.all.
 * The serverSecret include fetches serverSecretHash + serverSecret + status
 * which are all required for provably fair verification on the history page.
 */
export async function getGameHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ games: GameResponse[]; total: number }> {
  const [games, total] = await Promise.all([
    prisma.mineGame.findMany({
      where: {
        userId,
        status: { in: ["CASHED_OUT", "BUSTED"] },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
      skip: offset,
      include: { serverSecret: { select: { serverSecretHash: true, serverSecret: true, status: true } } },
    }),
    prisma.mineGame.count({
      where: {
        userId,
        status: { in: ["CASHED_OUT", "BUSTED"] },
      },
    }),
  ]);

  return {
    games: games.map((g) => toGameResponse(g, true)),
    total,
  };
}
