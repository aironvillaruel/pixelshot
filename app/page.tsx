"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
   const router = useRouter();
   function getStart() {
    router.push(`/layout`);
  }
   function handleDuo() {
    router.push(`/duo`);
  }
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black sm:items-start">
          <div
        className="pointer-events-none fixed inset-0 z-10 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.09) 3px, rgba(0,0,0,0.06) 4px)",
        }}
      />
            {/* Outer pixel border */}
      <div className="fixed inset-3 border-2 border-black pointer-events-none z-10" />
      <div className="fixed inset-[18px] border border-black/20 pointer-events-none z-10" />

      {/* Corner dots */}
      {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((pos) => (
        <div key={pos} className={`fixed ${pos} w-3 h-3 bg-black border-2 border-white z-20`} />
      ))}
        <div className="flex justify-center flex-col items-center w-full p-4 gap-4">

         <h1
            className="text-2xl tracking-[0.3em] font-bold"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            PIXEL<span className="text-black/40">SHOT</span>
          </h1>
          <h4   className="text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>Where Every Pixel Tells a Story</h4>
         <button
            onClick={getStart}
            // disabled={!canProceed}
            className={`w-1/2 py-4 text-sm tracking-[0.3em] border-2 transition-none
bg-black text-white border-black hover:bg-black/90 active:translate-x-1 active:translate-y-1 cursor-pointer`}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              // boxShadow: canProceed ? "4px 4px 0 #555" : "none",
            }}
          >
           SOLO
          </button>
             <button
            onClick={handleDuo}
            // disabled={!canProceed}
            className={`w-1/2 py-4 text-sm tracking-[0.3em] border-2 transition-none
bg-black text-white border-black hover:bg-black/90 active:translate-x-1 active:translate-y-1 cursor-pointer`}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              // boxShadow: canProceed ? "4px 4px 0 #555" : "none",
            }}
          >
           DUO
          </button>
        </div>
          
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
      </main>
    </div>
  );
}
