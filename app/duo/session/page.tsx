"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useRef, useState, useCallback, useEffect } from "react";
import { useDuoBooth, type SessionConfig } from "../../../lib/useDuoBooth";

export default function SessionPage() {
  return (
    <Suspense>
      <SessionContent />
    </Suspense>
  );
}

const PANE_W = 260;
const PANE_H = 195;
const PANE_GAP = 8;

function SessionContent() {
  const router = useRouter();
  const params = useSearchParams();
  const roomId = params.get("room") ?? "";

  // Only the booth creator's URL carries shots/orientation — presence of
  // "shots" is what marks this browser as the host.
  const shotsParam = params.get("shots");
  const isHost = shotsParam !== null;
  const hostConfig: SessionConfig | null = isHost
    ? {
        shots: parseInt(shotsParam ?? "3"),
        orientation: (params.get("orientation") as "landscape" | "portrait") ?? "landscape",
      }
    : null;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boothWrapRef = useRef<HTMLDivElement>(null);
  const localMediaRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [currentShot, setCurrentShot] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashing, setFlashing] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runCountdown = async (n: number) => {
    for (let i = n; i >= 0; i--) {
      setCountdown(i);
      await sleep(900);
    }
    setCountdown(null);
  };

  // Composite both panes — local (mirrored) on the left, partner on the
  // right — into a single frame, the same shape whether or not the
  // partner's video has actually arrived yet.
  const snapPhoto = async (): Promise<string> => {
    const canvas = canvasRef.current!;
    const localVideo = localVideoRef.current!;
    const remoteVideo = remoteVideoRef.current!;

    canvas.width = PANE_W * 2 + PANE_GAP;
    canvas.height = PANE_H;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (localVideo.videoWidth) {
      ctx.save();
      ctx.translate(PANE_W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(localVideo, 0, 0, PANE_W, PANE_H);
      ctx.restore();
    }

    const rightX = PANE_W + PANE_GAP;
    if (remoteVideo.videoWidth) {
      ctx.drawImage(remoteVideo, rightX, 0, PANE_W, PANE_H);
    } else {
      ctx.fillStyle = "#222";
      ctx.fillRect(rightX, 0, PANE_W, PANE_H);
    }

    setFlashing(true);
    await sleep(450);
    setFlashing(false);

    return canvas.toDataURL("image/png");
  };

  const runShotSequence = useCallback(async (cfg: SessionConfig) => {
    setShooting(true);
    setDone(false);
    setCapturedFrames([]);
    setCurrentShot(0);

    const frames: string[] = [];
    for (let i = 0; i < cfg.shots; i++) {
      await runCountdown(3);
      const dataUrl = await snapPhoto();
      frames.push(dataUrl);
      setCapturedFrames([...frames]);
      setCurrentShot(i + 1);
      await sleep(600);
    }

    setShooting(false);
    setDone(true);
  }, []);

  const {
    status: connStatus,
    localStream,
    remoteStream,
    config,
    partnerConnected,
    attachLocalStream,
    detachLocalStream,
    requestSession,
  } = useDuoBooth({
    roomId,
    hostConfig,
    onSessionStart: runShotSequence,
  });

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // ── Camera controls ──────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", aspectRatio: 4 / 3 },
        audio: true,
      });
      localMediaRef.current = stream;
      attachLocalStream(stream);
      setCameraOn(true);
    } catch {
      // getUserMedia rejected — surfaced via the status line below
    }
  }, [attachLocalStream]);

  const stopCamera = useCallback(() => {
    localMediaRef.current?.getTracks().forEach((t) => t.stop());
    localMediaRef.current = null;
    detachLocalStream();
    setCameraOn(false);
  }, [detachLocalStream]);

  const toggleCamera = () => (cameraOn ? stopCamera() : startCamera());

  const retake = () => {
    setCapturedFrames([]);
    setCurrentShot(0);
    setDone(false);
  };

  const takePhoto = () => {
    if (shooting || !config || connStatus !== "connected" || !cameraOn) return;
    requestSession(config);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard denied — the code is printed on screen regardless
    }
  };

  // ── Download strip ───────────────────────────────────────────────

  const downloadStrip = async () => {
    if (!capturedFrames.length || !config) return;
    const pad = 16,
      gap = 8;
    const imgW = PANE_W * 2 + PANE_GAP;
    const imgH = PANE_H;
    const labelH = 20;
    const isPortrait = config.orientation === "portrait";
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
      ctx.fillText(`PIXELSHOT · DUO`, x + imgW / 2, y + imgH + 14);
    });

    const a = document.createElement("a");
    a.download = `pixelshot-duo-${roomId}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };

  // ── Fullscreen ───────────────────────────────────────────────────

  const toggleFullscreen = () => {
    const wrap = boothWrapRef.current;
    if (!wrap) return;
    if (!document.fullscreenElement) {
      wrap.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  // ── Status line ───────────────────────────────────────────────────

  const statusText = shooting
    ? `// SHOT ${currentShot + 1} OF ${config?.shots ?? "?"} //`
    : done
    ? "// DONE! //"
    : connStatus === "full"
    ? "// BOOTH FULL //"
    : connStatus === "waiting"
    ? "// WAITING FOR PARTNER //"
    : connStatus === "connecting"
    ? "// CONNECTING //"
    : !config
    ? "// SYNCING SETTINGS //"
    : !cameraOn
    ? "// READY — START YOUR CAM //"
    : "// LIVE //";

  const paneMessage = (hasStream: boolean, idleLabel: string) =>
    !hasStream && (
      <div className="text-center px-4">
        <p
          className="text-[6px] tracking-[0.2em] text-white/30"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          {idleLabel}
        </p>
      </div>
    );

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
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

      <div className="flex flex-row w-full items-center justify-end gap-4">
        <div className="w-1/8" />
        <div className="relative z-20 w-1/2 flex flex-col items-center gap-4">
          {/* Header */}
          <div className="flex flex-col items-center gap-2">
            <h1
              className="text-[10px] tracking-[0.3em] font-bold"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              PIXEL<span className="text-black/40">SHOT</span>
            </h1>
            <p
              className="text-[6px] tracking-[0.2em] text-black/40"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              {statusText}
            </p>
            <button
              onClick={copyCode}
              className="text-[6px] tracking-[0.2em] border border-black/30 px-2 py-1 hover:border-black cursor-pointer"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              {copied ? "COPIED!" : `BOOTH CODE: ${roomId}`}
            </button>
          </div>

          <PixelDivider />

          {/* Controls row */}
          <div className="w-full flex justify-between items-center">
            <span
              className="text-[6px] tracking-widest text-black/50"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              SHOTS: <span className="text-black">{currentShot} / {config?.shots ?? "?"}</span>
            </span>
            <div className="flex gap-2">
              <PxButton onClick={toggleFullscreen}>⛶ FULLSCREEN</PxButton>
              <PxButton onClick={toggleCamera}>{cameraOn ? "■ STOP CAM" : "▶ START CAM"}</PxButton>
            </div>
          </div>

          {/* Camera viewport — two panes side by side */}
          <div
            ref={boothWrapRef}
            className="relative border-2 border-white/60 bg-[#111] overflow-hidden flex items-stretch justify-center gap-[2px]"
            style={{ width: "100%", height: "380px" }}
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

            {/* Local pane (you) */}
            <div className="relative flex-1 flex items-center justify-center bg-[#0a0a0a] border-r border-white/10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: cameraOn ? "block" : "none", transform: "scaleX(-1)" }}
              />
              {paneMessage(cameraOn, "[ NO SIGNAL ]  ·  PRESS ▶ START CAM")}
              <span
                className="absolute bottom-2 left-2 text-[5px] tracking-widest text-white/60 bg-black/50 px-1"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                YOU
              </span>
            </div>

            {/* Remote pane (partner) */}
            <div className="relative flex-1 flex items-center justify-center bg-[#0a0a0a]">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{ display: remoteStream ? "block" : "none" }}
              />
              {paneMessage(
                !!remoteStream,
                connStatus === "waiting"
                  ? "[ WAITING FOR PARTNER ]"
                  : connStatus === "full"
                  ? "[ BOOTH ALREADY FULL ]"
                  : "[ CONNECTING… ]"
              )}
              <span
                className="absolute bottom-2 left-2 text-[5px] tracking-widest text-white/60 bg-black/50 px-1"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                PARTNER
              </span>
            </div>

            {/* Countdown overlay — spans both panes */}
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
              <div
                className="absolute inset-0 z-30 bg-white pointer-events-none"
                style={{ animation: "flash-out 0.4s ease-out forwards" }}
              />
            )}

            {/* REC badge */}
            {cameraOn && remoteStream && !shooting && (
              <div className="absolute top-2 left-2 z-20">
                <span
                  className="text-[6px] text-black bg-white/70 border border-black/50 px-1 py-0.5"
                  style={{ fontFamily: "'Press Start 2P', monospace", animation: "px-blink 1s step-start infinite" }}
                >
                  ● LIVE
                </span>
              </div>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Shutter button */}
          <button
            onClick={done ? retake : takePhoto}
            disabled={!cameraOn || shooting || !config || connStatus !== "connected"}
            className="w-full py-4 text-[8px] tracking-[0.3em] bg-black text-white border-2 border-black
              hover:bg-black/90 active:translate-x-px active:translate-y-px disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            style={{ fontFamily: "'Press Start 2P', monospace", boxShadow: "4px 4px 0 #555" }}
          >
            {done
              ? "↺ RETAKE ALL"
              : shooting
              ? `● SHOOTING ${currentShot + 1}/${config?.shots ?? "?"}…`
              : "◉ TAKE PHOTO TOGETHER"}
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
                <p
                  className="text-[6px] tracking-[0.2em] text-black/40 mb-3"
                  style={{ fontFamily: "'Press Start 2P', monospace" }}
                >
                  [ FILM STRIP ]
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {capturedFrames.map((src, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <img
                        src={src}
                        alt={`Frame ${i + 1}`}
                        className="border-2 border-white/60 object-cover"
                        style={{ width: 150, height: 68 }}
                      />
                      <span
                        className="text-[5px] text-white/30 tracking-widest"
                        style={{ fontFamily: "'Press Start 2P', monospace" }}
                      >
                        FRAME {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
                {done && (
                  <div className="flex gap-2 justify-center mt-3 flex-wrap">
                    <PxButton
                      onClick={() => {
                        sessionStorage.setItem("pixelshot_frames", JSON.stringify(capturedFrames));
                        sessionStorage.setItem("pixelshot_orientation", config?.orientation ?? "landscape");
                        router.push("/layout/session/customize");
                      }}
                    >
                      ✦ CUSTOMIZE
                    </PxButton>
                    <PxButton onClick={downloadStrip}>↓ SAVE STRIP</PxButton>
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
        hover:border-black/70 hover:text-black/80 cursor-pointer"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      {children}
    </button>
  );
}