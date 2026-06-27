// lib/enhanceImage.ts

export async function enhanceImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      imageData = autoLevels(imageData);
      imageData = shadowLift(imageData);
      imageData = boostSaturation(imageData, 1.25);
      imageData = applyContrast(imageData, 1.15);
      imageData = warmSkinTones(imageData);

      ctx.putImageData(imageData, 0, 0);

      unsharpMask(ctx, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/jpeg", 0.97));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ── Auto Levels: stretches each channel to full 0-255 range ──
function autoLevels(imageData: ImageData): ImageData {
  const d = imageData.data;
  let minR = 255, maxR = 0;
  let minG = 255, maxG = 0;
  let minB = 255, maxB = 0;

  for (let i = 0; i < d.length; i += 4) {
    minR = Math.min(minR, d[i]);     maxR = Math.max(maxR, d[i]);
    minG = Math.min(minG, d[i + 1]); maxG = Math.max(maxG, d[i + 1]);
    minB = Math.min(minB, d[i + 2]); maxB = Math.max(maxB, d[i + 2]);
  }

  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(((d[i]     - minR) / (maxR - minR || 1)) * 255);
    d[i + 1] = clamp(((d[i + 1] - minG) / (maxG - minG || 1)) * 255);
    d[i + 2] = clamp(((d[i + 2] - minB) / (maxB - minB || 1)) * 255);
  }
  return imageData;
}

// ── Shadow Lift: brightens dark pixels without blowing highlights ──
function shadowLift(imageData: ImageData): ImageData {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = d[i + c];
      // Lift shadows (pixels below 128) using a curve
      if (v < 128) {
        d[i + c] = clamp(v + (128 - v) * 0.18);
      }
    }
  }
  return imageData;
}

// ── Saturation Boost ──
function boostSaturation(imageData: ImageData, factor: number): ImageData {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const avg = (r + g + b) / 3;
    d[i]     = clamp(avg + factor * (r - avg));
    d[i + 1] = clamp(avg + factor * (g - avg));
    d[i + 2] = clamp(avg + factor * (b - avg));
  }
  return imageData;
}

// ── Contrast via S-curve ──
function applyContrast(imageData: ImageData, factor: number): ImageData {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      d[i + c] = clamp(factor * (d[i + c] - 128) + 128);
    }
  }
  return imageData;
}

// ── Warm Skin Tones: slight red/yellow push ──
function warmSkinTones(imageData: ImageData): ImageData {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    // Only affect pixels that look skin-like
    if (r > 100 && g > 60 && b > 40 && r > g && g > b) {
      d[i]     = clamp(r + 8);   // push red
      d[i + 1] = clamp(g + 4);   // push yellow
      d[i + 2] = clamp(b - 4);   // reduce blue cast
    }
  }
  return imageData;
}

// ── Unsharp Mask: professional sharpening ──
function unsharpMask(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const original = ctx.getImageData(0, 0, w, h);

  // Create blurred version
  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = w; blurCanvas.height = h;
  const blurCtx = blurCanvas.getContext("2d")!;
  blurCtx.filter = "blur(1.5px)";
  blurCtx.drawImage(ctx.canvas, 0, 0);

  const blurred = blurCtx.getImageData(0, 0, w, h);
  const src = original.data;
  const blr = blurred.data;
  const out = ctx.createImageData(w, h);
  const dst = out.data;

  const amount = 0.6; // sharpening strength

  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = src[i + c] - blr[i + c];
      dst[i + c] = clamp(src[i + c] + amount * diff);
    }
    dst[i + 3] = src[i + 3];
  }

  ctx.putImageData(out, 0, 0);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}