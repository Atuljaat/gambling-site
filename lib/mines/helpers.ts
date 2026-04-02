/**
 * Shared helpers for Mines API route handlers.
 * - Auth extraction via better-auth
 * - Standardized error → HTTP response mapping
 * - Dev-only timing utilities (nodejs-backend-patterns: structured logging)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AppError } from "./errors";

const isDev = process.env.NODE_ENV === "development";

/**
 * Extract authenticated user ID from request headers.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(req: NextRequest): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Map an error to a NextResponse with the correct status code.
 * AppError subclasses get their statusCode; unknown errors get 500.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  console.error("Unhandled error in Mines API:", error);

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : error instanceof Error
        ? error.message
        : "Unknown error";

  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Round a number to 2 decimal places.
 * Used everywhere we deal with balances/multipliers to avoid floating-point drift.
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ────────────────────────────────────────────────────────────
// Dev-only timing utilities
// nodejs-backend-patterns: structured logging pattern
// ────────────────────────────────────────────────────────────

/**
 * Start a timer. Returns an opaque handle.
 * In production this is a no-op that returns 0.
 */
export function startTimer(): number {
  return isDev ? performance.now() : 0;
}

/**
 * End a timer and return elapsed milliseconds rounded to 1 decimal.
 * In production returns 0 without any computation.
 */
export function endTimer(start: number): number {
  if (!isDev) return 0;
  return Math.round((performance.now() - start) * 10) / 10;
}

/**
 * Log a structured timing line to the console — development only.
 * Format: [mines/<route>] auth: 12.3ms | service: 84.1ms | total: 96.4ms
 *
 * To remove later: delete this function and all `logTiming(...)` calls.
 */
export function logTiming(
  route: string,
  timings: Record<string, number>
): void {
  if (!isDev) return;
  const parts = Object.entries(timings)
    .map(([k, v]) => `${k}: ${v}ms`)
    .join(" | ");
  console.log(`\x1b[36m[mines/${route}]\x1b[0m ${parts}`);
}
