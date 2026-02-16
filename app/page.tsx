import Link from "next/link";

export default function Home() {
  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans flex flex-col justify-between p-4 sm:p-8">
      {/* Header / Brand */}
      <header className="flex justify-between items-start uppercase tracking-tighter text-xs sm:text-sm font-mono opacity-50">
        <div>
          <p>EST. 2025</p>
          <p>PROVABLY FAIR</p>
        </div>
        <div className="text-right">
          <p>NO LIMITS</p>
          <p>PURE CHANCE</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="grow flex flex-col justify-center items-center text-center z-10 w-full max-w-5xl mx-auto">
        <h1 className="text-[15vw] leading-[0.85] font-black uppercase tracking-tighter mix-blend-difference hover:tracking-wide transition-[letter-spacing] duration-700 ease-out cursor-default select-none">
          CASINO
          <br />
          <span className="outline-text text-transparent opacity-50 hover:opacity-100 transition-opacity duration-500">
            ROYALE
          </span>
        </h1>

        <p className="mt-8 max-w-md text-sm sm:text-base font-mono uppercase tracking-widest opacity-70">
          The house doesn&apos;t always have to win.
          <br />
          <span className="opacity-50 text-xs">Dare to defy the odds.</span>
        </p>

        <div className="mt-16 sm:mt-24 group">
          <Link
            href="/games"
            className="relative inline-block px-12 py-4 text-xl font-bold uppercase tracking-widest border border-white/20 hover:bg-white hover:text-black hover:border-transparent transition-all duration-300 ease-out group-hover:scale-105"
          >
            Enter The Pit
          </Link>
          <p className="mt-4 text-[10px] text-zinc-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Play Responsibly
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] sm:text-xs uppercase tracking-widest font-mono text-zinc-500 border-t border-zinc-900 pt-4">
        <div>
          <h3 className="text-zinc-300 mb-2">Games</h3>
          <ul className="space-y-1">
            <li className="hover:text-white cursor-pointer transition-colors">Poker</li>
            <li className="hover:text-white cursor-pointer transition-colors">Blackjack</li>
            <li className="hover:text-white cursor-pointer transition-colors">Slots</li>
          </ul>
        </div>
        <div>
          <h3 className="text-zinc-300 mb-2">Legal</h3>
          <ul className="space-y-1">
            <li className="hover:text-white cursor-pointer transition-colors">Terms</li>
            <li className="hover:text-white cursor-pointer transition-colors">Privacy</li>
            <li className="hover:text-white cursor-pointer transition-colors">Fairness</li>
          </ul>
        </div>
        <div className="col-span-2 sm:col-span-1 sm:col-start-4 text-right">
          <p>© {year} ALL RIGHTS RESERVED.</p>
          <p className="mt-1">CRYPTOCURRENCY ONLY.</p>
        </div>
      </footer>
    </div>
  );
}
