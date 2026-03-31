import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleApiError } from "@/lib/mines/helpers";
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
  try {
    const userId = await getAuthUserId(req);
    if (!userId) throw new UnauthorizedError();

    const body = (await req.json()) as Partial<RevealTileInput>;

    if (!body.gameId || body.position === undefined || body.position === null) {
      throw new ValidationError("gameId and position are required");
    }

    const game = await revealTile(userId, body.gameId, body.position);

    return NextResponse.json(game, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
