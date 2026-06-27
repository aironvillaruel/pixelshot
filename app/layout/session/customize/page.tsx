"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";
import { enhanceImage } from "@/lib/enhanceImage";
// ── Supabase config — replace these with your real values ──────────
const SUPABASE_URL = "https://moicxmmqvqerpnitcyws.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DrY5MR9-pXsILGxVdRbERA_8Gv1Its6";
const BUCKET_NAME = "img-strip";
// ──────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Filter definitions ─────────────────────────────────────────────
type FilterDef = {
  id: string;
  label: string;
  // CSS filter string applied to canvas context
  cssFilter: string;
  // Optional color overlay: [r, g, b, alpha 0-255]
  overlay?: [number, number, number, number];
  // Optional vignette intensity 0-1
  vignette?: number;
};

const FILTERS: FilterDef[] = [
  {
    id: "none",
    label: "NORMAL",
    cssFilter: "none",
  },
  {
    id: "grayscale",
    label: "B&W",
    cssFilter: "grayscale(100%)",
  },
  {
    id: "warm",
    label: "WARM",
    cssFilter: "saturate(130%) sepia(30%) brightness(105%)",
    overlay: [255, 120, 30, 20],
  },
  {
    id: "cold",
    label: "COLD",
    cssFilter: "saturate(110%) hue-rotate(20deg) brightness(105%)",
    overlay: [30, 80, 220, 18],
  },
  {
    id: "vintage",
    label: "VINTAGE",
    cssFilter: "sepia(50%) saturate(80%) contrast(90%) brightness(95%)",
    overlay: [200, 160, 80, 25],
    vignette: 0.45,
  },
  {
    id: "retro",
    label: "RETRO",
    cssFilter: "saturate(150%) contrast(110%) hue-rotate(-10deg) brightness(90%)",
    overlay: [255, 80, 20, 15],
    vignette: 0.3,
  },
  {
    id: "film",
    label: "FILM",
    cssFilter: "contrast(105%) brightness(95%) saturate(85%)",
    overlay: [20, 10, 40, 22],
    vignette: 0.55,
  },
  {
    id: "faded",
    label: "FADED",
    cssFilter: "saturate(60%) brightness(115%) contrast(85%)",
    overlay: [255, 240, 220, 30],
  },
  {
    id: "hicon",
    label: "VIVID",
    cssFilter: "saturate(180%) contrast(120%) brightness(105%)",
  },
  {
    id: "sepia",
    label: "SEPIA",
    cssFilter: "sepia(80%) brightness(100%)",
    overlay: [160, 100, 30, 20],
    vignette: 0.3,
  },
  {
    id: "noir",
    label: "NOIR",
    cssFilter: "grayscale(100%) contrast(130%) brightness(90%)",
    vignette: 0.6,
  },
  {
    id: "dream",
    label: "DREAM",
    cssFilter: "saturate(120%) brightness(110%) contrast(90%) hue-rotate(10deg)",
    overlay: [200, 150, 255, 20],
  },
];

// Apply a filter to an image and return a filtered canvas
async function applyFilterToImage(
  img: HTMLImageElement,
  filter: FilterDef,
  destW: number,
  destH: number
): Promise<HTMLCanvasElement> {
  const fc = document.createElement("canvas");
  fc.width = destW;
  fc.height = destH;
  const fctx = fc.getContext("2d")!;

  // Apply CSS filter via canvas filter property
  if (filter.cssFilter !== "none") {
    fctx.filter = filter.cssFilter;
  }
  fctx.drawImage(img, 0, 0, destW, destH);
  fctx.filter = "none";

  // Apply color overlay
  if (filter.overlay) {
    const [r, g, b, a] = filter.overlay;
    fctx.globalCompositeOperation = "source-atop";
    fctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
    fctx.fillRect(0, 0, destW, destH);
    fctx.globalCompositeOperation = "source-over";
  }

  // Apply vignette
  if (filter.vignette && filter.vignette > 0) {
    const vg = fctx.createRadialGradient(
      destW / 2, destH / 2, destW * 0.25,
      destW / 2, destH / 2, destW * 0.75
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,0,0,${filter.vignette})`);
    fctx.globalCompositeOperation = "multiply";
    fctx.fillStyle = vg;
    fctx.fillRect(0, 0, destW, destH);
    fctx.globalCompositeOperation = "source-over";
  }

  return fc;
}

export default function CustomizePage() {
  return (
    <Suspense>
      <CustomizeContent />
    </Suspense>
  );
}

function CustomizeContent() {
  const router = useRouter();

  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [stripLayout, setStripLayout] = useState<"landscape" | "portrait">("landscape");
  const [stripBg, setStripBg] = useState("#000000");
  const [stripLabel, setStripLabel] = useState("PIXELSHOT");
  const [selectedFilter, setSelectedFilter] = useState<FilterDef>(FILTERS[0]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const px: React.CSSProperties = { fontFamily: "'Press Start 2P', monospace" };

  useEffect(() => {
    const raw = sessionStorage.getItem("pixelshot_frames");
    const ori = sessionStorage.getItem("pixelshot_orientation") as "landscape" | "portrait" | null;
    if (raw) setCapturedFrames(JSON.parse(raw) as string[]);
    if (ori) { setOrientation(ori); setStripLayout(ori); }
  }, []);

  const buildStripCanvas = useCallback(async (): Promise<HTMLCanvasElement> => {
    const pad = 16, gap = 8;
    const imgW = 260, imgH = 180, labelH = 20;
    const cols = stripLayout === "portrait" ? 1 : capturedFrames.length;
    const rows = stripLayout === "portrait" ? capturedFrames.length : 1;
    const cw = pad * 2 + cols * (imgW + gap) - gap;
    const ch = pad * 2 + rows * (imgH + labelH + gap) - gap + 24;

    const c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = stripBg;
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, cw - 8, ch - 8);

    // Load source images
    const imgs = await Promise.all(
      capturedFrames.map(
        (src) => new Promise<HTMLImageElement>((res) => {
          const img = new Image(); img.onload = () => res(img); img.src = src;
        })
      )
    );

    // Apply filter to each image and draw
    for (let i = 0; i < imgs.length; i++) {
      const filteredCanvas = await applyFilterToImage(imgs[i], selectedFilter, imgW, imgH);
      const col = i % cols, row = Math.floor(i / cols);
      const x = pad + col * (imgW + gap), y = pad + row * (imgH + labelH + gap);
      ctx.drawImage(filteredCanvas, x, y, imgW, imgH);
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, imgW, imgH);
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.strokeStyle = "black"; ctx.lineWidth = 0.5;
      ctx.font = "8px monospace"; ctx.textAlign = "center";
      ctx.strokeText(stripLabel || "PIXELSHOT", x + imgW / 2, y + imgH + 14);
      ctx.fillText(stripLabel || "PIXELSHOT", x + imgW / 2, y + imgH + 14);
    }

    return c;
  }, [capturedFrames, stripLayout, stripBg, stripLabel, selectedFilter]);

  const refreshPreview = useCallback(async () => {
    if (!capturedFrames.length) return;
    setPreviewLoading(true);
    const c = await buildStripCanvas();
    setPreviewUrl(c.toDataURL("image/png"));
    setPreviewLoading(false);
  }, [buildStripCanvas, capturedFrames.length]);

  useEffect(() => { refreshPreview(); }, [refreshPreview]);

  const downloadStrip = async () => {
    const c = await buildStripCanvas();
    const a = document.createElement("a");
    a.download = "pixelshot.png";
    a.href = c.toDataURL("image/png");
    a.click();
    setSaved(true);
  };
const handleEnhance = async () => {
    if (!previewUrl || enhancing) return;
    setEnhancing(true);
    setEnhanceError(null);

    if (!originalPreviewUrl) setOriginalPreviewUrl(previewUrl);

    try {
      const result = await enhanceImage(previewUrl);
      setPreviewUrl(result);
      setEnhanced(true);
    } catch (err) {
      console.error("Enhancement failed:", err);
      setEnhanceError("Enhancement failed. Please try again.");
    } finally {
      setEnhancing(false);
    }
  };

  const handleUndoEnhance = () => {
    if (originalPreviewUrl) {
      setPreviewUrl(originalPreviewUrl);
      setOriginalPreviewUrl(null);
      setEnhanced(false);
      setEnhanceError(null);
    }
  };
  // ── Generate QR Code via Supabase Storage ────────────────────────
  const generateQr = useCallback(async () => {
    if (!capturedFrames.length) return;
    setQrModalOpen(true);
    setQrLoading(true);
    setQrError(null);
    setQrDataUrl(null);
    setUploadedUrl(null);

    try {
      const canvas = await buildStripCanvas();
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => { if (b) resolve(b); else reject(new Error("Canvas toBlob failed")); },
          "image/jpeg",
          0.85
        );
      });

      const fileName = `strip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(uploadData.path);

      if (!urlData?.publicUrl) throw new Error("Could not retrieve public URL from Supabase.");

      const directUrl = urlData.publicUrl;
      setUploadedUrl(directUrl);

      const qrCanvas = document.createElement("canvas");
      await QRCode.toCanvas(qrCanvas, directUrl, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(qrCanvas.toDataURL("image/png"));
    } catch (err: any) {
      console.error("QR generation error:", err);
      setQrError(err?.message ?? "Unknown error. Please try again.");
    } finally {
      setQrLoading(false);
    }
  }, [capturedFrames, buildStripCanvas]);

  const BG_PRESETS = [
    { hex: "#000000", label: "BLACK" },
    { hex: "#ffffff", label: "WHITE" },
    { hex: "#1a0a2e", label: "VIOLET" },
    { hex: "#2e0a0a", label: "MAROON" },
    { hex: "#0a2e1a", label: "FOREST" },
    { hex: "#0d1b2a", label: "NAVY" },
  ];

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-10 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.09) 3px, rgba(0,0,0,0.06) 4px)" }} />
      <div className="fixed inset-3 border-2 border-black pointer-events-none z-10" />
      {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((pos) => (
        <div key={pos} className={`fixed ${pos} border border-black/20 pointer-events-none z-10`} />
      ))}

      <div className="relative z-20 w-full max-w-4xl flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 pt-2">
          <h1 className="text-[10px] tracking-[0.3em] font-bold" style={px}>PIXEL<span className="text-black/30">SHOT</span></h1>
          <p className="text-[6px] tracking-[0.25em] text-black/40" style={px}>// CUSTOMIZE STRIP //</p>
        </div>

        <PixelDivider />

        <div className="flex flex-col md:flex-row gap-6 bg-gray-200 border-2 border-gray-100 p-4">
          <div className="flex flex-col gap-6 md:w-64 shrink-0">

            {/* ── FILTERS ── */}
            <Section label="FILTERS">
              <div className="flex flex-wrap justify-between ">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFilter(f)}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <FilterSwatch filter={f} active={selectedFilter.id === f.id} />
                    <span
                      className="text-[5px] tracking-widest leading-tight text-center"
                      style={{
                        ...px,
                        color: selectedFilter.id === f.id ? "#000" : "rgba(0,0,0,0.35)",
                      }}
                    >
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            {/* ── BACKGROUND ── */}
            <Section label="BACKGROUND">
              <div className="grid grid-cols-3 gap-2">
                {BG_PRESETS.map(({ hex, label }) => (
                  <button key={hex} onClick={() => setStripBg(hex)} title={label} className="flex flex-col items-center gap-1 cursor-pointer group">
                    <div className="w-full h-8" style={{ background: hex, border: stripBg === hex ? "2px solid #999" : "1px solid rgba(0,0,0,0.15)" }} />
                    <span className="text-[5px] tracking-widest" style={{ ...px, color: stripBg === hex ? "#000" : "rgba(0,0,0,0.3)" }}>{label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[6px] tracking-widest text-black/30" style={px}>CUSTOM</span>
                <label className="flex items-center gap-2 border border-black/20 px-2 py-1 cursor-pointer hover:border-black/40" style={{ flex: 1 }}>
                  <div className="w-5 h-5 border border-black/30" style={{ background: stripBg }} />
                  <span className="text-[6px] tracking-widest text-black/50" style={px}>{stripBg.toUpperCase()}</span>
                  <input type="color" value={stripBg} onChange={(e) => setStripBg(e.target.value)} className="sr-only" />
                </label>
              </div>
            </Section>

            {/* ── STRIP LABEL ── */}
            <Section label="STRIP LABEL">
              <input type="text" value={stripLabel} onChange={(e) => setStripLabel(e.target.value.toUpperCase())} maxLength={16}
                className="w-full bg-transparent text-black border border-black/20 px-3 py-2 text-[7px] tracking-[0.2em] outline-none focus:border-black/60" style={px} placeholder="PIXELSHOT" />
              <p className="text-[6px] tracking-widest text-black/40 mt-1" style={px}>MAX 16 CHARS · SHOWN BELOW EACH FRAME</p>
            </Section>

            <button
              onClick={() => {
                setStripLayout(orientation);
                setStripBg("#000000");
                setStripLabel("PIXELSHOT");
                setSelectedFilter(FILTERS[0]);
              }}
              className="text-[6px] tracking-widest text-black/40 border border-black/40 px-4 py-2 hover:text-black/50 hover:border-black/25 cursor-pointer"
              style={px}
            >
              ↺ RESET TO DEFAULTS
            </button>

            <button onClick={generateQr} disabled={!capturedFrames.length}
              className="py-2 px-8 text-[8px] tracking-[0.25em] bg-black text-white border-none hover:bg-black/90 active:translate-x-px active:translate-y-px disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              style={{ ...px, boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}>
              ▦ GENERATE QR
            </button>
          </div>

          {/* ── PREVIEW ── */}
          {/* ── PREVIEW ── */}
<div className="flex-1 flex flex-col gap-4">
  <div className="flex justify-between items-center">
    <span className="text-[6px] tracking-[0.2em] text-black/40" style={px}>[ LIVE PREVIEW ]</span>
    <div className="flex gap-2">
      {enhanced && (
        <PxButton onClick={handleUndoEnhance}>↺ UNDO</PxButton>
      )}
      <PxButton onClick={refreshPreview}>↻ REFRESH</PxButton>
    </div>
  </div>

  <div className="flex-1 flex items-center justify-center border border-black/10 bg-black/5 min-h-[280px] p-4">
    {previewLoading ? (
      <span className="text-[7px] text-black/30 tracking-[0.2em] animate-pulse" style={px}>RENDERING…</span>
    ) : previewUrl ? (
      <img src={previewUrl} alt="Strip preview" className="max-w-full max-h-[420px] object-contain border border-black/10" />
    ) : (
      <span className="text-[6px] text-black/20 tracking-widest" style={px}>[ NO FRAMES FOUND ]</span>
    )}
  </div>

  {/* ── ENHANCE BUTTON ── */}
  <div className="flex flex-col items-center gap-2">
    <button
      onClick={handleEnhance}
      disabled={!previewUrl || enhancing || enhanced}
      className="w-full py-3 px-8 text-[8px] tracking-[0.25em] bg-black text-white border-none hover:bg-black/90 active:translate-x-px active:translate-y-px disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
      style={{ ...px, boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}
    >
      {enhancing ? (
        <>
          <span className="animate-pulse">◈</span> ENHANCING…
        </>
      ) : enhanced ? (
        <>✓ ENHANCED!</>
      ) : (
        <>✦ ENHANCE IMAGE</>
      )}
    </button>

    {enhancing && (
      <span className="text-[5px] tracking-widest text-black/40 animate-pulse" style={px}>
        AI IS RESTORING FACES + SHARPENING · ~10-20 SEC
      </span>
    )}
    {enhanceError && (
      <span className="text-[5px] tracking-widest text-red-400" style={px}>
        ⚠ {enhanceError}
      </span>
    )}
    {enhanced && (
      <span className="text-[5px] tracking-widest text-black/40" style={px}>
        ✦ AI ENHANCED · CLICK ↺ UNDO TO REVERT
      </span>
    )}
  </div>
</div>
        </div>

        <PixelDivider />

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-4">
          <button onClick={() => router.back()}
            className="text-[7px] tracking-widest text-black/30 border border-black/15 px-5 py-2.5 hover:text-black/60 hover:border-black/30 cursor-pointer" style={px}>
            &lt;&lt; GO BACK
          </button>
          <div className="flex gap-3 items-center">
            {saved && <span className="text-[6px] tracking-widest text-black/40 animate-pulse" style={px}>✓ SAVED!</span>}
            <button onClick={downloadStrip} disabled={!capturedFrames.length}
              className="py-3 px-8 text-[8px] tracking-[0.25em] bg-black text-white border-none hover:bg-black/90 active:translate-x-px active:translate-y-px disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              style={{ ...px, boxShadow: "4px 4px 0 rgba(255,255,255,0.2)" }}>
              ↓ SAVE STRIP
            </button>
          </div>
        </div>
      </div>

      {/* ── QR Modal ── */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setQrModalOpen(false); }}>
          <div className="relative bg-white border-2 border-black p-6 flex flex-col items-center gap-4 max-w-sm w-full mx-4" style={{ boxShadow: "8px 8px 0 #000" }}>
            <button onClick={() => setQrModalOpen(false)}
              className="absolute top-3 right-3 text-[7px] text-black/40 hover:text-black border border-black/20 hover:border-black w-7 h-7 flex items-center justify-center cursor-pointer" style={px}>
              ✕
            </button>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[8px] tracking-[0.25em] font-bold" style={px}>SCAN TO DOWNLOAD</span>
              <span className="text-[5px] tracking-widest text-black/40" style={px}>POINT YOUR CAMERA AT THE QR CODE</span>
            </div>
            <PixelDivider />
            <div className="w-[280px] h-[280px] flex items-center justify-center border border-black/10 bg-gray-50">
              {qrLoading && (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 bg-black animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <span className="text-[6px] tracking-widest text-black/40 animate-pulse" style={px}>UPLOADING + ENCODING…</span>
                </div>
              )}
              {!qrLoading && qrError && (
                <div className="flex flex-col items-center gap-2 px-4 text-center">
                  <span className="text-[14px]">⚠</span>
                  <span className="text-[6px] tracking-widest text-red-500" style={px}>ERROR</span>
                  <span className="text-[5px] tracking-wide text-black/50 leading-relaxed" style={px}>{qrError}</span>
                  <button onClick={generateQr} className="mt-2 text-[6px] tracking-widest border border-black px-3 py-1.5 hover:bg-black hover:text-white cursor-pointer" style={px}>
                    ↻ RETRY
                  </button>
                </div>
              )}
              {!qrLoading && !qrError && qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
              )}
            </div>
            {!qrLoading && !qrError && qrDataUrl && (
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="flex items-center gap-2 bg-gray-50 border border-black/10 px-3 py-2 w-full">
                  <span className="text-[5px] text-black/30" style={px}>☁</span>
                  <span className="text-[5px] tracking-widest text-black/40 leading-relaxed" style={px}>
                    STORED IN SUPABASE · img-strip BUCKET
                  </span>
                </div>
                {uploadedUrl && (
                  <a href={uploadedUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[5px] tracking-widest text-black/30 hover:text-black underline underline-offset-2" style={px}>
                    OPEN DIRECT LINK ↗
                  </a>
                )}
                <button onClick={() => { const a = document.createElement("a"); a.download = "pixelshot-qr.png"; a.href = qrDataUrl; a.click(); }}
                  className="text-[6px] tracking-widest text-black/40 border border-black/20 px-4 py-1.5 hover:border-black/60 hover:text-black/70 cursor-pointer" style={px}>
                  ↓ SAVE QR IMAGE
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
    </main>
  );
}

// ── FilterSwatch: renders a small canvas preview of what each filter looks like ──
function FilterSwatch({ filter, active }: { filter: FilterDef; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width, h = canvas.height;

    // Draw a simple gradient swatch as the "base image"
    const grd = ctx.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, "#e8c090");
    grd.addColorStop(0.4, "#70b8d8");
    grd.addColorStop(0.7, "#a0c870");
    grd.addColorStop(1, "#d87050");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Apply CSS filter
    if (filter.cssFilter !== "none") {
      // Re-draw through an offscreen canvas to apply CSS filter
      const off = document.createElement("canvas");
      off.width = w; off.height = h;
      const offCtx = off.getContext("2d")!;
      offCtx.filter = filter.cssFilter;
      offCtx.drawImage(canvas, 0, 0);
      offCtx.filter = "none";

      // Color overlay
      if (filter.overlay) {
        const [r, g, b, a] = filter.overlay;
        offCtx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
        offCtx.fillRect(0, 0, w, h);
      }

      // Vignette
      if (filter.vignette) {
        const vg = offCtx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, `rgba(0,0,0,${filter.vignette})`);
        offCtx.globalCompositeOperation = "multiply";
        offCtx.fillStyle = vg;
        offCtx.fillRect(0, 0, w, h);
        offCtx.globalCompositeOperation = "source-over";
      }

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(off, 0, 0);
    }
  }, [filter]);

  return (
    <canvas
      ref={canvasRef}
      width={56}
      height={40}
      className="w-full"
      style={{
        display: "block",
        border: active ? "2px solid #000" : "1px solid rgba(0,0,0,0.15)",
        imageRendering: "pixelated",
      }}
    />
  );
}

function Section({ label, children }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[6px] tracking-[0.2em] text-black/35" style={{ fontFamily: "'Press Start 2P', monospace" }}>{label}</span>
      {children}
    </div>
  );
}

function PixelDivider() {
  return <div className="w-full h-[3px]" style={{ backgroundImage: "repeating-linear-gradient(90deg, #fff 0, #fff 8px, #000 8px, #000 12px)" }} />;
}

function PxButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="text-[5px] tracking-[0.1em] bg-transparent text-black/50 border border-black/20 px-2 py-1 hover:text-black/80 hover:border-black/40 cursor-pointer"
      style={{ fontFamily: "'Press Start 2P', monospace" }}>
      {children}
    </button>
  );
}