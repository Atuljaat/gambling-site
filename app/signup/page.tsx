"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await authClient.signUp.email(
            {
                email,
                password,
                name,
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
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Join</h1>
                    <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Start Your Legacy</p>
                </div>

                <form onSubmit={handleSignUp} className="flex flex-col gap-8">
                    <div className="group relative">
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-transparent border-b border-white/20 py-2 text-white outline-none focus:border-white transition-colors rounded-none placeholder:text-zinc-700"
                            placeholder="NAME"
                        />
                    </div>
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
                    <div className="group relative">
                        <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 mb-1 block">Date of Birth</label>
                        <input
                            type="date"
                            required
                            className="w-full bg-transparent border-b border-white/20 py-2 text-white outline-none focus:border-white transition-colors rounded-none placeholder:text-zinc-700 appearance-none uppercase [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                        <p className="absolute right-0 top-8 text-[10px] text-zinc-600 font-mono uppercase">18+ ONLY</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-bold uppercase tracking-widest py-4 hover:bg-zinc-200 transition-colors mt-4 disabled:opacity-50"
                    >
                        {loading ? "Loading..." : "Join"}
                    </button>
                </form>

                <div className="flex flex-col gap-4 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Or join with</p>
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
                    <Link href="/login" className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
                        Already a member? Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
