// @ts-expect-error - gifenc has no TS declaration
import { GIFEncoder, quantize, applyPalette } from "gifenc";

/**
 * frameComposer.ts
 *
 * Canvas-based utilities for:
 * 1. Detecting and removing chroma key (green screen) from a frame image
 * 2. Compositing a captured photo with a custom frame
 * 3. Compositing multiple photos + frame for strip mode
 */

// ─── Chroma Key Detection ────────────────────────────────────────────────────

/**
 * Converts RGB (0-255) to HSL (H: 0-360, S: 0-1, L: 0-1).
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return [h * 360, s, l];
}

/**
 * Returns true if a pixel is within the chroma key (green screen) range.
 * Uses HSL-based detection — more reliable than raw RGB comparison.
 * Green zone: Hue 85°–165°, Saturation > 35%, Lightness 15%–85%
 */
function isChromaKey(r: number, g: number, b: number, a: number): boolean {
  if (a < 10) return false; // transparent pixels are not chroma key
  const [h, s, l] = rgbToHsl(r, g, b);
  return h >= 85 && h <= 165 && s >= 0.35 && l >= 0.15 && l <= 0.85;
}

// ─── Image Loader ─────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Main Compositor ─────────────────────────────────────────────────────────

export interface ComposeOptions {
  /** The captured photo data URL */
  photoDataUrl: string;
  /** The frame image data URL (PNG with transparent or green screen zone) */
  frameDataUrl: string;
  /** If true, use chroma key removal on the frame */
  hasChromaKey: boolean;
  /** Output width in pixels (height will be derived from photo aspect ratio) */
  outputWidth?: number;
}

/**
 * Composites a photo with a frame.
 * - Transparent frame: photo is drawn behind the frame (PNG alpha compositing)
 * - Chroma key frame: green pixels in the frame are replaced by the photo
 *
 * Returns a JPEG data URL of the composited result.
 */
export async function composeWithFrame(
  options: ComposeOptions
): Promise<string> {
  const { photoDataUrl, frameDataUrl, hasChromaKey, outputWidth = 1280 } =
    options;

  const [photoImg, frameImg] = await Promise.all([
    loadImage(photoDataUrl),
    loadImage(frameDataUrl),
  ]);

  // Use photo's natural aspect ratio
  const aspectRatio = photoImg.naturalHeight / photoImg.naturalWidth;
  const canvasW = outputWidth;
  const canvasH = Math.round(outputWidth * aspectRatio);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  if (hasChromaKey) {
    // ── Chroma Key Mode ──────────────────────────────────────────────────────
    // 1. Draw photo as base layer
    ctx.drawImage(photoImg, 0, 0, canvasW, canvasH);

    // 2. Draw frame onto a temp canvas to read its pixels
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = canvasW;
    frameCanvas.height = canvasH;
    const frameCtx = frameCanvas.getContext("2d", { willReadFrequently: true });
    if (!frameCtx) throw new Error("Frame canvas context unavailable");
    frameCtx.drawImage(frameImg, 0, 0, canvasW, canvasH);

    const frameData = frameCtx.getImageData(0, 0, canvasW, canvasH);
    const { data, width, height } = frameData;

    // 3. Build a mask: non-chroma-key pixels will be drawn on top of photo
    const outputData = ctx.getImageData(0, 0, canvasW, canvasH);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (!isChromaKey(r, g, b, a)) {
          // Frame pixel is NOT chroma key → paint it over the photo
          outputData.data[idx] = r;
          outputData.data[idx + 1] = g;
          outputData.data[idx + 2] = b;
          outputData.data[idx + 3] = a;
        }
        // Chroma key pixel → keep the photo pixel (already in outputData)
      }
    }

    ctx.putImageData(outputData, 0, 0);
  } else {
    // ── Transparent PNG Mode ─────────────────────────────────────────────────
    // Photo behind, frame PNG on top (alpha compositing handles transparency)
    ctx.drawImage(photoImg, 0, 0, canvasW, canvasH);
    ctx.drawImage(frameImg, 0, 0, canvasW, canvasH);
  }

  return canvas.toDataURL("image/jpeg", 0.93);
}

// ─── Strip Composer (with layout-aware themed framing) ──────────────────────────

interface StripOptions {
  /** Captured photos (can be raw or pre-composited) */
  photos: string[];
  photoWidth?: number;
  gap?: number;
  padding?: number;
  backgroundColor?: string;
  label?: string;
  orientation?: "portrait" | "landscape";
  frameId?: string;
}

export async function composePhotoStrip(
  options: StripOptions
): Promise<string> {
  const {
    photos,
    photoWidth = 600,
    gap = 16,
    padding = 24,
    backgroundColor = "#0A0A0F",
    label,
    orientation = "portrait",
    frameId = "none",
  } = options;

  if (photos.length === 0) throw new Error("No photos to compose");

  const images = await Promise.all(photos.map(loadImage));

  const isPortrait = orientation === "portrait";
  const N = photos.length;

  const stripWidth = isPortrait ? 900 : 1600;
  const stripHeight = isPortrait ? 1600 : 900;

  const activePadding = isPortrait ? 28 : 30;
  const activeGap = isPortrait ? 10 : 16;
  const activeLabelHeight = label ? (isPortrait ? 36 : 60) : 0;

  let cols = 1;
  let rows = N;
  let maxPhotoW = 0;

  for (let c = 1; c <= N; c++) {
    const r = Math.ceil(N / c);

    // Enforce orientation alignment constraints
    if (isPortrait && r < c) continue;
    if (!isPortrait && c < r) continue;

    const availableW = stripWidth - activePadding * 2 - (c - 1) * activeGap;
    const availableH = stripHeight - activePadding * 2 - (r - 1) * activeGap - activeLabelHeight;
    if (availableW <= 0 || availableH <= 0) continue;

    const maxWFromWidth = availableW / c;
    const maxWFromHeight = availableH / (r * 9 / 16);
    const photoW = Math.min(maxWFromWidth, maxWFromHeight);

    if (photoW > maxPhotoW) {
      maxPhotoW = photoW;
      cols = c;
      rows = r;
    }
  }

  const finalPhotoW = maxPhotoW;
  const finalPhotoH = finalPhotoW * 9 / 16;

  const gridW = cols * finalPhotoW + (cols - 1) * activeGap;
  const gridH = rows * finalPhotoH + (rows - 1) * activeGap;

  const maxGridW = stripWidth - activePadding * 2;
  const maxGridH = stripHeight - activePadding * 2 - activeLabelHeight;

  const startX = activePadding + (maxGridW - gridW) / 2;
  const startY = activePadding + (maxGridH - gridH) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = stripWidth;
  canvas.height = stripHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  // Helper function to draw borders
  const drawBorderLines = (color: string, inset: number, lineWidth: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(inset, inset, stripWidth - inset * 2, stripHeight - inset * 2);
  };

  // Helper function for corner decorations
  const drawCornerDecorations = (symbol: string, size: number, color: string) => {
    const activeLabelH = label ? 30 : 0;
    const corners = [
      [activePadding / 2 + 8, activePadding / 2 + 8],
      [stripWidth - activePadding / 2 - 8, activePadding / 2 + 8],
      [activePadding / 2 + 8, stripHeight - activePadding / 2 - activeLabelH],
      [stripWidth - activePadding / 2 - 8, stripHeight - activePadding / 2 - activeLabelH],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = `bold ${size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(symbol, cx, cy);
      ctx.restore();
    });
  };

  // 1. Draw themed background & border base
  switch (frameId) {
    case "rose-gold": {
      const g = ctx.createLinearGradient(0, 0, stripWidth, stripHeight);
      g.addColorStop(0, "#F4C2C2");
      g.addColorStop(0.5, "#FFB6C1");
      g.addColorStop(1, "#F4C2C2");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, stripWidth, stripHeight);
      drawBorderLines("#C8A96E", 8, 2);
      drawCornerDecorations("♥", 20, "#E8608A");
      break;
    }
    case "sweet-hearts": {
      ctx.fillStyle = "#FFF5F7";
      ctx.fillRect(0, 0, stripWidth, stripHeight);
      drawBorderLines("#FFB6C1", 8, 2);
      drawCornerDecorations("♥", 20, "#FF6B8A");
      break;
    }
    case "cherry-blossom": {
      const g = ctx.createLinearGradient(0, 0, stripWidth, stripHeight);
      g.addColorStop(0, "#FFD6E7");
      g.addColorStop(0.5, "#FFAECB");
      g.addColorStop(1, "#FFD6E7");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, stripWidth, stripHeight);
      drawBorderLines("rgba(255,255,255,0.9)", 8, 3);
      drawCornerDecorations("✿", 22, "#FF6B9D");
      break;
    }
    case "vintage-lace": {
      ctx.fillStyle = "#5C0A2E";
      ctx.fillRect(0, 0, stripWidth, stripHeight);
      drawBorderLines("#C8A96E", 8, 2);
      drawBorderLines("#A08050", 12, 1);
      drawCornerDecorations("◆", 16, "#C8A96E");
      break;
    }
    case "starlight": {
      ctx.fillStyle = "#0D1B2A";
      ctx.fillRect(0, 0, stripWidth, stripHeight);
      drawBorderLines("#C8A96E", 8, 1.5);
      drawCornerDecorations("★", 20, "#C8A96E");
      break;
    }
    case "love-letter": {
      const g = ctx.createLinearGradient(0, 0, stripWidth, stripHeight);
      g.addColorStop(0, "#F5E6D3");
      g.addColorStop(1, "#EDD9B8");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, stripWidth, stripHeight);
      drawBorderLines("#8B4513", 8, 1.5);
      drawCornerDecorations("♥", 18, "#8B1A1A");
      break;
    }
    case "retro-film": {
      ctx.fillStyle = "#1A1A26";
      ctx.fillRect(0, 0, stripWidth, stripHeight);

      // Sprockets
      ctx.fillStyle = "#0A0A0F";
      if (isPortrait) {
        const sprocketW = 12;
        const sprocketH = 18;
        const sprocketCount = Math.floor(stripHeight / 40);
        for (let j = 0; j < sprocketCount; j++) {
          const sy = 16 + j * 40;
          ctx.fillRect(10, sy, sprocketW, sprocketH);
          ctx.fillRect(stripWidth - 22, sy, sprocketW, sprocketH);
        }
      } else {
        const sprocketW = 18;
        const sprocketH = 12;
        const sprocketCount = Math.floor(stripWidth / 40);
        for (let j = 0; j < sprocketCount; j++) {
          const sx = 16 + j * 40;
          ctx.fillRect(sx, 10, sprocketW, sprocketH);
          ctx.fillRect(sx, stripHeight - 22, sprocketW, sprocketH);
        }
      }
      drawBorderLines("#C8A96E30", 28, 1);
      break;
    }
    case "polaroid": {
      ctx.fillStyle = "#F5EDD8";
      ctx.fillRect(0, 0, stripWidth, stripHeight);
      break;
    }
    case "golden-moment": {
      ctx.fillStyle = "#0A0A0F";
      ctx.fillRect(0, 0, stripWidth, stripHeight);
      drawBorderLines("#C8A96E", 4, 6);
      drawBorderLines("#C8A96E", 14, 2);
      drawCornerDecorations("◆", 18, "#C8A96E");
      break;
    }
    case "floral-romance": {
      ctx.fillStyle = "#1A3A2A";
      ctx.fillRect(0, 0, stripWidth, stripHeight);
      drawBorderLines("#C8A96E60", 8, 1);
      drawCornerDecorations("❀", 20, "#E8608A");
      break;
    }
    default: {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, stripWidth, stripHeight);
      drawBorderLines("#C8A96E40", 0.5, 1);
      break;
    }
  }

  // 2. Draw Photos
  images.forEach((img, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Center the last row if it's incomplete
    const isLastRow = row === rows - 1;
    const remainingInLastRow = photos.length - row * cols;
    const colsInThisRow = isLastRow ? remainingInLastRow : cols;

    let x = 0;
    if (isLastRow && colsInThisRow < cols) {
      const lastRowW = colsInThisRow * finalPhotoW + (colsInThisRow - 1) * activeGap;
      const startXForLastRow = startX + (gridW - lastRowW) / 2;
      x = startXForLastRow + col * (finalPhotoW + activeGap);
    } else {
      x = startX + col * (finalPhotoW + activeGap);
    }

    const y = startY + row * (finalPhotoH + activeGap);

    // Draw individual white background for polaroid style slots
    if (frameId === "polaroid") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x - 4, y - 4, finalPhotoW + 8, finalPhotoH + 8);
    }

    // Source center crop calculation to fit raw image into 16:9 slot
    const targetRatio = 9 / 16;
    const imgRatio = img.naturalHeight / img.naturalWidth;
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

    if (imgRatio > targetRatio) {
      // Source image is taller than 16:9 target -> crop top and bottom
      sh = img.naturalWidth * targetRatio;
      sy = (img.naturalHeight - sh) / 2;
    } else {
      // Source image is wider than 16:9 target -> crop left and right
      sw = img.naturalHeight / targetRatio;
      sx = (img.naturalWidth - sw) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, finalPhotoW, finalPhotoH);

    // Subtle bottom gradient per photo (shadow)
    const gradient = ctx.createLinearGradient(
      x,
      y + finalPhotoH - 24,
      x,
      y + finalPhotoH
    );
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y + finalPhotoH - 24, finalPhotoW, 24);

    // Subtle slot borders inside themed frames
    if (frameId !== "none" && frameId !== "polaroid") {
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, finalPhotoW, finalPhotoH);
    }
  });

  // 3. Draw Label
  if (label) {
    const isDarkBg =
      frameId === "none" ||
      frameId === "vintage-lace" ||
      frameId === "starlight" ||
      frameId === "retro-film" ||
      frameId === "golden-moment" ||
      frameId === "floral-romance";

    ctx.fillStyle = isDarkBg ? "#C8A96E" : "#5C0A2E";
    const labelFontSize = isPortrait ? 20 : 32;
    ctx.font = `bold ${labelFontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.letterSpacing = isPortrait ? "4px" : "8px";
    
    const labelY = stripHeight - activePadding - (activeLabelHeight - labelFontSize) / 2;
    ctx.fillText(label.toUpperCase(), stripWidth / 2, labelY);

    if (frameId === "polaroid") {
      ctx.fillStyle = "#2A2A3E80";
      const polaroidFontSize = isPortrait ? 16 : 24;
      ctx.font = `italic ${polaroidFontSize}px Georgia, serif`;
      ctx.fillText("George ♥ Nadia", stripWidth / 2, labelY - (isPortrait ? 24 : 36));
    }
  }
  return canvas.toDataURL("image/jpeg", 0.92);
}

// ─── Download & Filename ──────────────────────────────────────────────────────

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateFilename(
  prefix: string,
  ext: string = "jpg"
): string {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  return `${prefix}_${ts}.${ext}`;
}

/**
 * Removes chroma key (green screen) pixels from an image and returns a transparent PNG data URL.
 */
export async function removeChromaKey(imageUrl: string): Promise<string> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageUrl;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imgData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (isChromaKey(r, g, b, a)) {
      data[i + 3] = 0; // Set alpha to 0 (fully transparent)
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Auto-detects whether a PNG image contains chroma key (green screen) pixels
 * or transparent pixels where photos can be placed.
 */
export async function analyzeFrameUpload(imageUrl: string): Promise<{ hasChromaKey: boolean; hasTransparency: boolean }> {
  const img = await loadImage(imageUrl);
  const SAMPLE_SIZE = 500;

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { hasChromaKey: false, hasTransparency: false };

  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );

  let greenCount = 0;
  let transCount = 0;
  for (let i = 0; i < SAMPLE_SIZE; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const idx = (y * width + x) * 4;
    const a = data[idx + 3];
    
    if (a < 10) {
      transCount++;
    } else if (isChromaKey(data[idx], data[idx + 1], data[idx + 2], a)) {
      greenCount++;
    }
  }

  // If >5% of sampled pixels are chroma key or transparent → frame has space
  return {
    hasChromaKey: greenCount / SAMPLE_SIZE > 0.05,
    hasTransparency: transCount / SAMPLE_SIZE > 0.05,
  };
}

/**
 * Generates a looping slideshow WebM video of captured photos client-side.
 * It loads all image URLs, determines standard dimensions, and records
 * a looping sequence to a WebM video blob URL.
 */
export async function generateSlideshowVideo(
  photos: string[]
): Promise<string> {
  if (photos.length === 0) throw new Error("No photos to record");

  const images = await Promise.all(photos.map(loadImage));
  const firstImg = images[0];
  const canvasW = 960;
  const canvasH = 720;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get video canvas context");

  // Capture stream at 25 FPS
  const stream = canvas.captureStream(25);

  let options = { mimeType: "video/webm;codecs=vp9" };
  if (typeof MediaRecorder !== "undefined") {
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm;codecs=vp8" };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm" };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "" };
    }
  }

  const recorder = new MediaRecorder(stream, options);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const recordingPromise = new Promise<string>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      resolve(URL.createObjectURL(blob));
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start();

  const slideDurationMs = 1200; // Duration per photo in ms
  const totalDuration = images.length * slideDurationMs;
  let active = true;
  const startTime = performance.now();

  const drawFrame = (nowTime: number) => {
    if (!active) return;
    const elapsed = nowTime - startTime;
    if (elapsed >= totalDuration) {
      active = false;
      recorder.stop();
      return;
    }

    const frameIdx = Math.floor(elapsed / slideDurationMs);
    const img = images[frameIdx % images.length];

    ctx.fillStyle = "#0A0A0F";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw photo centered maintaining aspect ratio
    const imgRatio = img.naturalHeight / img.naturalWidth;
    let drawW = canvasW;
    let drawH = canvasW * imgRatio;

    if (drawH > canvasH) {
      drawH = canvasH;
      drawW = canvasH / imgRatio;
    }

    const x = (canvasW - drawW) / 2;
    const y = (canvasH - drawH) / 2;

    ctx.drawImage(img, x, y, drawW, drawH);

    requestAnimationFrame(drawFrame);
  };

  requestAnimationFrame(drawFrame);
  return recordingPromise;
}

/**
 * Generates a looping animated GIF from a sequence of pre-composited photos client-side.
 */
export async function generateSlideshowGif(
  photos: string[]
): Promise<string> {
  if (photos.length === 0) throw new Error("No photos to encode");

  const images = await Promise.all(photos.map(loadImage));
  const firstImg = images[0];
  
  // Set GIF dimensions (downscaled for performance and file size)
  const canvasW = 640;
  const canvasH = Math.round(640 * (firstImg.naturalHeight / firstImg.naturalWidth));

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get GIF canvas context");

  const gif = GIFEncoder();

  for (const img of images) {
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, 0, 0, canvasW, canvasH);

    const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
    const format = "rgb565";
    const palette = quantize(imgData.data, 256, { format });
    const index = applyPalette(imgData.data, palette, format);
    gif.writeFrame(index, canvasW, canvasH, { palette, delay: 1000 }); // 1-second delay per frame
  }

  gif.finish();
  const buffer = gif.bytes();
  const blob = new Blob([buffer], { type: "image/gif" });
  return URL.createObjectURL(blob);
}

