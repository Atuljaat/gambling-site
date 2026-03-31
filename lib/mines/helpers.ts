/**
 * Shared helpers for Mines API route handlers.
 * - Auth extraction via better-auth
 * - Standardized error → HTTP response mapping
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AppError } from "./errors";

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
