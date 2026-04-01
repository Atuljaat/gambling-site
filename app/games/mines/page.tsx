"use client";

import { useState, useEffect, useCallback } from "react";
import { useBalance } from "@/lib/context/BalanceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Gem, RefreshCw, Flame, Bomb } from "lucide-react";
import { useUserStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { VerifyFairnessModal } from "@/components/mines/verify-fairness-modal";
// Actually, let's use a simple absolute alert or just standard UI state for errors if no toast is present

// We'll define simple types
interface GameState {
  id: string;
  status: "ACTIVE" | "CASHED_OUT" | "BUSTED";
  revealedCells: number[];
  minePositions?: number[];
  currentMultiplier: number;
  betAmount: number;
  mineCount: number;
  payout?: number | null;
  serverSecretHash: string;
}

export default function MinesGamePage() {
  const { balance, updateBalance } = useBalance();
  const { balance: globalBalance, fetchBalance } = useUserStore();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [betAmount, setBetAmount] = useState<string>("10.00");
  const [mineCount, setMineCount] = useState<string>("3");
  const [clientSecret, setClientSecret] = useState<string>("7d9f2a4b8c1e0d3f");
  const [serverSecretHash, setServerSecretHash] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Format currency
  const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

  // Fetch current game on mount
  useEffect(() => {
    const fetchCurrentGame = async () => {
      try {
        const res = await fetch("/api/mines/current");
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === "ACTIVE") {
            setGameState(data);
            setServerSecretHash(data.serverSecretHash);
          } else {
            // Fetch active unrevealed server secret hash
            const secretRes = await fetch("/api/mines/secret");
            if (secretRes.ok) {
              const secretData = await secretRes.json();
              setServerSecretHash(secretData.serverSecretHash);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load current game", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentGame();
  }, []);

  useEffect(() => {
    if (globalBalance !== null && gameState?.status !== "ACTIVE") {
      setBetAmount((prev) => {
        const currentBet = parseFloat(prev);
        if (!isNaN(currentBet) && currentBet > globalBalance) {
          return "0.00";
        }
        return prev;
      });
    }
  }, [globalBalance, gameState?.status]);

  const handleStartBet = async () => {
    if (gameState?.status === "ACTIVE") return;
    
    // Validate bet
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) return alert("Invalid bet amount");
    if (globalBalance !== null && bet > globalBalance) return alert("Bet amount exceeds balance");
    
    setLoading(true);
    try {
      const res = await fetch("/api/mines/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSecret,
          betAmount: bet,
          mineCount: parseInt(mineCount)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to start game");
      } else {
        setGameState(data);
        setServerSecretHash(data.serverSecretHash);
        updateBalance(-bet);
        fetchBalance(); // Update navbar balance
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCashout = async () => {
    if (!gameState || gameState.status !== "ACTIVE") return;

    setLoading(true);
    try {
      const res = await fetch("/api/mines/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: gameState.id })
      });
      const data = await res.json();
      if (res.ok) {
        setGameState(data);
        if (data.payout) updateBalance(data.payout);
        fetchBalance(); // Update navbar balance
      } else {
        alert(data.error || "Failed to cash out");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async (index: number) => {
    if (!gameState || gameState.status !== "ACTIVE" || loading) return;
    if (gameState.revealedCells.includes(index)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/mines/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: gameState.id, position: index })
      });
      const data = await res.json();
      
      if (res.ok) {
        setGameState(data);
        if (data.status === "CASHED_OUT" && data.payout) {
           updateBalance(data.payout);
        }
      } else {
        alert(data.error || "Failed to reveal");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const regenerateSecret = () => {
    setClientSecret(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  };

  // Derive display values
  const isActive = gameState?.status === "ACTIVE";
  const isFinished = gameState?.status === "BUSTED" || gameState?.status === "CASHED_OUT";
  const currentProfit = isFinished && gameState.payout ? gameState.payout : (isActive ? gameState.betAmount * gameState.currentMultiplier - gameState.betAmount : 0);
  const displayMultiplier = gameState ? gameState.currentMultiplier : 1.00;
  
  const handleHalfBet = () => setBetAmount(prev => (Math.max(0.01, parseFloat(prev) / 2)).toFixed(2));
  const handleDoubleBet = () => {
    setBetAmount(prev => {
      const doubled = parseFloat(prev) * 2;
      if (globalBalance !== null && doubled > globalBalance) {
        return "0.00";
      }
      return doubled.toFixed(2);
    });
  };

  const handleMaxBet = () => {
    if (globalBalance !== null) {
      setBetAmount(globalBalance > 0 ? globalBalance.toFixed(2) : "0.00");
    }
  };

  const handleBetChange = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && globalBalance !== null && num > globalBalance) {
      setBetAmount("0.00");
    } else {
      setBetAmount(val);
    }
  };

  return (
    <div className="h-screen pt-14 bg-black text-white flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar Controls */}
      <div className="w-full md:w-[320px] bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col gap-6 overflow-y-auto">

        {/* Bet Amount */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-zinc-400">
            <span>BET AMOUNT</span>
            <span className="text-green-500">MIN: 0.01</span>
          </div>
          <div className="relative flex items-center bg-zinc-900 rounded border border-zinc-800 focus-within:border-zinc-600 transition">
            <span className="pl-3 text-green-500 font-bold">$</span>
            <Input 
              type="number"
              value={betAmount}
              onChange={(e) => handleBetChange(e.target.value)}
              className="bg-transparent border-none text-white focus-visible:ring-0 font-mono text-sm shadow-none"
              disabled={isActive || loading}
            />
            <div className="flex pr-1 absolute right-1">
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2 hover:bg-zinc-800 text-zinc-300" onClick={handleHalfBet} disabled={isActive || loading}>1/2</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2 hover:bg-zinc-800 text-zinc-300" onClick={handleDoubleBet} disabled={isActive || loading}>2X</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2 hover:bg-zinc-800 text-green-500 font-bold" onClick={handleMaxBet} disabled={isActive || loading || globalBalance === null}>MAX</Button>
            </div>
          </div>
        </div>

        {/* Mines Amount */}
        <div className="space-y-2">
           <div className="flex justify-between text-xs font-bold text-zinc-400">
            <span>MINES AMOUNT</span>
            <span className="text-zinc-500">1 - 24</span>
          </div>
          <Select 
            value={mineCount} 
            onValueChange={(val) => { if (val) setMineCount(val) }} 
            disabled={isActive || loading}
          >
            <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white font-bold font-mono h-[42px]">
              <SelectValue placeholder="Select Mines" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-700 text-white font-mono">
              <SelectGroup>
                {[...Array(24)].map((_, i) => (
                  <SelectItem key={i+1} value={(i+1).toString()}>
                    {i+1} Mines
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Client Secret */}
        <div className="space-y-2">
           <div className="flex justify-between text-xs font-bold text-zinc-400">
            <span>CLIENT SEED</span>
          </div>
          <div className="relative flex items-center bg-zinc-900 rounded border border-zinc-800 focus-within:border-zinc-600 transition">
            <Input 
              type="text"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="bg-transparent border-none text-white focus-visible:ring-0 font-mono text-xs shadow-none pr-10"
              disabled={isActive || loading}
            />
            <button 
              className="absolute right-3 text-green-500 hover:text-green-400 transition"
              onClick={regenerateSecret}
              disabled={isActive || loading}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Server Seed Hash */}
        <div className="space-y-2">
           <div className="flex justify-between text-xs font-bold text-zinc-400">
            <span>SERVER SEED HASH</span>
          </div>
          <div className="bg-zinc-900 rounded border border-zinc-800 px-3 py-2 text-xs font-mono text-zinc-400 break-all select-all flex items-center min-h-[42px]">
             {serverSecretHash || "Loading..."}
          </div>
        </div>

        <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">
           The board is generated from your client seed + our hidden server seed + a nonce. You can verify your game in match history after it ends.
        </p>

        {/* Bet/Cashout Button */}
        {isActive ? (
          <Button 
            className="w-full h-14 bg-green-500 hover:bg-green-400 text-black font-black text-xl hover:scale-[1.02] transition-transform uppercase tracking-wider"
            onClick={handleCashout}
            disabled={loading || gameState.revealedCells.length === 0}
          >
            CASHOUT
          </Button>
        ) : (
          <Button 
             className={cn(
               "w-full h-14 font-black text-xl transition-transform uppercase tracking-wider",
               (globalBalance !== null && globalBalance <= 0) || loading
                 ? "bg-zinc-800 text-zinc-500 cursor-not-allowed hover:bg-zinc-800"
                 : "bg-green-500 hover:bg-green-400 text-black hover:scale-[1.02]"
             )}
            onClick={handleStartBet}
            disabled={loading || (globalBalance !== null && globalBalance <= 0)}
          >
            BET
          </Button>
        )}

        {/* Next Tile Info */}
        <div className="flex gap-4">
           <div className="flex-1 bg-zinc-900 rounded border border-zinc-800 p-3">
             <div className="text-[10px] text-zinc-500 font-bold mb-1">WIN MULTIPLIER</div>
             <div className="text-white font-bold text-sm font-mono">{displayMultiplier.toFixed(2)}x</div>
           </div>
           <div className="flex-1 bg-zinc-900 rounded border border-zinc-800 p-3">
             <div className="text-[10px] text-zinc-500 font-bold mb-1">NEXT TILE</div>
             <div className="text-green-500 font-bold text-sm font-mono">
                {isActive ? (displayMultiplier * 1.25).toFixed(2) : "0.00"}x
             </div>
           </div>
        </div>

      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[url('/bg-pattern.svg')] bg-repeat relative overflow-y-auto">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #22c55e 0%, transparent 70%)' }} />
        
        {/* Top Info Header */}
        <div className="w-full max-w-[600px] flex justify-between items-end mb-8 z-10 px-4 md:px-0">
          <div>
             <div className="text-green-500 text-xs font-black uppercase tracking-widest mb-1">Current Profit</div>
             <div className="text-4xl font-black font-mono">
               {currentProfit >= 0 ? `$${currentProfit.toFixed(2)}` : `-$${(-currentProfit).toFixed(2)}`}
             </div>
          </div>
          <div className="text-right">
             <div className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">Multiplier</div>
             <div className="text-4xl font-black text-green-500 font-mono">{displayMultiplier.toFixed(2)}x</div>
          </div>
        </div>

        {/* Grid Board */}
        <div className="grid grid-cols-5 gap-2 md:gap-3 z-10 p-4 md:p-6 bg-black/20 rounded-2xl backdrop-blur-sm border border-white/5 shadow-2xl">
          {[...Array(25)].map((_, i) => {
            const isRevealed = gameState?.revealedCells?.includes(i);
            const isMine = gameState?.minePositions?.includes(i);
            const isFinishedTileMine = isFinished && isMine;
            const isFinishedTileSafe = isFinished && !isMine && !isRevealed;

            let bgColor = "bg-zinc-900 hover:bg-zinc-800";
            let InnerIcon = null;

            if (isRevealed && isMine) {
              bgColor = "bg-red-500/10 shadow-[inset_0_0_15px_rgba(239,68,68,0.2)] border-red-500/50";
              InnerIcon = <Bomb className="w-6 h-6 md:w-8 md:h-8 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />;
            } else if (isRevealed) {
              bgColor = "bg-green-500/10 shadow-[inset_0_0_15px_rgba(34,197,94,0.1)] border-green-500/30";
              InnerIcon = <Gem className="w-6 h-6 md:w-8 md:h-8 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />;
            } else if (isFinishedTileMine) {
              bgColor = "bg-red-500/10 border-red-500/30";
              InnerIcon = <Bomb className="w-6 h-6 md:w-8 md:h-8 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />;
            } else if (isFinishedTileSafe) {
              bgColor = "bg-zinc-900 opacity-40";
              InnerIcon = <Gem className="w-6 h-6 md:w-8 md:h-8 text-green-500/40" />;
            } else if (isActive) {
              bgColor = "bg-zinc-800/50 cursor-pointer hover:bg-zinc-700/50 hover:-translate-y-1";
            } else {
              // Idle state
              bgColor = "bg-zinc-900 border border-zinc-800";
            }

            return (
              <button
                key={i}
                disabled={!isActive || isRevealed || loading}
                onClick={() => handleReveal(i)}
                className={cn(
                  "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center transition-all duration-200 border border-transparent shadow-lg",
                  bgColor,
                  isRevealed && "animate-in zoom-in duration-300"
                )}
                style={{
                  boxShadow: isRevealed ? 'inset 0 2px 10px rgba(0,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.05)'
                }}
              >
                {InnerIcon}
              </button>
            )
          })}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-zinc-500 text-sm font-medium flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
           <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[10px]">i</div>
           <span>Select tiles to reveal gems. Avoid the hidden mines!</span>
        </div>

        {/* History & Verify Buttons (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-50 flex gap-2">
          <button 
            onClick={() => setShowVerifyModal(true)}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold px-4 py-2 rounded-full transition shadow-lg flex items-center gap-2"
          >
            Verify Liquidity
          </button>
          <a 
            href="/games/mines/history" 
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold px-4 py-2 rounded-full transition shadow-lg flex items-center gap-2"
          >
            Match History
          </a>
        </div>

        <VerifyFairnessModal
          open={showVerifyModal}
          onOpenChange={setShowVerifyModal}
          readOnly={false}
        />
      </div>
    </div>
  );
}
