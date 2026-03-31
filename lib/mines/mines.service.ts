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
 */

import { prisma } from "@/lib/db";
import { createTransaction, TransactionType } from "@/lib/transactions";
import {
  generateMinePositions,
  generateServerSecret,
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
  MULTIPLIER_PER_REVEAL,
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
  },
  includesMines: boolean
): GameResponse {
  const resp: GameResponse = {
    id: game.id,
    userId: game.userId,
    clientSecret: game.clientSecret,
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

  return resp;
}

// ────────────────────────────────────────────────────────────
// Service functions
// ────────────────────────────────────────────────────────────

/**
 * Start a new game or return the existing active game.
 *
 * Flow:
 * 1. If user already has an ACTIVE game → return it.
 * 2. Validate inputs.
 * 3. Check balance ≥ betAmount.
 * 4. Get or create server secret (reuse if ACTIVE, increment ounce).
 * 5. Generate mine positions.
 * 6. Deduct bet from balance.
 * 7. Create MineGame record.
 */
export async function startOrLoadGame(
  userId: string,
  clientSecret: string,
  betAmount: number,
  mineCount: number
): Promise<GameResponse> {
  // 1. Check for existing active game — early exit (js-early-exit)
  const existingGame = await prisma.mineGame.findFirst({
    where: { userId, status: "ACTIVE" },
  });

  if (existingGame) {
    return toGameResponse(existingGame, false);
  }

  // 2. Validate inputs
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

  // 3. Check balance
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (round2(user.balance) < betAmount) {
    throw new InsufficientBalanceError(
      `Insufficient balance. Need ${betAmount}, have ${round2(user.balance)}`
    );
  }

  // 4. Get or create server secret
  let secret = await prisma.serverSecret.findFirst({
    where: { userId, status: "ACTIVE" },
  });

  if (secret) {
    // Reuse: increment ounce
    secret = await prisma.serverSecret.update({
      where: { id: secret.id },
      data: { currentOunce: { increment: 1 } },
    });
  } else {
    // No active secret → create one (ounce starts at 1)
    secret = await prisma.serverSecret.create({
      data: {
        userId,
        serverSecret: generateServerSecret(),
        status: "ACTIVE",
        currentOunce: 1,
      },
    });
  }

  const ounce = secret.currentOunce;

  // 5. Generate mine positions
  const minePositions = generateMinePositions(
    clientSecret.trim(),
    secret.serverSecret,
    ounce,
    mineCount
  );

  // 6 + 7. Deduct bet and create game atomically
  const [, newGame] = await prisma.$transaction([
    // Deduct balance + record transaction
    prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: betAmount } },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.BET,
        amount: betAmount,
        description: `Mines bet (${mineCount} mines)`,
      },
    }),
    prisma.mineGame.create({
      data: {
        userId,
        serverSecretId: secret.id,
        clientSecret: clientSecret.trim(),
        ounce,
        betAmount,
        mineCount,
        minePositions,
        revealedCells: [],
        status: "ACTIVE",
        currentMultiplier: 1.0,
      },
    }),
  ]);

  // Fetch the created game (the third item in the batch)
  const createdGame = await prisma.mineGame.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!createdGame) {
    throw new Error("Failed to create game");
  }

  return toGameResponse(createdGame, false);
}

/**
 * Reveal a tile on the board.
 *
 * If the tile is a mine → game is BUSTED.
 * If the tile is safe → update multiplier (×1.25), persist revealed cells.
 * If all safe tiles are revealed → auto cash-out.
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

  // Load game
  const game = await prisma.mineGame.findUnique({
    where: { id: gameId },
  });

  if (!game) {
    throw new NotFoundError("Game not found");
  }
  if (game.userId !== userId) {
    throw new ValidationError("This game does not belong to you");
  }
  if (game.status !== "ACTIVE") {
    throw new ConflictError("Game is not active");
  }

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
    });

    // Reveal mine positions on bust
    return toGameResponse(updatedGame, true);
  }

  // Safe reveal
  const newRevealed = [...revealedCells, position];
  const newMultiplier = round2(game.currentMultiplier * MULTIPLIER_PER_REVEAL);
  const totalSafeCells = BOARD_SIZE - game.mineCount;

  // Check if all safe cells are now revealed → auto cash-out
  if (newRevealed.length >= totalSafeCells) {
    const payout = round2(game.betAmount * newMultiplier);

    // Credit user + finalize game
    const [updatedGame] = await prisma.$transaction([
      prisma.mineGame.update({
        where: { id: gameId },
        data: {
          revealedCells: newRevealed,
          currentMultiplier: newMultiplier,
          status: "CASHED_OUT",
          payout,
          endedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: payout } },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: TransactionType.WIN,
          amount: payout,
          description: `Mines win — all safe cells revealed (${newMultiplier}x)`,
        },
      }),
    ]);

    return toGameResponse(updatedGame, true);
  }

  // Normal safe reveal
  const updatedGame = await prisma.mineGame.update({
    where: { id: gameId },
    data: {
      revealedCells: newRevealed,
      currentMultiplier: newMultiplier,
    },
  });

  return toGameResponse(updatedGame, false);
}

/**
 * Cash out the current game, crediting the user.
 */
export async function cashOut(
  userId: string,
  gameId: string
): Promise<GameResponse> {
  const game = await prisma.mineGame.findUnique({
    where: { id: gameId },
  });

  if (!game) {
    throw new NotFoundError("Game not found");
  }
  if (game.userId !== userId) {
    throw new ValidationError("This game does not belong to you");
  }
  if (game.status !== "ACTIVE") {
    throw new ConflictError("Game is not active");
  }

  const revealedCells = game.revealedCells as number[];

  if (revealedCells.length === 0) {
    throw new ValidationError("You must reveal at least one safe tile before cashing out");
  }

  const payout = round2(game.betAmount * game.currentMultiplier);

  // Credit user + finalize game atomically
  const [updatedGame] = await prisma.$transaction([
    prisma.mineGame.update({
      where: { id: gameId },
      data: {
        status: "CASHED_OUT",
        payout,
        endedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: payout } },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.WIN,
        amount: payout,
        description: `Mines cash out (${round2(game.currentMultiplier)}x)`,
      },
    }),
  ]);

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
  });

  if (activeGame) {
    throw new ConflictError(
      "Cannot reveal server secret while a game is active. Finish or cash out first."
    );
  }

  // Mark as revealed + create new active secret atomically
  await prisma.$transaction([
    prisma.serverSecret.update({
      where: { id: secret.id },
      data: {
        status: "REVEALED",
        revealedAt: new Date(),
      },
    }),
    prisma.serverSecret.create({
      data: {
        userId,
        serverSecret: generateServerSecret(),
        status: "ACTIVE",
        currentOunce: 1,
      },
    }),
  ]);

  return {
    revealedSecret: secret.serverSecret,
    ounceAtReveal: secret.currentOunce,
    newActiveSecretCreated: true,
  };
}

/**
 * Get game history (completed games only).
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
