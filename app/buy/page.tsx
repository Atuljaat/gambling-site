"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useUserStore } from "@/lib/store";

export default function BuyPage() {
    const { data: session, isPending: isAuthLoading } = authClient.useSession();
    const router = useRouter();
    const { balance, setBalance, fetchBalance, isLoading } = useUserStore();

    // Local processing state for the top-up action
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const TARGET_BALANCE = 5000;

    useEffect(() => {
        if (session) {
            // If store has no balance and not currently fetching, fetch it
            if (balance === null && !isLoading) {
                fetchBalance();
            }
        } else if (!isAuthLoading && !session) {
            // If auth is done loading and no session, redirect
            router.push("/login");
        }
    }, [session, isAuthLoading, router, balance, isLoading, fetchBalance]);

    const handleTopup = async () => {
        if (!session) return;

        setProcessing(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch("/api/topup", {
                method: "POST",
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error && data.error.includes("Max balance")) {
                    setBalance(TARGET_BALANCE);
                }
                throw new Error(data.error || "Failed to top up");
            }

            setSuccess("Successfully topped up to 5000 coins!");

            // INSTANT UPDATE: Update global store immediately
            if (data.newBalance !== undefined) {
                setBalance(data.newBalance);
            } else {
                setBalance(TARGET_BALANCE);
            }

            router.refresh();
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setProcessing(false);
        }
    };

    // Show loading spinner if:
    // 1. Auth is still loading
    // 2. We are logged in (implied by passing auth check/redirect) but fetching balance
    if (isAuthLoading || (session && isLoading && balance === null)) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-zinc-800 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    // Calculate if max balance is reached
    const isMaxBalance = balance !== null && balance >= TARGET_BALANCE;
    const amountToReceive = balance !== null ? Math.max(0, TARGET_BALANCE - balance) : TARGET_BALANCE;

    return (
        <div className="min-h-screen bg-black text-white pt-24 px-4 pb-12 selection:bg-white selection:text-black font-sans">
            <div className="max-w-2xl mx-auto">
                <header className="mb-12 border-l-4 border-white pl-6 animate-in fade-in slide-in-from-left-4 duration-700">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-2">
                        Get Coins
                    </h1>
                    <p className="text-zinc-500 font-mono uppercase tracking-widest text-xs md:text-sm">
                        Top up your balance instantly
                    </p>
                </header>

                <div className="relative group perspective-1000">
                    {/* Decorative background element */}
                    <div className="absolute -inset-0.5 bg-linear-to-r from-zinc-800 to-zinc-900 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>

                    <div className="relative bg-black border border-zinc-800 p-8 md:p-12 transition-all duration-300 hover:border-zinc-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                            <div>
                                <div className="inline-block px-3 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-widest mb-4">
                                    Starter Plan
                                </div>
                                <h2 className="text-3xl md:text-5xl font-mono font-bold tracking-tight">
                                    5,000 COINS
                                </h2>
                            </div>
                            <div className="text-right">
                                <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-1">Price</div>
                                <div className="text-2xl font-bold tracking-tighter">FREE</div>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8 font-mono text-sm">
                            <div className="flex justify-between items-center py-3 border-b border-zinc-900 group-hover:border-zinc-800 transition-colors">
                                <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Current Balance</span>
                                <span className="text-zinc-300">{balance?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-zinc-900 group-hover:border-zinc-800 transition-colors">
                                <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Target Balance</span>
                                <span className="text-zinc-300">5,000</span>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b border-white/20">
                                <span className="text-white uppercase tracking-wider text-[10px] font-bold">Receive Amount</span>
                                <span className="text-xl text-green-400 font-bold">+{amountToReceive.toLocaleString()}</span>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-950/20 border border-red-900/50 text-red-500 text-xs font-mono uppercase tracking-wide">
                                ERROR: {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-6 p-4 bg-green-950/20 border border-green-900/50 text-green-500 text-xs font-mono uppercase tracking-wide">
                                SUCCESS: {success}
                            </div>
                        )}

                        <button
                            onClick={handleTopup}
                            disabled={isMaxBalance || processing}
                            className={`w-full py-4 text-center font-bold uppercase tracking-widest transition-all duration-300 transform border
                ${isMaxBalance
                                    ? "bg-zinc-950 text-zinc-600 cursor-not-allowed border-zinc-800 opacity-50"
                                    : processing
                                        ? "bg-zinc-900 text-zinc-400 cursor-wait border-zinc-700 animate-pulse"
                                        : "bg-white text-black border-white hover:bg-zinc-200 hover:scale-[1.01] active:scale-[0.99] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                }
              `}
                        >
                            {processing ? (
                                "Processing..."
                            ) : isMaxBalance ? (
                                "Max Limit Reached"
                            ) : (
                                "Claim 5,000 Coins"
                            )}
                        </button>

                        <div className="mt-8 pt-4 border-t border-zinc-900 flex justify-between text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                            <span>ID: {session?.user?.id?.slice(0, 8) || "ANON"}</span>
                            <span>SECURE_CONNECTION</span>
                        </div>
                    </div>
                </div>

                {/* Simple grid stats */}
                <div className="mt-8 grid grid-cols-2 gap-4 opacity-50">
                    <div className="border border-zinc-800 p-4 text-center">
                        <div className="text-zinc-600 text-[10px] uppercase font-mono mb-1">Status</div>
                        <div className="text-white text-xs font-bold uppercase tracking-widest">Active</div>
                    </div>
                    <div className="border border-zinc-800 p-4 text-center">
                        <div className="text-zinc-600 text-[10px] uppercase font-mono mb-1">Region</div>
                        <div className="text-white text-xs font-bold uppercase tracking-widest">Global</div>
                    </div>
                </div>

            </div>
        </div>
    );
}
