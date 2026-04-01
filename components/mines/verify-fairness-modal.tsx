"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { generateMinePositions, hashServerSecret } from "@/lib/mines/provably-fair";
import { Bomb, Gem, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifyFairnessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
  initialServerSecret?: string;
  initialClientSecret?: string;
  initialNonce?: number;
  initialMineCount?: number;
}

export function VerifyFairnessModal({
  open,
  onOpenChange,
  readOnly = false,
  initialServerSecret = "",
  initialClientSecret = "",
  initialNonce = 0,
  initialMineCount = 3,
}: VerifyFairnessModalProps) {
  const [serverSecret, setServerSecret] = useState(initialServerSecret);
  const [clientSecret, setClientSecret] = useState(initialClientSecret);
  const [nonce, setNonce] = useState(initialNonce);
  const [mineCount, setMineCount] = useState(initialMineCount);

  // Results
  const [revealedMines, setRevealedMines] = useState<number[] | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  // When props change (e.g. user opens different match row), reset the internal state
  useEffect(() => {
    if (open) {
      setServerSecret(initialServerSecret);
      setClientSecret(initialClientSecret);
      setNonce(initialNonce);
      setMineCount(initialMineCount);
      setRevealedMines(null);
      setIsRevealing(false);
    }
  }, [open, initialServerSecret, initialClientSecret, initialNonce, initialMineCount]);

  const handleReveal = () => {
    setIsRevealing(true);
    try {
      if (!serverSecret || !clientSecret || isNaN(nonce) || isNaN(mineCount) || mineCount < 1 || mineCount > 24) {
        setIsRevealing(false);
        return;
      }
      
      const positions = generateMinePositions(clientSecret, serverSecret, nonce, mineCount);
      
      // Artificial delay to make it feel like "work" is being done
      setTimeout(() => {
        setRevealedMines(positions);
        setIsRevealing(false);
      }, 400);
      
    } catch (err) {
      console.error(err);
      setIsRevealing(false);
    }
  };

  const calculatedHash = serverSecret ? hashServerSecret(serverSecret) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-black border border-white/10 text-white font-mono p-0 overflow-hidden shadow-2xl shadow-green-900/10">
        
        {/* Header Region */}
        <div className="bg-zinc-950 border-b border-white/5 px-6 py-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
          <DialogTitle className="text-xl font-bold uppercase tracking-widest text-green-500 flex items-center gap-3 relative z-10">
            <RefreshCw className="w-5 h-5" /> 
            Cryptographic Verification
          </DialogTitle>
          <DialogDescription className="text-[11px] uppercase tracking-widest text-zinc-500 mt-2 relative z-10 max-w-lg leading-relaxed">
            {readOnly 
              ? "Zero-trust verification active. The board below is generated locally in your browser to prove match integrity."
              : "Manual verification. Alter the seeds to observe deterministic changes in board generation."}
          </DialogDescription>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Left Panel: Inputs & Hash */}
          <div className="flex-1 p-6 bg-black border-r border-white/5 space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5 focus-within:text-green-500 transition-colors">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Server Seed (Hex)</label>
                <Input
                  value={serverSecret}
                  onChange={(e) => setServerSecret(e.target.value)}
                  readOnly={readOnly}
                  className="bg-zinc-950 border-white/5 text-xs text-zinc-300 focus-visible:ring-1 focus-visible:ring-green-500/50 h-10 tracking-wider shadow-inner font-mono"
                  placeholder="Insert hidden server seed..."
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">SHA-256 Hash Target</label>
                <div className="bg-zinc-950/50 border border-white/5 rounded-md p-2.5 text-[11px] text-zinc-500 tracking-wider break-all min-h-[42px] flex items-center shadow-inner font-mono">
                  {calculatedHash || "AWAITING INPUT..."}
                </div>
              </div>

              <div className="space-y-1.5 focus-within:text-green-500 transition-colors">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Client Seed</label>
                <Input
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  readOnly={readOnly}
                  className="bg-zinc-950 border-white/5 text-xs text-zinc-300 focus-visible:ring-1 focus-visible:ring-green-500/50 h-10 tracking-wider shadow-inner font-mono"
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-1.5 flex-1 focus-within:text-green-500 transition-colors">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Nonce</label>
                  <Input
                    type="number"
                    value={isNaN(nonce) ? "" : nonce}
                    onChange={(e) => setNonce(parseInt(e.target.value))}
                    readOnly={readOnly}
                    className="bg-zinc-950 border-white/5 text-xs text-zinc-300 focus-visible:ring-1 focus-visible:ring-green-500/50 h-10 tracking-wider shadow-inner font-mono"
                  />
                </div>

                <div className="space-y-1.5 flex-1 focus-within:text-green-500 transition-colors">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Mines</label>
                  <Input
                    type="number"
                    value={isNaN(mineCount) ? "" : mineCount}
                    onChange={(e) => setMineCount(parseInt(e.target.value))}
                    readOnly={readOnly}
                    className="bg-zinc-950 border-white/5 text-xs text-zinc-300 focus-visible:ring-1 focus-visible:ring-green-500/50 h-10 tracking-wider shadow-inner font-mono"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleReveal}
              disabled={!serverSecret || !clientSecret || isRevealing}
              className="w-full bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-[0.2em] disabled:opacity-30 disabled:bg-white disabled:text-black transition-all shadow-lg active:scale-[0.98] h-12 mt-2"
            >
              {isRevealing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Compute Placements"
              )}
            </Button>
          </div>

          {/* Right Panel: Visualization */}
          <div className="w-full md:w-[320px] bg-zinc-950 p-6 flex flex-col items-center justify-center relative shadow-[inset_20px_0_40px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-green-500/5 mix-blend-screen pointer-events-none"></div>
            
            <div className={cn(
              "w-full aspect-square grid grid-cols-5 gap-1.5 p-3 rounded-xl border border-white/5 relative z-10 transition-all duration-700",
              revealedMines ? "bg-black shadow-[0_0_30px_rgba(34,197,94,0.1)]" : "bg-black/50"
            )}>
              {[...Array(25)].map((_, i) => {
                const isMine = revealedMines?.includes(i);
                
                let bgColor = "bg-zinc-950 border border-white/5";
                let InnerIcon = null;

                if (revealedMines) {
                  if (isMine) {
                    bgColor = "bg-red-500/10 shadow-[inset_0_0_15px_rgba(239,68,68,0.2)] border border-red-500/30";
                    InnerIcon = <Bomb className="w-5 h-5 text-red-500/90 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />;
                  } else {
                    bgColor = "bg-zinc-900 border border-white/5";
                    InnerIcon = <Gem className="w-4 h-4 text-green-500/20" />;
                  }
                }

                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg flex items-center justify-center transition-all duration-500",
                      bgColor,
                      revealedMines && "animate-in zoom-in duration-300 fill-mode-both"
                    )}
                    style={{
                      animationDelay: revealedMines ? `${i * 10}ms` : '0ms'
                    }}
                  >
                    {InnerIcon}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 text-center">
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
                {revealedMines ? "Simulation Complete" : "Awaiting Parameters"}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
