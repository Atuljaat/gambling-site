"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Flame, Play } from "lucide-react";
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

const CATEGORIES = ["All", "Originals", "Slots", "Cards", "Arcade", "Table"];

export default function GamesPage() {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredGames = GAMES_DATA.filter((game) => {
        const matchesCategory = selectedCategory === "All" || game.category === selectedCategory;
        const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const trendingGames = GAMES_DATA.filter((game) => game.trending);

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 selection:text-white pb-20">


            <div className="container mx-auto px-4 space-y-20 mt-20 relative z-20 " >

                {/* Trending Section */}
                <div>
                    <SectionHeader title="Trending Now" icon={<Flame className="w-5 h-5 text-orange-500" />} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {trendingGames.map((game, i) => (
                            <GameCard key={game.id} game={game} index={i} />
                        ))}
                    </div>
                </div>

                {/* All Games Filter Section */}
                <div id="all-games" className="pt-0">
                    <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-6 border-b border-zinc-900 pb-8">
                        <h2 className="text-3xl font-bold uppercase tracking-tighter">All Games</h2>

                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full sm:w-64 bg-zinc-900/50 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-all font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-2 mb-8">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all duration-300",
                                    selectedCategory === cat
                                        ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                                        : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-white"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    <motion.div
                        layout
                        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    >
                        {filteredGames.length > 0 ? (
                            filteredGames.map((game) => (
                                <GameCard key={game.id} game={game} index={0} compact />
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center border border-dashed border-zinc-800 rounded-2xl">
                                <p className="text-zinc-500 font-mono text-sm">No games found.</p>
                                <button
                                    onClick={() => { setSearchQuery(""); setSelectedCategory("All") }}
                                    className="mt-4 text-xs uppercase underline hover:text-white transition-colors"
                                >
                                    Clear Filters
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

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                {icon}
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-tight">{title}</h2>
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className={cn(
                "group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 cursor-pointer shadow-lg",
                wide ? "aspect-2/1 md:col-span-1" : compact ? "aspect-[3/4]" : "aspect-[3/4]"
            )}
        >
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url(${game.image})` }}
            />

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]" />

            {/* Content */}
            <Link href={`/games/${game.id}`} className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 delay-75">
                    <div className="bg-black/80 backdrop-blur text-[10px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-wider">
                        {game.category}
                    </div>
                    {game.trending && (
                        <div className="bg-orange-500/20 text-orange-400 border border-orange-500/50 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                            <Flame className="w-3 h-3" /> Hot
                        </div>
                    )}
                </div>

                <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className={cn(
                        "font-black uppercase tracking-tighter text-white mb-1 drop-shadow-lg",
                        wide ? "text-3xl" : "text-xl"
                    )}>
                        {game.title}
                    </h3>

                    <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            {game.players} Playing
                        </span>
                        <span className="text-yellow-400 font-bold">{game.multiplier}</span>
                    </div>

                    <div className="mt-4 opacity-0 h-0 group-hover:opacity-100 group-hover:h-10 transition-all duration-300 overflow-hidden">
                        <button className="w-full h-10 bg-white text-black font-bold text-xs uppercase tracking-widest rounded hover:bg-zinc-200 flex items-center justify-center gap-2">
                            <Play className="w-3 h-3 fill-black" /> Play Now
                        </button>
                    </div>
                </div>
            </Link>

            {/* Hover border effect */}
            <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/20 rounded-xl transition-colors duration-300 pointer-events-none" />
        </motion.div>
    );
}
