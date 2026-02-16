import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserTransactions, getUserBalance, TransactionType } from "@/lib/transactions";

export async function GET(req: NextRequest) {
    try {
        // Get authenticated user
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const type = searchParams.get("type") as TransactionType | null;

        // Get transactions
        const transactions = await getUserTransactions(session.user.id, {
            limit,
            offset,
            ...(type && { type }),
        });

        // Get current balance
        const balance = await getUserBalance(session.user.id);

        return NextResponse.json({
            success: true,
            balance,
            transactions,
            pagination: {
                limit,
                offset,
                count: transactions.length,
            },
        });
    } catch (error) {
        console.error("Transaction history error:", error);
        return NextResponse.json(
            { error: "Failed to fetch transactions" },
            { status: 500 }
        );
    }
}
