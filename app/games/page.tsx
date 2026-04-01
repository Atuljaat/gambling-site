"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Flame, Play, Grid3x3 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Dummy Data
const GAMES_DATA = [
    {
        id: "mines",
        title: "Mines",
        category: "Originals",
        image: "https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=2000&auto=format&fit=crop",
        trending: true,
        players: 1337,
        multiplier: "1.00x",
    },
    {
        id: "eat-money",
        title: "I Just Want To Eat Your Money",
        category: "Originals",
        image: "https://images.unsplash.com/photo-1621504450162-113651318254?q=80&w=2070&auto=format&fit=crop",
        trending: true,
        players: 666,
        multiplier: "-1000",
    },
];

const CATEGORIES = ["ALL", "ORIGINALS", "SLOTS", "CARDS", "ARCADE", "TABLE"];

export default function GamesPage() {
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Vercel Best Practice: rerender-memo - Extract expensive work into memo
    const filteredGames = useMemo(() => {
        return GAMES_DATA.filter((game) => {
            const matchesCategory = selectedCategory === "ALL" || game.category.toUpperCase() === selectedCategory;
            const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [selectedCategory, searchQuery]);

    const trendingGames = useMemo(() => GAMES_DATA.filter((game) => game.trending), []);

    return (
        <div className="min-h-screen bg-black text-white font-mono selection:bg-green-500/30 selection:text-green-50   pt-28 pb-20 relative overflow-hidden text-sm">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-10 mix-blend-screen pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6 space-y-24 relative z-20" >
                
                {/* Header Sequence */}
                <div className="w-full border-b border-white/10 pb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-600">
                            CASINO LOBBY
                        </h1>
                        <p className="text-zinc-500 uppercase tracking-[0.2em] text-xs mt-4">
                            Select your probability engine
                        </p>
                    </div>
                </div>

                {/* Trending Section */}
                <div className="space-y-8">
                    <SectionHeader title="Trending Operations" icon={<Flame className="w-4 h-4 text-green-500" />} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trendingGames.map((game, i) => (
                            <GameCard key={game.id} game={game} index={i} wide />
                        ))}
                    </div>
                </div>

                {/* All Games Filter Section */}
                <div id="all-games" className="pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 border-b border-zinc-900 pb-10">
                        <SectionHeader title="Global Index" icon={<Grid3x3 className="w-4 h-4 text-zinc-400" />} />

                        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
                            <div className="relative group w-full sm:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-green-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="QUERY GAMES..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-zinc-950/50 border border-white/10 rounded-sm py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-green-500/50 focus:bg-black transition-all shadow-inner placeholder:text-zinc-700"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Categories (Pills -> Industrial tabs) */}
                    <div className="flex flex-wrap gap-2 mb-10">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-300 rounded-sm",
                                    selectedCategory === cat
                                        ? "bg-green-500 text-black border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] relative"
                                        : "bg-black text-zinc-500 border-white/10 hover:border-white/30 hover:text-white"
                                )}
                            >
                                {cat}
                                {selectedCategory === cat && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-black border border-green-500 rounded-full animate-ping"></span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    <motion.div
                        layout
                        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    >
                        {filteredGames.length > 0 ? (
                            filteredGames.map((game, i) => (
                                <GameCard key={game.id} game={game} index={i} compact />
                            ))
                        ) : (
                            <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-800 bg-zinc-950/30">
                                <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">ERR: 404 - DATASET NOT FOUND</p>
                                <button
                                    onClick={() => { setSearchQuery(""); setSelectedCategory("ALL") }}
                                    className="mt-6 px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors rounded-sm"
                                >
                                    RESET PARAMETERS
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>

            </div>
        </div>
    );
}

// Subcomponents

// Vercel Best Practice: rendering-hoist-jsx - Extracted headers/subcomponents
function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4">
            <div className="p-2 border border-white/10 bg-black shadow-inner">
                {icon}
            </div>
            <h2 className="text-xl font-bold uppercase tracking-[0.15em] text-white">{title}</h2>
        </div>
    );
}

function GameCard({
    game,
    index,
    wide = false,
    compact = false
}: {
    game: typeof GAMES_DATA[0];
    index: number;
    wide?: boolean;
    compact?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            whileHover={{ y: -8 }}
            className={cn(
                "group relative overflow-hidden border border-zinc-800 bg-black cursor-pointer transition-all duration-500 rounded-sm hover:border-green-500/50 hover:shadow-[0_10px_30px_rgba(34,197,94,0.1)]",
                wide ? "aspect-[2/1] md:col-span-1" : compact ? "aspect-[3/4]" : "aspect-[3/4]"
            )}
        >
            {/* Background Image with stark monochrome filter base, revealing color on hover */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0 opacity-40 group-hover:opacity-100 mix-blend-luminosity group-hover:mix-blend-normal"
                style={{ backgroundImage: `url(${game.image})` }}
            />

            {/* Brutalist Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity" />

            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

            {/* Content Pipeline */}
            <Link href={`/games/${game.id}`} className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                    <div className="bg-black text-[9px] font-black px-2 py-1 border border-white/20 uppercase tracking-widest text-zinc-300">
                        {game.category}
                    </div>
                </div>

                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className={cn(
                        "font-black uppercase tracking-tighter text-white mb-2 leading-none",
                        wide ? "text-2xl" : "text-lg"
                    )}>
                        {game.title}
                    </h3>

                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-t border-white/10 pt-3">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 relative">
                                <span className="absolute inset-0 bg-green-500 animate-ping opacity-75"></span>
                            </span>
                            {game.players} USERS
                        </span>
                        <span className="text-zinc-300">{game.multiplier}</span>
                    </div>

                    <div className="mt-4 opacity-0 h-0 group-hover:opacity-100 group-hover:h-9 transition-all duration-300 overflow-hidden">
                        <button className="w-full h-9 bg-green-500 text-black font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white flex items-center justify-center gap-2 transition-colors">
                            <Play className="w-3 h-3 fill-black" /> INITIATE
                        </button>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
