"use client";

import { useState } from "react";
  import { useRouter } from "next/navigation";

const SHOT_OPTIONS = [1, 3, 5];
const ORIENTATION_OPTIONS = ["landscape", "portrait"] as const;
type Orientation = (typeof ORIENTATION_OPTIONS)[number];

export default function SetupPage() {
  const router = useRouter();
  const [shots, setShots] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<Orientation | null>(null);

  const canProceed = shots !== null && orientation !== null;

  function handleNext() {
    if (!canProceed) return;
    const params = new URLSearchParams({
      shots: String(shots),
      orientation: orientation!,
    });
    router.push(`/layout/session?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Scanline overlay */}
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

      <div className="relative z-20 w-full max-w-lg flex flex-col items-center gap-10">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <PixelCamera />
          <h1
            className="text-2xl tracking-[0.3em] font-bold"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            PIXEL<span className="text-black/40">SHOT</span>
          </h1>
          <p
            className="text-[8px] tracking-[0.25em] text-black/40"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            // PHOTOBOOTH v1.0 //
          </p>
        </div>

        {/* Dashed divider */}
        <PixelDivider />

        {/* Shots selector */}
        <section className="w-full flex flex-col gap-3 items-center">
          <Label text="[ NUMBER OF SHOTS ]"/>
          <div className="flex gap-3 flex-wrap">
            {SHOT_OPTIONS.map((n) => (
              <PixelButton
                key={n}
                active={shots === n}
                onClick={() => setShots(n)}
              >
                {n} {n === 1 ? "SHOT" : "SHOTS"}
              </PixelButton>
            ))}
          </div>
        </section>

        {/* Orientation selector */}
        <section className="w-full flex flex-col gap-3 items-center">
          <Label text="[ ORIENTATION ]" />
          <div className="flex gap-3 flex-wrap">
            {ORIENTATION_OPTIONS.map((o) => (
              <PixelOrientButton
                key={o}
                active={orientation === o}
                onClick={() => setOrientation(o)}
                type={o}
              />
            ))}
          </div>
        </section>

        {/* Frame preview */}
        <section className="w-full flex flex-col gap-3 items-center">
          <Label text="[ PREVIEW ]" />
      <div
  className="w-full border-2 border-black/20 bg-black/5 min-h-20 flex items-center justify-center p-2 gap-3"
  style={{
    flexDirection: orientation === "portrait" ? "column" : "row",
    flexWrap: orientation === "landscape" ? "wrap" : "nowrap",
  }}
>
  {shots && orientation ? (
    Array.from({ length: shots }).map((_, i) => (
      <FramePreview key={i} index={i + 1} orientation={orientation} />
    ))
  ) : (
    <BlinkText text="SELECT OPTIONS ABOVE..." />
  )}
</div>
        </section>

        {/* Status + Next */}
        <div className="flex flex-col items-center gap-3 w-full">
          {canProceed && (
            <p
              className="text-[8px] text-black/50 tracking-widest"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              {shots} SHOT{shots! > 1 ? "S" : ""} · {orientation!.toUpperCase()}
            </p>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`w-full py-2 text-sm tracking-[0.3em] border-2 transition-none
              ${canProceed
                ? "bg-black text-white border-black hover:bg-black/90 active:translate-x-1 active:translate-y-1 cursor-pointer"
                : "bg-transparent text-black/20 border-black/20 cursor-not-allowed"
              }`}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              boxShadow: canProceed ? "4px 4px 0 #555" : "none",
            }}
          >
            NEXT &gt;&gt;
          </button>
        </div>

        {/* <p
          className="text-[7px] tracking-[0.2em] text-white/20"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          — INSERT COIN TO BEGIN —
        </p> */}
      </div>

      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
    </main>
  );
}

/* ── Sub-components ── */

function PixelCamera() {
  const pixels = [
    0,1,1,1,1,1,0,
    1,1,0,0,0,1,1,
    1,0,1,1,1,0,1,
    1,0,1,1,1,0,1,
    0,1,1,1,1,1,0,
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 10px)", gap: "2px" }}>
      {pixels.map((v, i) => (
        <div key={i} style={{ width: 10, height: 10, background: v ? "#000" : "transparent" }} />
      ))}
    </div>
  );
}

function PixelDivider() {
  return (
    <div
      className="w-full h-[3px]"
      style={{
        backgroundImage: "repeating-linear-gradient(90deg, #fff 0, #fff 8px, #000 8px, #000 12px)",
      }}
    />
  );
}

function Label({ text }: { text: string }) {
  return (
    <p
      className="text-[8px] tracking-[0.2em] text-black/50"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      {text}
    </p>
  );
}

function PixelButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 text-[9px] tracking-widest border-2 transition-none cursor-pointer
        ${active
          ? "bg-black text-white border-black"
          : "bg-white text-black/50 border-black/30 hover:border-black/70 hover:text-black"
        }`}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        boxShadow: active ? "3px 3px 0 #888" : "2px 2px 0 #333",
      }}
    >
      {children}
    </button>
  );
}

function PixelOrientButton({
  active,
  onClick,
  type,
}: {
  active: boolean;
  onClick: () => void;
  type: Orientation;
}) {
  const isLand = type === "landscape";
  const pixels = isLand
    ? [1,1,1,1,1,1,1,1, 1,0,0,0,0,0,0,1, 1,0,1,1,1,1,0,1, 1,0,0,0,0,0,0,1, 1,1,1,1,1,1,1,1]
    : [1,1,1,1,1, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 1,0,1,0,1, 1,1,1,1,1];
  const cols = isLand ? 8 : 5;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 text-[8px] tracking-widest border-2 transition-none cursor-pointer
        ${active
          ? "bg-black text-white border-black"
          : "bg-white text-black/50 border-black/30 hover:border-black/70 hover:text-black"
        }`}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        boxShadow: active ? "3px 3px 0 #888" : "2px 2px 0 #333",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 5px)`,
          gap: "1px",
          color: active ? "#fff" : "#888",
        }}
      >
        {pixels.map((v, i) => (
          <div key={i} style={{ width: 5, height: 5, background: v ? "currentColor" : "transparent" }} />
        ))}
      </div>
      {type.toUpperCase()}
    </button>
  );
}

function FramePreview({ index, orientation }: { index: number; orientation: Orientation }) {
  // Camera is always landscape — individual frames are always wide (landscape)
  // Orientation controls how the STRIP is laid out: landscape = side by side, portrait = stacked
  return (

    <div className="flex flex-col items-center gap-1  ">
      <div
        className="border-2 border-black/60 flex items-center justify-center bg-black/5"
        style={{ width: 66, height: 44 }} // always landscape frame (camera default)
      >
        <div
          className="bg-black/10 border border-black/20"
          style={{ width: 50, height: 30 }}
        />
      </div>
      <span
        className="text-[6px] text-black/30 tracking-widest"
        style={{ fontFamily: "'Press Start 2P', monospace" }}
      >
        #{index}
      </span>
    </div>

  );
}

function BlinkText({ text }: { text: string }) {
  return (
    <>
      <style>{`@keyframes px-blink{0%,100%{opacity:1}50%{opacity:0}}.px-blink{animation:px-blink 1s step-start infinite}`}</style>
      <span
        className="px-blink text-[8px] tracking-widest text-black/30"
        style={{ fontFamily: "'Press Start 2P', monospace" }}
      >
        {text}
      </span>
    </>
  );
}