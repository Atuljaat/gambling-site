import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createTransaction, TransactionType, getUserBalance } from "@/lib/transactions";

export async function POST(req: NextRequest) {
    try {
        // Get authenticated user
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const currentBalance = await getUserBalance(userId);
        const TARGET_BALANCE = 5000;

        // Check if user already has 5000 or more
        if (currentBalance >= TARGET_BALANCE) {
            return NextResponse.json(
                { error: "Max balance reached. You already have 5000 or more coins." },
                { status: 400 }
            );
        }

        // Calculate amount to add
        const amountToAdd = TARGET_BALANCE - currentBalance;

        // Create deposit transaction
        const transaction = await createTransaction({
            userId,
            type: TransactionType.DEPOSIT,
            amount: amountToAdd,
            description: "Top up to 5000 coins",
        });

        return NextResponse.json({
            success: true,
            transaction,
            newBalance: TARGET_BALANCE,
        });
    } catch (error) {
        console.error("Top-up error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to process top-up" },
            { status: 500 }
        );
    }
}
