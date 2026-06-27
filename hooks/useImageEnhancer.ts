// hooks/useImageEnhancer.ts
"use client";

import { useState, useCallback, useRef } from "react";

export type EnhanceStatus =
  | "idle"
  | "loading-model"
  | "enhancing"
  | "done"
  | "error";

export interface EnhanceResult {
  originalDataUrl: string;
  enhancedDataUrl: string;
}

/**
 * useImageEnhancer
 *
 * Runs Real-ESRGAN (4× super-resolution) in the browser via UpscalerJS + TF.js.
 * The model is lazy-loaded on first use and cached for the lifetime of the component.
 *
 * Usage:
 *   const { enhance, status, progress } = useImageEnhancer();
 *   const result = await enhance(blob); // returns { originalDataUrl, enhancedDataUrl }
 */
export function useImageEnhancer() {
  const upscalerRef = useRef<any>(null);
  const [status, setStatus] = useState<EnhanceStatus>("idle");
  const [progress, setProgress] = useState(0); // 0–100

  const loadModel = useCallback(async () => {
    if (upscalerRef.current) return; // already loaded

    setStatus("loading-model");
    setProgress(0);

    // Dynamically import so these heavy libs don't block initial page load
   const [{ default: Upscaler }, { default: esrganModel }] = await Promise.all([
  import("upscaler"),
  import("@upscalerjs/esrgan-thick/4x"),
]);

upscalerRef.current = new Upscaler({
  model: esrganModel,
});

    // Warm up the model with a tiny tensor so first real inference is faster
    await upscalerRef.current.warmup([{ patchSize: 64, padding: 2 }]);
  }, []);

  /**
   * enhance(source)
   *
   * source can be:
   *   - Blob / File  (from camera capture)
   *   - string       (data URL or object URL)
   *   - HTMLImageElement
   *   - HTMLCanvasElement
   *
   * Returns { originalDataUrl, enhancedDataUrl } on success, throws on failure.
   */
  const enhance = useCallback(
    async (
      source: Blob | string | HTMLImageElement | HTMLCanvasElement
    ): Promise<EnhanceResult> => {
      try {
        await loadModel();

        // Convert Blob → data URL if needed
        let originalDataUrl: string;
        if (source instanceof Blob) {
          originalDataUrl = await blobToDataUrl(source);
        } else if (typeof source === "string") {
          originalDataUrl = source;
        } else if (source instanceof HTMLCanvasElement) {
          originalDataUrl = source.toDataURL("image/jpeg", 0.92);
        } else {
          // HTMLImageElement
          const canvas = document.createElement("canvas");
          canvas.width = source.naturalWidth;
          canvas.height = source.naturalHeight;
          canvas.getContext("2d")!.drawImage(source, 0, 0);
          originalDataUrl = canvas.toDataURL("image/jpeg", 0.92);
        }

        setStatus("enhancing");
        setProgress(10);

        // Load into an Image element for UpscalerJS
        const img = await dataUrlToImage(originalDataUrl);

        setProgress(30);

        // Run ESRGAN upscaling — UpscalerJS returns a data URL by default
        const enhancedDataUrl: string = await upscalerRef.current.upscale(img, {
          output: "base64",
          // Patch-based processing prevents OOM on mobile/low-VRAM devices
          patchSize: 64,
          padding: 2,
          progress: (pct: number) => {
            // pct is 0–1
            setProgress(30 + Math.round(pct * 65));
          },
        });

        setProgress(100);
        setStatus("done");

        return { originalDataUrl, enhancedDataUrl };
      } catch (err) {
        console.error("[useImageEnhancer] error:", err);
        setStatus("error");
        throw err;
      }
    },
    [loadModel]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
  }, []);

  return { enhance, status, progress, reset };
}

/* ── helpers ── */

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}