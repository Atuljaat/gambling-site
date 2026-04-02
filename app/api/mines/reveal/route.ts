import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleApiError, startTimer, endTimer, logTiming } from "@/lib/mines/helpers";
import { revealTile } from "@/lib/mines/mines.service";
import { UnauthorizedError, ValidationError } from "@/lib/mines/errors";
import type { RevealTileInput } from "@/lib/mines/types";

/**
 * POST /api/mines/reveal
 *
 * Reveal a tile on the active game board.
 * Body: { gameId: string, position: number }
 */
export async function POST(req: NextRequest) {
  const t0 = startTimer();
  try {
    const tAuth = startTimer();
    const userId = await getAuthUserId(req);
    const authMs = endTimer(tAuth);

    if (!userId) throw new UnauthorizedError();

    const body = (await req.json()) as Partial<RevealTileInput>;

    if (!body.gameId || body.position === undefined || body.position === null) {
      throw new ValidationError("gameId and position are required");
    }

    const tService = startTimer();
    const game = await revealTile(userId, body.gameId, body.position);
    const serviceMs = endTimer(tService);

    logTiming("reveal", { auth: authMs, service: serviceMs, total: endTimer(t0) });

    return NextResponse.json(game, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
