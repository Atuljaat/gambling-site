"use server";

import { createTransaction, TransactionType } from "@/lib/transactions";
import { revalidatePath } from "next/cache";

export async function eatMoney(userId: string) {
    if (!userId) {
        throw new Error("User ID is required");
    }

    try {
        await createTransaction({
            userId,
            type: TransactionType.BET, // Using BET as it subtracts money
            amount: 1000,
            description: "Consumed by the void",
        });

        revalidatePath("/games/eat-money");
        return { success: true, message: "Yum! 1000 credits eaten." };
    } catch (error) {
        console.error("Failed to eat money:", error);
        return { success: false, message: "Failed to eat money. Maybe you are broke?" };
    }
}
