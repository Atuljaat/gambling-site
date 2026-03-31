import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleApiError } from "@/lib/mines/helpers";
import { revealActiveSecret } from "@/lib/mines/mines.service";
import { UnauthorizedError } from "@/lib/mines/errors";

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
