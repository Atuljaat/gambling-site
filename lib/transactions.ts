import { prisma as db } from "./db";

/**
 * Transaction types for the gambling application
 */
export enum TransactionType {
    DEPOSIT = "deposit",
    WITHDRAWAL = "withdrawal",
    BET = "bet",
    WIN = "win",
}

/**
 * Create a new transaction and update user balance
 */
export async function createTransaction({
    userId,
    type,
    amount,
    description,
}: {
    userId: string;
    type: TransactionType;
    amount: number;
    description?: string;
}) {
    // Validate amount
    if (amount <= 0) {
        throw new Error("Transaction amount must be positive");
    }

    // Calculate balance change based on transaction type
    const balanceChange =
        type === TransactionType.DEPOSIT || type === TransactionType.WIN
            ? amount
            : -amount;

    // Get current user balance
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { balance: true },
    });

    if (!user) {
        throw new Error("User not found");
    }

    // Check if user has sufficient balance for withdrawals and bets
    if (
        (type === TransactionType.WITHDRAWAL || type === TransactionType.BET) &&
        user.balance < amount
    ) {
        throw new Error("Insufficient balance");
    }

    // Create transaction and update balance in a transaction
    const result = await db.$transaction([
        db.transaction.create({
            data: {
                userId,
                type,
                amount,
                description,
            },
        }),
        db.user.update({
            where: { id: userId },
            data: {
                balance: {
                    increment: balanceChange,
                },
            },
        }),
    ]);

    return result[0]; // Return the transaction record
}

/**
 * Get user's transaction history
 */
export async function getUserTransactions(
    userId: string,
    {
        limit = 50,
        offset = 0,
        type,
    }: {
        limit?: number;
        offset?: number;
        type?: TransactionType;
    } = {}
) {
    return await db.transaction.findMany({
        where: {
            userId,
            ...(type && { type }),
        },
        orderBy: {
            createdAt: "desc",
        },
        take: limit,
        skip: offset,
    });
}

/**
 * Get user's current balance
 */
export async function getUserBalance(userId: string) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { balance: true },
    });

    return user?.balance ?? 0;
}

/**
 * Get transaction statistics for a user
 */
export async function getUserTransactionStats(userId: string) {
    const transactions = await db.transaction.findMany({
        where: { userId },
        select: {
            type: true,
            amount: true,
        },
    });

    const stats = {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalBets: 0,
        totalWins: 0,
        transactionCount: transactions.length,
    };

    transactions.forEach((tx: { type: string; amount: number }) => {
        switch (tx.type) {
            case TransactionType.DEPOSIT:
                stats.totalDeposits += tx.amount;
                break;
            case TransactionType.WITHDRAWAL:
                stats.totalWithdrawals += tx.amount;
                break;
            case TransactionType.BET:
                stats.totalBets += tx.amount;
                break;
            case TransactionType.WIN:
                stats.totalWins += tx.amount;
                break;
        }
    });

    return stats;
}
