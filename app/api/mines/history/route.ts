import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleApiError } from "@/lib/mines/helpers";
import { getGameHistory } from "@/lib/mines/mines.service";
import { UnauthorizedError } from "@/lib/mines/errors";

/**
 * GET /api/mines/history?limit=20&offset=0
 *
 * Get the user's completed Mines game history (paginated).
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) throw new UnauthorizedError();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const result = await getGameHistory(userId, limit, offset);

    return NextResponse.json(
      { ...result, limit, offset },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
