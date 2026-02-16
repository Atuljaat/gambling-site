"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/lib/store";

export default function UserBalance() {
    const { balance, fetchBalance, isLoading } = useUserStore();
    const pathname = usePathname();

    useEffect(() => {
        // Initial fetch if balance is not set
        if (balance === null) {
            fetchBalance();
        }
    }, [balance, fetchBalance]);

    // Re-fetch on navigation to ensure freshness, but since we have global state 
    // we could potentially skip this if we trust our local updates.
    // For now, keeping it ensures consistency if multiple tabs are open or external changes happen.
    useEffect(() => {
        fetchBalance();
    }, [pathname, fetchBalance]);

    // Only show loading state if we have NO data. 
    // If we have stale data, show that while fetching in bg.
    if (isLoading && balance === null) {
        return (
            <div className="h-4 w-16 bg-zinc-800 animate-pulse rounded"></div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-sm">
            <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-mono">
                BAL
            </span>
            <span className="text-white font-mono font-bold text-sm tracking-tight">
                {balance?.toLocaleString() ?? 0}
            </span>
        </div>
    );
}
