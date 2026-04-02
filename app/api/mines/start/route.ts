import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleApiError, startTimer, endTimer, logTiming } from "@/lib/mines/helpers";
import { startOrLoadGame } from "@/lib/mines/mines.service";
import { UnauthorizedError, ValidationError } from "@/lib/mines/errors";
import type { StartGameInput } from "@/lib/mines/types";

/**
 * POST /api/mines/start
 *
 * Start a new Mines game or return the existing active game.
 * Body: { clientSecret: string, betAmount: number, mineCount: number }
 */
export async function POST(req: NextRequest) {
  const t0 = startTimer();
  try {
    const tAuth = startTimer();
    const userId = await getAuthUserId(req);
    const authMs = endTimer(tAuth);

    if (!userId) throw new UnauthorizedError();

    const body = (await req.json()) as Partial<StartGameInput>;

    if (!body.clientSecret || !body.betAmount || !body.mineCount) {
      throw new ValidationError(
        "clientSecret, betAmount, and mineCount are required"
      );
    }

    const tService = startTimer();
    const game = await startOrLoadGame(
      userId,
      body.clientSecret,
      body.betAmount,
      body.mineCount
    );
    const serviceMs = endTimer(tService);

    logTiming("start", { auth: authMs, service: serviceMs, total: endTimer(t0) });

    return NextResponse.json(game, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
