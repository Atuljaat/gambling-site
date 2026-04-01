"use client";

import { useEffect, useState } from "react";
import { GameResponse } from "@/lib/mines/types";
import { Button } from "@/components/ui/button";
import { Bomb, Gem, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerifyFairnessModal } from "@/components/mines/verify-fairness-modal";
export default function MinesHistoryPage() {
  const [games, setGames] = useState<GameResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  
  // Track which game to verify in the modal
  const [verifyModalData, setVerifyModalData] = useState<GameResponse | null>(null);
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mines/history?limit=100");
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRevealSeed = async () => {
    if (revealing) return;
    setRevealing(true);
    try {
      const res = await fetch("/api/mines/secret", {
        method: "POST",
      });
      if (res.ok) {
        // Successful reveal generates a new secret and marks previous as revealed.
        // Refresh history so previous games load their revealed seed.
        await fetchHistory();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to reveal seed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRevealing(false);
    }
  };

  if (loading && games.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white pt-24 px-4 flex justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 pb-12 font-mono selection:bg-white selection:text-black">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex justify-between items-end border-b border-zinc-900 pb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black font-display uppercase tracking-[0.2em] mb-2">
              Mines History
            </h1>
            <p className="text-zinc-500 font-display text-[10px] uppercase tracking-widest">
              Review and verify your past games
            </p>
          </div>
          <a href="/games/mines" className="text-[10px] font-black font-display uppercase tracking-widest text-green-500 hover:text-green-400 transition underline underline-offset-4">
            Back to Game
          </a>
        </header>

        <div className="space-y-6">
          {games.length === 0 ? (
            <div className="text-center text-zinc-500 py-12 border border-zinc-900 rounded bg-zinc-950/20">
              No completed games found.
            </div>
          ) : (
            games.map((game) => {
              const profit = game.payout ? game.payout - game.betAmount : -game.betAmount;
              const isWin = profit > 0;
              return (
                <div key={game.id} className="border border-zinc-900 bg-zinc-950/20 rounded-lg overflow-hidden">
                  {/* Header Row */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-zinc-900/40 gap-4">
                    <div className="flex items-center gap-4">
                      {isWin ? (
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                          <Gem className="w-5 h-5 text-green-500" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                          <Bomb className="w-5 h-5 text-red-500" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-zinc-500 mb-1">
                          {new Date(game.createdAt).toLocaleString()}
                        </div>
                        <div className="flex gap-3 text-sm font-bold">
                          <span className="text-zinc-300">BET: ${game.betAmount.toFixed(2)}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-300">MINES: {game.mineCount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-zinc-500 mb-1 uppercase">Profit</div>
                      <div className={cn("text-lg font-bold font-mono", isWin ? "text-green-500" : "text-zinc-500")}>
                        {isWin ? "+" : ""}{profit.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Provably Fair Details */}
                  <div className="p-4 border-t border-zinc-900/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-black/20">
                    <div className="text-xs text-zinc-500">
                      Hash: <span className="font-mono">{game.serverSecretHash.substring(0, 16)}...</span>
                    </div>
                    {game.serverSecret ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 text-[10px] font-display font-black uppercase tracking-widest border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-none"
                        onClick={() => setVerifyModalData(game)}
                      >
                        Verify Hash
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs whitespace-nowrap"
                        onClick={handleRevealSeed}
                        disabled={revealing || game.status === "ACTIVE"}
                      >
                        {revealing ? <RefreshCw className="w-3 h-3 animate-spin mr-2" /> : null}
                        Reveal Server Seed
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <VerifyFairnessModal
        open={!!verifyModalData}
        onOpenChange={(open) => !open && setVerifyModalData(null)}
        readOnly={false}
        initialServerSecret={verifyModalData?.serverSecret || ""}
        initialClientSecret={verifyModalData?.clientSecret || ""}
        initialNonce={verifyModalData?.ounce || 0}
        initialMineCount={verifyModalData?.mineCount || 3}
      />
    </div>
  );
}
