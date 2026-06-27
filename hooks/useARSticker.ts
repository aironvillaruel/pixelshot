"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StickerConfig {
  src: string;
  anchor: StickerAnchor;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

export type StickerAnchor =
  | "forehead"
  | "noseBridge"
  | "noseTip"
  | "leftEye"
  | "rightEye"
  | "mouth"
  | "chin"
  | "fullFace"
  | number;

const ANCHOR_INDEX: Record<string, number> = {
  forehead: 10,
  noseBridge: 168,
  noseTip: 1,
  leftEye: 159,
  rightEye: 386,
  mouth: 13,
  chin: 152,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useARSticker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  overlayRef: React.RefObject<HTMLCanvasElement | null>,
  stickers: StickerConfig[],
  enabled: boolean
) {
  const faceLandmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const stickerImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const lastLandmarksRef = useRef<any[] | null>(null);
  const lastTimestampRef = useRef<number>(-1);
  const frameCountRef = useRef<number>(0);

  const [arReady, setArReady] = useState(false);
  const [arError, setArError] = useState<string | null>(null);

  // ── Load MediaPipe ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    (async () => {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const { FaceLandmarker, FilesetResolver } = vision;

        const resolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        const fl = await FaceLandmarker.createFromOptions(resolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });

        if (!cancelled) {
          faceLandmarkerRef.current = fl;
          setArReady(true);
        }
      } catch (e: any) {
        if (!cancelled) {
          setArError(e?.message ?? "MediaPipe load failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Preload sticker images ──────────────────────────────────────────────────

  useEffect(() => {
    stickers.forEach(({ src }) => {
      if (stickerImagesRef.current.has(src)) return;
      const img = new Image();
      img.src = src;
      stickerImagesRef.current.set(src, img);
    });
  }, [stickers]);

  // ── Draw stickers ───────────────────────────────────────────────────────────

  const drawStickers = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: any[],
      canvasW: number,
      canvasH: number,
      mirrored: boolean
    ) => {
      if (!landmarks?.length) return;
      const lm = landmarks[0];

      const le = lm[33];
      const re = lm[263];
      const eyeDist = Math.abs(re.x - le.x) * canvasW;

      stickers.forEach(
        ({ src, anchor, scale = 3, offsetX = 0, offsetY = 0 }) => {
          const img = stickerImagesRef.current.get(src);
          if (!img?.complete || img.naturalWidth === 0) return;

          let ax: number, ay: number;

          if (anchor === "fullFace") {
            let minX = Infinity,
              maxX = -Infinity,
              minY = Infinity,
              maxY = -Infinity;

            lm.forEach((p: any) => {
              if (p.x < minX) minX = p.x;
              if (p.x > maxX) maxX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.y > maxY) maxY = p.y;
            });

            ax = ((minX + maxX) / 2) * canvasW;
            ay = ((minY + maxY) / 2) * canvasH;
          } else {
            const idx =
              typeof anchor === "number"
                ? anchor
                : ANCHOR_INDEX[anchor] ?? 1;

            const pt = lm[idx];
            if (!pt) return;

            ax = pt.x * canvasW;
            ay = pt.y * canvasH;
          }

          if (mirrored) ax = canvasW - ax;

          const stickerW = eyeDist * scale;
          const stickerH =
            (img.naturalHeight / img.naturalWidth) * stickerW;

          const dx =
            ax - stickerW / 2 + (offsetX / 100) * stickerW;
          const dy =
            ay - stickerH / 2 + (offsetY / 100) * stickerH;

          ctx.drawImage(img, dx, dy, stickerW, stickerH);
        }
      );
    },
    [stickers]
  );

  // ── Render loop ─────────────────────────────────────────────────────────────

  const runLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    const fl = faceLandmarkerRef.current;

    if (!video || !canvas || !fl) {
      animFrameRef.current = requestAnimationFrame(runLoop);
      return;
    }

    if (
      video.readyState !== HTMLMediaElement.HAVE_ENOUGH_DATA ||
      video.paused ||
      video.ended ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      animFrameRef.current = requestAnimationFrame(runLoop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(runLoop);
      return;
    }

    const { offsetWidth: w, offsetHeight: h } = video;

    if (w === 0 || h === 0) {
      animFrameRef.current = requestAnimationFrame(runLoop);
      return;
    }

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);

    try {
      // Warmup frames
      if (frameCountRef.current < 8) {
        frameCountRef.current++;
        animFrameRef.current = requestAnimationFrame(runLoop);
        return;
      }

      // Ensure video is ready for detection
      if (video.readyState < video.HAVE_CURRENT_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
        animFrameRef.current = requestAnimationFrame(runLoop);
        return;
      }

      const timestampMs = video.currentTime * 1000;

      // Ensure monotonic timestamps
      if (timestampMs <= lastTimestampRef.current) {
        animFrameRef.current = requestAnimationFrame(runLoop);
        return;
      }

      lastTimestampRef.current = timestampMs;

      const results = fl.detectForVideo(video, timestampMs);

      if (results?.faceLandmarks?.length) {
        lastLandmarksRef.current = results.faceLandmarks;
        drawStickers(ctx, results.faceLandmarks, w, h, true);
      } else {
        lastLandmarksRef.current = null;
      }
    } catch (e: any) {
      console.error("[useARSticker] detect error:", e);
    }

    animFrameRef.current = requestAnimationFrame(runLoop);
  }, [videoRef, overlayRef, drawStickers]);

  // ── Start / stop ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (enabled && arReady) {
      lastTimestampRef.current = -1;
      frameCountRef.current = 0;
      lastLandmarksRef.current = null;

      animFrameRef.current = requestAnimationFrame(runLoop);
    } else {
      cancelAnimationFrame(animFrameRef.current);

      const canvas = overlayRef.current;
      if (canvas) {
        canvas
          .getContext("2d")
          ?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [enabled, arReady, runLoop, overlayRef]);

  // ── Composite (for snapshots) ───────────────────────────────────────────────

  const compositeToCanvas = useCallback(
    (targetCanvas: HTMLCanvasElement) => {
      const landmarks = lastLandmarksRef.current;
      if (!landmarks?.length) return;

      const ctx = targetCanvas.getContext("2d");
      if (!ctx) return;

      drawStickers(
        ctx,
        landmarks,
        targetCanvas.width,
        targetCanvas.height,
        true
      );
    },
    [drawStickers]
  );

  return { arReady, arError, compositeToCanvas };
}