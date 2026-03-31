/**
 * Provably fair mine generation utilities.
 * Uses Node.js crypto — deterministic given the same inputs.
 *
 * Algorithm:
 * 1. Concatenate clientSecret + serverSecret + ounce
 * 2. SHA-256 hash → hex string (64 chars)
 * 3. Walk the hash 2 chars at a time to place each mine:
 *    - Parse 2 hex chars → int (0–255)
 *    - candidate = value % 25 (board positions 0–24)
 *    - If position occupied, increment + wrap until empty
 * 4. Repeat until all mines placed.
 *
 * This is fully deterministic: same inputs always produce the same board.
 */

import { createHash, randomBytes } from "crypto";
import { BOARD_SIZE } from "./types";

/**
 * Generate a cryptographically secure random server secret.
 * 32 bytes → 64 hex characters.
 */
export function generateServerSecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Deterministically generate mine positions on a 5×5 board.
 *
 * @param clientSecret - User-provided client seed
 * @param serverSecret - Server-generated secret
 * @param ounce        - The ounce counter for this game
 * @param mineCount    - Number of mines to place (1–24)
 * @returns Array of mine positions (0–24), length === mineCount
 */
export function generateMinePositions(
  clientSecret: string,
  serverSecret: string,
  ounce: number,
  mineCount: number
): number[] {
  const input = `${clientSecret}${serverSecret}${ounce}`;
  const hash = createHash("sha256").update(input).digest("hex");

  const mines: number[] = [];
  const occupied = new Set<number>();

  // We have 64 hex chars → 32 pairs. If mineCount > 32 we rehash, but max is 24 so this is safe.
  let hashSource = hash;
  let pairIndex = 0;

  for (let i = 0; i < mineCount; i++) {
    // If we've exhausted pairs in the current hash, rehash with a counter
    if (pairIndex * 2 >= hashSource.length) {
      hashSource = createHash("sha256")
        .update(hash + String(pairIndex))
        .digest("hex");
      pairIndex = 0;
    }

    const hexPair = hashSource.substring(pairIndex * 2, pairIndex * 2 + 2);
    pairIndex++;

    const value = parseInt(hexPair, 16); // 0–255
    let candidate = value % BOARD_SIZE; // 0–24

    // If position is already occupied, increment + wrap until we find an empty spot
    while (occupied.has(candidate)) {
      candidate = (candidate + 1) % BOARD_SIZE;
    }

    occupied.add(candidate);
    mines.push(candidate);
  }

  return mines;
}

/**
 * Verify that a board was generated correctly given the inputs.
 * Useful for provably fair verification.
 */
export function verifyMinePositions(
  clientSecret: string,
  serverSecret: string,
  ounce: number,
  mineCount: number,
  claimedPositions: number[]
): boolean {
  const generated = generateMinePositions(
    clientSecret,
    serverSecret,
    ounce,
    mineCount
  );
  if (generated.length !== claimedPositions.length) return false;

  const genSet = new Set(generated);
  const claimSet = new Set(claimedPositions);
  if (genSet.size !== claimSet.size) return false;

  for (const pos of genSet) {
    if (!claimSet.has(pos)) return false;
  }
  return true;
}
