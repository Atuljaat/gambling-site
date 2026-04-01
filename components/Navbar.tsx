"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import UserBalance from "./UserBalance";

export default function Navbar() {
    const { data: session } = authClient.useSession();
    const router = useRouter();

    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
            <div className="max-w-5xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
                {/* Brand */}
                <Link
                    href="/"
                    className="text-white font-display font-black tracking-[0.2em] hover:opacity-70 transition-opacity"
                >
                    GAMBLING
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-6 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-400">
                    <Link href="/games" className="hover:text-white transition-colors">
                        games
                    </Link>
                    <Link href="/transactions" className="hover:text-white transition-colors">
                        transactions
                    </Link>
                    <Link href="/buy" className="hover:text-white transition-colors">
                        buy
                    </Link>
                    <div className="h-4 w-px bg-zinc-800 hidden sm:block"></div>
                    {!session ? (
                        <>
                            <Link href="/login" className="hover:text-white transition-colors">
                                Login
                            </Link>
                            <Link
                                href="/signup"
                                className="text-white border border-white/20 px-3 py-1 hover:bg-white hover:text-black hover:border-transparent transition-all"
                            >
                                Signup
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-4">
                            <UserBalance />
                            <span className="text-white font-mono text-xs uppercase tracking-widest">
                                {session.user?.name || "User"}
                            </span>
                            <button
                                onClick={async () => {
                                    await authClient.signOut();
                                    router.refresh();
                                }}
                                className="text-white border border-white/20 px-3 py-1 hover:bg-red-500 hover:border-red-500 transition-all text-xs font-mono uppercase tracking-widest"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
