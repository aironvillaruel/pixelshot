"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useRef, useState, useCallback } from "react";

export default function SessionPage() {
  return (
    <Suspense>
      <SessionContent />
    </Suspense>
  );
}

function SessionContent() {
  const router = useRouter();
  const params = useSearchParams();
  const totalShots = parseInt(params.get("shots") ?? "3");
  const orientation = (params.get("orientation") ?? "landscape") as "landscape" | "portrait";
  const isPortrait = orientation === "portrait";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraWrapRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [currentShot, setCurrentShot] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashing, setFlashing] = useState(false);
  const [status, setStatus] = useState("// INITIALIZING //");
  const [done, setDone] = useState(false);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // ── Camera controls ──────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setStatus("// CONNECTING //");
    try {
     const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "user",
    aspectRatio: 4 / 3, // always landscape camera
  },
  audio: false,
});
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
      setStatus("// READY //");
    } catch {
      setStatus("// CAM ERROR //");
    }
  }, [isPortrait]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setStatus("// STANDBY //");
  }, []);

  const toggleCamera = () => (cameraOn ? stopCamera() : startCamera());

  // ── Capture logic ────────────────────────────────────────────────

  const runCountdown = async (n: number) => {
    for (let i = n; i >= 0; i--) {
      setCountdown(i);
      await sleep(900);
    }
    setCountdown(null);
  };

  const snapPhoto = async (): Promise<string> => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, vw, vh);
    ctx.restore();

    // Flash effect
    setFlashing(true);
    await sleep(450);
    setFlashing(false);

    return canvas.toDataURL("image/png");
  };

  const startSession = async () => {
    if (shooting || !cameraOn) return;
    setShooting(true);
    setDone(false);
    setCapturedFrames([]);
    setCurrentShot(0);

    const frames: string[] = [];
    for (let i = 0; i < totalShots; i++) {
      setStatus(`// SHOT ${i + 1} OF ${totalShots} //`);
      await runCountdown(3);
      const dataUrl = await snapPhoto();
      frames.push(dataUrl);
      setCapturedFrames([...frames]);
      setCurrentShot(i + 1);
      await sleep(600);
    }

    setShooting(false);
    setDone(true);
    setStatus("// DONE! //");
  };

  const retake = () => {
    setCapturedFrames([]);
    setCurrentShot(0);
    setDone(false);
    setStatus("// READY //");
  };

  // ── Download strip ───────────────────────────────────────────────

  const downloadStrip = async () => {
   if (!capturedFrames.length) return;
  const pad = 16, gap = 8;
  const imgW = 260; // always landscape frame
  const imgH = 180;
  const labelH = 20;
    const cols = isPortrait ? 1 : capturedFrames.length;
  const rows = isPortrait ? capturedFrames.length : 1;
     const cw = pad * 2 + cols * (imgW + gap) - gap;
  const ch = pad * 2 + rows * (imgH + labelH + gap) - gap + 24;

    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    // ctx.strokeStyle = "rgba(255,255,255,0.4)";
    // ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, cw - 8, ch - 8);

    const imgs = await Promise.all(
      capturedFrames.map(
        (src) =>
          new Promise<HTMLImageElement>((res) => {
            const img = new Image();
            img.onload = () => res(img);
            img.src = src;
          })
      )
    );

    imgs.forEach((img, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (imgW + gap);
      const y = pad + row * (imgH + labelH + gap);
      ctx.drawImage(img, x, y, imgW, imgH);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, imgW, imgH);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`PIXELSHOT`, x + imgW / 2, y + imgH + 14);
    });

    const a = document.createElement("a");
    a.download = "pixelshot.png";
    a.href = c.toDataURL("image/png");
    a.click();
  };

  // ── Fullscreen ───────────────────────────────────────────────────

  const toggleFullscreen = () => {
    const wrap = cameraWrapRef.current;
    if (!wrap) return;
    if (!document.fullscreenElement) {
      wrap.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  // ── Render ───────────────────────────────────────────────────────

  const camW = "100%";
const camH = "380px";

  return (
    <main
      className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
    >
      {/* Scanlines */}
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-20"
        style={{
          backgroundImage:
             "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.09) 3px, rgba(0,0,0,0.06) 4px)",
        }}
      />
      {/* Pixel borders */}
      <div className="fixed inset-3 border-2 border-black pointer-events-none z-10" />
      <div className="fixed inset-[18px] border border-black/20 pointer-events-none z-10" />
      {/* Corners */}
      {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((pos) => (
        <div key={pos} className={`fixed ${pos} w-3 h-3 bg-black border-2 border-white z-20`} />
      ))}
      <div className="flex flex-row w-full  items-center  justify-end gap-4">
      <div className=" w-1/8">
      </div>
      <div className="relative z-20 w-1/2  flex flex-col items-center gap-4  ">  
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-[10px] tracking-[0.3em] font-bold" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            PIXEL<span className="text-black/40">SHOT</span>
          </h1>
          <p className="text-[6px] tracking-[0.2em] text-black/40" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            {status}
          </p>
        </div>

        <PixelDivider />

        {/* Controls row */}
        <div className="w-full flex justify-between items-center">
          <span className="text-[6px] tracking-widest text-black/50" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            SHOTS: <span className="text-black">{currentShot} / {totalShots}</span>
          </span>
          <div className="flex gap-2 ">
            
            <PxButton onClick={toggleFullscreen}>⛶ FULLSCREEN</PxButton>
            <PxButton onClick={toggleCamera}>{cameraOn ? "■ STOP CAM" : "▶ START CAM"}</PxButton>
          </div>
        </div>

        {/* Camera viewport */}
        <div
          ref={cameraWrapRef}
          className="relative border-2 border-white/60 bg-[#111] overflow-hidden flex items-center justify-center"
          style={{ width: camW, height: camH }}
        >
          {/* Reticles */}
          {[
            "top-2 left-2 border-t-2 border-l-2",
            "top-2 right-2 border-t-2 border-r-2",
            "bottom-2 left-2 border-b-2 border-l-2",
            "bottom-2 right-2 border-b-2 border-r-2",
          ].map((cls) => (
            <div key={cls} className={`absolute ${cls} w-4 h-4 border-white/50 pointer-events-none z-10`} />
          ))}

          {/* Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: cameraOn ? "block" : "none", transform: "scaleX(-1)" }}
          />

          {/* Idle */}
          {!cameraOn && (
            <div className="text-center px-8">
              <p className="text-[7px] tracking-[0.2em] text-white/30" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                [ NO SIGNAL ]
              </p>
              <p className="text-[6px] mt-2 text-white/20 tracking-widest" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                PRESS ▶ START CAM
              </p>
            </div>
          )}

          {/* REC badge */}
          {cameraOn && !shooting && (
            <div className="absolute top-2 left-2 z-20">
              <span
                className="text-[6px] text-black bg-white/70 border border-black/50 px-1 py-0.5"
                style={{ fontFamily: "'Press Start 2P', monospace", animation: "px-blink 1s step-start infinite" }}
              >
                ● REC
              </span>
            </div>
          )}

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
              <span
                className="text-white"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 64,
                  animation: "countdown-pop 0.4s ease-out forwards",
                }}
              >
                {countdown === 0 ? "📸" : countdown}
              </span>
            </div>
          )}

          {/* Flash overlay */}
          {flashing && (
            <div className="absolute inset-0 z-30 bg-white pointer-events-none" style={{ animation: "flash-out 0.4s ease-out forwards" }} />
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Shutter button */}
        <button
          onClick={done ? retake : startSession}
          disabled={!cameraOn || shooting}
          className="w-full py-4 text-[8px] tracking-[0.3em] bg-black text-white border-2 border-black
            hover:bg-black/90 active:translate-x-px active:translate-y-px disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          style={{ fontFamily: "'Press Start 2P', monospace", boxShadow: "4px 4px 0 #555" }}
        >
          {done ? "↺ RETAKE ALL" : shooting ? `● SHOOTING ${currentShot + 1}/${totalShots}…` : "◉ TAKE PHOTO"}
        </button>

     
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="text-[7px] tracking-widest text-black/30 border border-black/20 px-4 py-2
            hover:text-black/60 hover:border-black/40 cursor-pointer"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          &lt;&lt; GO BACK
        </button>
    
      </div>
        <div className="w-1/4 bg-gray-100 flex p-4 justify-center flex-wrap">
             {/* Film strip */}
        {capturedFrames.length > 0 && (
          <>
            <div className="w-full">
              <p className="text-[6px] tracking-[0.2em] text-black/40 mb-3" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                [ FILM STRIP ]
              </p>
         <div className={`flex gap-2 flex-wrap justify-center`}>
  {capturedFrames.map((src, i) => (
    <div key={i} className="flex flex-col items-center gap-1">
      <img
        src={src}
        alt={`Frame ${i + 1}`}
        className="border-2 border-white/60 object-cover"
        style={{ width: 130, height: 90 }} // always landscape
      />
      <span className="text-[5px] text-white/30 tracking-widest" style={{ fontFamily: "'Press Start 2P', monospace" }}>
        FRAME {i + 1}F
      </span>
    </div>
  ))}
</div>
            {done && (
  <div className="flex gap-2 justify-center mt-3 flex-wrap">
    <PxButton
      onClick={() => {
        sessionStorage.setItem("pixelshot_frames", JSON.stringify(capturedFrames));
        sessionStorage.setItem("pixelshot_orientation", orientation);
        router.push("/layout/session/customize");
      }}
    >
      ✦ CUSTOMIZE
    </PxButton>
    {/* <PxButton onClick={downloadStrip}>↓ SAVE STRIP</PxButton> */}
    {/* <PxButton onClick={retake}>↺ RETAKE</PxButton> */}
  </div>
)}
            </div>
          </>
        )}

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes px-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes countdown-pop { 0%{transform:scale(2);opacity:0} 60%{transform:scale(0.9);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes flash-out { 0%{opacity:1} 100%{opacity:0} }
      `}</style>
    </main>
  );
}

/* ── Sub-components ── */

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

function PxButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-[5px] tracking-[0.1em] bg-transparent text-black border border-black/40 px-2 py-1
        hover:border-blackf/70 hover:text-black/80 cursor-pointer"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      {children}
    </button>
  );
}