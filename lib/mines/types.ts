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
}

export interface SecretRevealResponse {
  revealedSecret: string;
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
export const MULTIPLIER_PER_REVEAL = 1.25;
