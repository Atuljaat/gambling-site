"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await authClient.signIn.email(
            {
                email,
                password,
            },
            {
                onSuccess: () => {
                    router.push("/");
                },
                onError: (ctx) => {
                    alert(ctx.error.message);
                    setLoading(false);
                },
            }
        );
    };

    const handleSocialSignIn = async (provider: "google" | "discord") => {
        await authClient.signIn.social({
            provider,
            callbackURL: "/",
        });
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm flex flex-col gap-12">
                <div className="text-center">
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Login</h1>
                    <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Welcome Back</p>
                </div>

                <form onSubmit={handleSignIn} className="flex flex-col gap-8">
                    <div className="group relative">
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-transparent border-b border-white/20 py-2 text-white outline-none focus:border-white transition-colors rounded-none placeholder:text-zinc-700"
                            placeholder="EMAIL"
                        />
                    </div>
                    <div className="group relative">
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-transparent border-b border-white/20 py-2 text-white outline-none focus:border-white transition-colors rounded-none placeholder:text-zinc-700"
                            placeholder="PASSWORD"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-bold uppercase tracking-widest py-4 hover:bg-zinc-200 transition-colors mt-4 disabled:opacity-50"
                    >
                        {loading ? "Loading..." : "Enter"}
                    </button>
                </form>

                <div className="flex flex-col gap-4 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Or continue with</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => handleSocialSignIn("google")}
                            className="border border-white/20 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black hover:border-transparent transition-all"
                        >
                            Google
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSocialSignIn("discord")}
                            className="border border-white/20 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black hover:border-transparent transition-all"
                        >
                            Discord
                        </button>
                    </div>
                </div>

                <div className="text-center">
                    <Link href="/signup" className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
                        Don&apos;t have an account? Join
                    </Link>
                </div>
            </div>
        </div>
    );
}
