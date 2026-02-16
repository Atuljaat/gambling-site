import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createTransaction, TransactionType } from "@/lib/transactions";

export async function POST(req: NextRequest) {
    try {
        // Get authenticated user
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { amount, description } = await req.json();

        // Validate amount
        if (!amount || typeof amount !== "number" || amount <= 0) {
            return NextResponse.json(
                { error: "Invalid amount" },
                { status: 400 }
            );
        }

        // Create withdrawal transaction (will check balance automatically)
        const transaction = await createTransaction({
            userId: session.user.id,
            type: TransactionType.WITHDRAWAL,
            amount,
            description: description || "Withdrawal",
        });

        return NextResponse.json({
            success: true,
            transaction,
        });
    } catch (error) {
        console.error("Withdrawal error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to process withdrawal" },
            { status: 500 }
        );
    }
}
