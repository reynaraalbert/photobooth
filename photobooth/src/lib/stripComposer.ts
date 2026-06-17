/**
 * Composes multiple photo data URLs into a single vertical photo strip.
 * Uses the Canvas API — no external dependencies needed.
 */

interface StripOptions {
  photos: string[];
  /** Width of each individual photo cell in the strip */
  photoWidth?: number;
  /** Gap between photos */
  gap?: number;
  /** Padding around the entire strip */
  padding?: number;
  /** Background color of the strip */
  backgroundColor?: string;
  /** Label at bottom of strip */
  label?: string;
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
  } = options;

  if (photos.length === 0) throw new Error("No photos to compose");

  // Load all images and get natural dimensions
  const images = await Promise.all(
    photos.map(
      (src) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        })
    )
  );

  // Calculate cell height based on aspect ratio of first image
  const firstImg = images[0];
  const aspectRatio = firstImg.naturalHeight / firstImg.naturalWidth;
  const photoHeight = Math.round(photoWidth * aspectRatio);

  const labelHeight = label ? 40 : 0;
  const stripWidth = photoWidth + padding * 2;
  const stripHeight =
    padding * 2 +
    photos.length * photoHeight +
    (photos.length - 1) * gap +
    labelHeight;

  const canvas = document.createElement("canvas");
  canvas.width = stripWidth;
  canvas.height = stripHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, stripWidth, stripHeight);

  // Thin gold border
  ctx.strokeStyle = "#C8A96E40";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, stripWidth - 1, stripHeight - 1);

  // Draw each photo
  images.forEach((img, i) => {
    const x = padding;
    const y = padding + i * (photoHeight + gap);
    ctx.drawImage(img, x, y, photoWidth, photoHeight);

    // Subtle inner shadow at bottom of each photo
    const gradient = ctx.createLinearGradient(x, y + photoHeight - 20, x, y + photoHeight);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y + photoHeight - 20, photoWidth, 20);
  });

  // Label at bottom
  if (label) {
    ctx.fillStyle = "#C8A96E";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.letterSpacing = "3px";
    ctx.fillText(
      label.toUpperCase(),
      stripWidth / 2,
      stripHeight - padding / 2
    );
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Triggers a browser download of a data URL
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a timestamped filename
 */
export function generateFilename(prefix: string, ext: string = "jpg"): string {
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
