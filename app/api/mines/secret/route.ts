import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleApiError } from "@/lib/mines/helpers";
import { revealActiveSecret, getActiveSecretHash } from "@/lib/mines/mines.service";
import { UnauthorizedError } from "@/lib/mines/errors";

/**
 * GET /api/mines/secret
 *
 * Get the active server secret hash for pre-game display.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) throw new UnauthorizedError();

    const data = await getActiveSecretHash(userId);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/mines/secret
 *
 * Reveal/check the active server secret.
 * This marks the current secret as REVEALED and creates a new ACTIVE one.
 * Cannot be called while a game is active.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) throw new UnauthorizedError();

    const result = await revealActiveSecret(userId);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
