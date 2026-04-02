import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleApiError, startTimer, endTimer, logTiming } from "@/lib/mines/helpers";
import { cashOut } from "@/lib/mines/mines.service";
import { UnauthorizedError, ValidationError } from "@/lib/mines/errors";
import type { CashOutInput } from "@/lib/mines/types";

/**
 * POST /api/mines/cashout
 *
 * Cash out the current active game.
 * Body: { gameId: string }
 */
export async function POST(req: NextRequest) {
  const t0 = startTimer();
  try {
    const tAuth = startTimer();
    const userId = await getAuthUserId(req);
    const authMs = endTimer(tAuth);

    if (!userId) throw new UnauthorizedError();

    const body = (await req.json()) as Partial<CashOutInput>;

    if (!body.gameId) {
      throw new ValidationError("gameId is required");
    }

    const tService = startTimer();
    const game = await cashOut(userId, body.gameId);
    const serviceMs = endTimer(tService);

    logTiming("cashout", { auth: authMs, service: serviceMs, total: endTimer(t0) });

    return NextResponse.json(game, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
