// components/EnhancingOverlay.tsx
"use client";

import { EnhanceStatus } from "@/hooks/useImageEnhancer";

interface Props {
  status: EnhanceStatus;
  progress: number;
}

const STATUS_LABELS: Record<EnhanceStatus, string> = {
  idle: "",
  "loading-model": "LOADING AI MODEL...",
  enhancing: "ENHANCING...",
  done: "DONE",
  error: "ERROR",
};

/**
 * Full-screen overlay rendered on top of the camera view while
 * Real-ESRGAN is loading / running. Matches the pixel-art aesthetic
 * of the rest of the photobooth app.
 */
export default function EnhancingOverlay({ status, progress }: Props) {
  if (status === "idle" || status === "done") return null;

  const label = STATUS_LABELS[status];
  const isError = status === "error";
  const barWidth = Math.min(100, progress);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes px-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .scan-line {
          animation: scan 2s linear infinite;
        }
        .px-blink {
          animation: px-blink 0.8s step-start infinite;
        }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center gap-6 px-6">

        {/* Scanline sweep */}
        <div
          className="scan-line pointer-events-none fixed left-0 right-0 h-12 opacity-10"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(255,255,255,0.3), transparent)",
          }}
        />

        {/* Pixel camera icon */}
        <PixelCameraSprite />

        {/* Status label */}
        <p
          className={`text-[10px] tracking-[0.3em] ${isError ? "text-red-400" : "text-white"}`}
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          {label}
          {!isError && <span className="px-blink"> _</span>}
        </p>

        {/* Progress bar (hidden on error) */}
        {!isError && (
          <div className="w-full max-w-xs flex flex-col gap-2">
            {/* Track */}
            <div className="w-full h-3 border-2 border-white/30 bg-black/50">
              {/* Fill — 8-pixel-wide steps via repeating-linear-gradient */}
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${barWidth}%`,
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #fff 0, #fff 6px, transparent 6px, transparent 8px)",
                }}
              />
            </div>

            {/* Percentage */}
            <p
              className="text-right text-[8px] text-white/50 tracking-widest"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              {barWidth}%
            </p>
          </div>
        )}

        {/* Info text */}
        {status === "loading-model" && (
          <p
            className="text-[7px] text-white/30 tracking-widest text-center max-w-xs"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            REAL-ESRGAN × 4 UPSCALE
            <br />
            FIRST LOAD TAKES ~10-20s
          </p>
        )}

        {isError && (
          <p
            className="text-[7px] text-red-400/70 tracking-widest text-center max-w-xs"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            ENHANCE FAILED — USING ORIGINAL
          </p>
        )}
      </div>
    </>
  );
}

/* ── Pixel camera sprite (7×5 grid) ── */
function PixelCameraSprite() {
  const pixels = [
    0, 1, 1, 1, 1, 1, 0,
    1, 1, 0, 0, 0, 1, 1,
    1, 0, 1, 1, 1, 0, 1,
    1, 0, 1, 1, 1, 0, 1,
    0, 1, 1, 1, 1, 1, 0,
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 10px)",
        gap: "2px",
      }}
    >
      {pixels.map((v, i) => (
        <div
          key={i}
          style={{
            width: 10,
            height: 10,
            background: v ? "#ffffff" : "transparent",
          }}
        />
      ))}
    </div>
  );
}