/**
 * TypeScript types for the Mines game backend.
 * Keeps route handlers and service layer type-safe.
 */

// ---------- Input types ----------

export interface StartGameInput {
  clientSecret: string;
  betAmount: number;
  mineCount: number;
}

export interface RevealTileInput {
  gameId: string;
  position: number; // 0-24
}

export interface CashOutInput {
  gameId: string;
}

// ---------- Response types ----------

/** Game response sent to the client. Never includes minePositions unless the game is finished. */
export interface GameResponse {
  id: string;
  userId: string;
  clientSecret: string;
  serverSecretHash: string;
  ounce: number;
  betAmount: number;
  mineCount: number;
  revealedCells: number[];
  status: string;
  currentMultiplier: number;
  payout: number | null;
  createdAt: Date;
  endedAt: Date | null;
  /** Only present when game is finished (BUSTED or CASHED_OUT) */
   minePositions?: number[];
  /** Total safe cells on the board */
  totalSafeCells: number;
  /** Only present if the server secret has been revealed */
  serverSecret?: string;
}

export interface SecretRevealResponse {
  revealedSecret: string;
  serverSecretHash: string;
  ounceAtReveal: number;
  newActiveSecretCreated: boolean;
}

export interface GameHistoryResponse {
  games: GameResponse[];
  total: number;
  limit: number;
  offset: number;
}

// ---------- Constants ----------

export const BOARD_SIZE = 25; // 5x5
export const MIN_MINES = 1;
export const MAX_MINES = 24; // must leave at least 1 safe cell

/**
 * Platform house edge. 0.99 = 1% cut.
 * The house edge is applied uniformly to the fair multiplier.
 */
export const HOUSE_EDGE = 0.99;

/**
 * Calculate the payout multiplier after `safePicks` successful safe tile reveals.
 *
 * Formula:
 *   fairMultiplier(k) = ∏(i=0..k-1) (totalTiles - i) / (safeTiles - i)
 *   displayMultiplier(k) = fairMultiplier(k) × HOUSE_EDGE
 *
 * Example (3 mines, 25 tiles):
 *   Pick 1: (25/22) × 0.99 ≈ 1.12
 *   Pick 2: (25/22)×(24/21) × 0.99 ≈ 1.28
 *
 * Example (20 mines, 25 tiles):
 *   Pick 1: (25/5) × 0.99 ≈ 4.95
 *
 * @param safePicks  Number of successfully revealed safe tiles (≥ 1)
 * @param mineCount  Number of mines on the board
 * @param boardSize  Total tiles on the board (default 25)
 * @returns The display multiplier rounded to 2 decimal places
 */
export function calculateMultiplier(
  safePicks: number,
  mineCount: number,
  boardSize: number = BOARD_SIZE
): number {
  if (safePicks <= 0) return 1.0;

  const safeTiles = boardSize - mineCount;
  let multiplier = 1.0;

  for (let i = 0; i < safePicks; i++) {
    multiplier *= (boardSize - i) / (safeTiles - i);
  }

  multiplier *= HOUSE_EDGE;

  return Math.round(multiplier * 100) / 100;
}
