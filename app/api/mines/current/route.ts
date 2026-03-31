import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleApiError } from "@/lib/mines/helpers";
import { getCurrentGame } from "@/lib/mines/mines.service";
import { UnauthorizedError } from "@/lib/mines/errors";

/**
 * GET /api/mines/current
 *
 * Get the user's currently active Mines game, if any.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) throw new UnauthorizedError();

    const game = await getCurrentGame(userId);

    if (!game) {
      return NextResponse.json({ game: null }, { status: 200 });
    }

    return NextResponse.json(game, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
