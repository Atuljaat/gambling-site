import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserBalance } from "@/lib/transactions";

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const balance = await getUserBalance(session.user.id);

        return NextResponse.json({
            balance,
        });
    } catch (error) {
        console.error("Balance fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch balance" },
            { status: 500 }
        );
    }
}
