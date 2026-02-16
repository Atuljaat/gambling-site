"use client";

import { useState } from "react";
import { eatMoney } from "./actions";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useUserStore } from "@/lib/store";

export default function EatMoneyGame() {
    const { data: session, isPending: isSessionLoading } = authClient.useSession();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const { fetchBalance } = useUserStore();

    const handleEatMoney = async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        setMessage("");

        try {
            const result = await eatMoney(session.user.id);
            setMessage(result.message);
            if (result.success) {
                await fetchBalance(); // Update global store immediately
            }
        } catch (error) {
            console.error(error);
            setMessage("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    if (isSessionLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4 font-mono">
                <h1 className="text-xl font-bold uppercase tracking-widest text-red-600">Restricted Area</h1>
                <p className="text-zinc-500 text-xs">Auth required.</p>
                <Link href="/login" className="px-4 py-2 border border-white text-white text-xs hover:bg-white hover:text-black transition-colors uppercase tracking-widest">
                    Login
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono relative">
            <Link href="/games" className="absolute top-8 left-8 text-zinc-600 hover:text-white transition-colors text-xs uppercase tracking-widest">
                ← Exit
            </Link>

            <div className="max-w-md w-full p-8 border border-zinc-900 flex flex-col items-center space-y-12">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold uppercase tracking-tighter">
                        Eat Money
                    </h1>
                    <p className="text-zinc-600 text-xs uppercase tracking-widest">
                        Cost: 1000 Credits
                    </p>
                </div>

                <div className="space-y-4 w-full flex flex-col items-center">
                    <p className="text-red-500 text-[10px] uppercase tracking-widest animate-pulse font-bold">
                        ⚠ Warning: Do not click logic
                    </p>

                    <button
                        onClick={handleEatMoney}
                        disabled={loading}
                        className="w-full py-4 border border-white text-white hover:bg-white hover:text-black transition-colors uppercase tracking-widest text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "PROCESSING..." : "DO NOT CLICK"}
                    </button>

                    <p className="text-zinc-700 text-[10px] uppercase tracking-widest text-center">
                        Seriously, it just deletes your money.
                    </p>
                </div>

                {message && (
                    <div className="text-center pt-4 border-t border-zinc-900 w-full">
                        <p className="text-xs text-zinc-400 uppercase tracking-widest">
                            {message}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
