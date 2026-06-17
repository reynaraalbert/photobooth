"use client";

import { useCallback, useRef, useState } from "react";
import type { PhotoFrame } from "@/types/photobooth";
import { analyzeFrameUpload, removeChromaKey } from "@/lib/frameComposer";
import {
  Ban,
  Flower2,
  Heart,
  Flower,
  Crown,
  Sparkles,
  Mail,
  Film,
  Camera,
  Award,
  Upload,
} from "lucide-react";

export function getFrameIcon(id: string, className = "w-4 h-4") {
  switch (id) {
    case "none":
      return <Ban className={className} />;
    case "rose-gold":
      return <Flower2 className={className} />;
    case "sweet-hearts":
      return <Heart className={className} />;
    case "cherry-blossom":
      return <Flower className={className} />;
    case "vintage-lace":
      return <Crown className={className} />;
    case "starlight":
      return <Sparkles className={className} />;
    case "love-letter":
      return <Mail className={className} />;
    case "retro-film":
      return <Film className={className} />;
    case "polaroid":
      return <Camera className={className} />;
    case "golden-moment":
      return <Award className={className} />;
    case "floral-romance":
      return <Flower2 className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

interface FrameSelectorProps {
  customFrames: PhotoFrame[];
  onAddCustomFrame: (frame: PhotoFrame) => void;
  onDeleteCustomFrame: (id: string) => void;
  onSelectFrame: (frame: PhotoFrame | null) => void;
  onBack: () => void;
}

// ─── Canvas Frame Generator ───────────────────────────────────────────────────

export function makeFrame(id: string, w = 800, h = 450): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);

  const B = 48; // border thickness

  const txt = (
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    font = "serif"
  ) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  const fillBorder = (color: string | CanvasGradient) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, B);
    ctx.fillRect(0, h - B, w, B);
    ctx.fillRect(0, B, B, h - 2 * B);
    ctx.fillRect(w - B, B, B, h - 2 * B);
  };

  const innerLine = (color: string, inset: number, lw: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  };

  switch (id) {
    /* ── 1. Rose Gold ─────────────────────────────────── */
    case "rose-gold": {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#F4C2C2");
      g.addColorStop(0.5, "#FFB6C1");
      g.addColorStop(1, "#F4C2C2");
      fillBorder(g);
      innerLine("#C8A96E", B - 6, 2);

      const corners = [
        [B / 2, B / 2], [w - B / 2, B / 2],
        [B / 2, h - B / 2], [w - B / 2, h - B / 2],
      ] as [number, number][];
      corners.forEach(([x, y]) => txt("♥", x, y, 26, "#E8608A"));

      for (let i = 1; i <= 7; i++) {
        const x = (w / 8) * i;
        txt("♥", x, B / 2, 14, "#F08AAA");
        txt("♥", x, h - B / 2, 14, "#F08AAA");
      }
      for (let i = 1; i <= 4; i++) {
        const y = (h / 5) * i;
        txt("♥", B / 2, y, 12, "#F08AAA");
        txt("♥", w - B / 2, y, 12, "#F08AAA");
      }
      break;
    }

    /* ── 2. Sweet Hearts ──────────────────────────────── */
    case "sweet-hearts": {
      fillBorder("#FFF5F7");
      innerLine("#FFB6C1", B - 8, 2);

      const hearts = [
        { x: 24, y: 24, s: 22, c: "#FF6B8A" },
        { x: 70, y: B / 2, s: 14, c: "#FFB6C1" },
        { x: 150, y: 18, s: 18, c: "#E8608A" },
        { x: 250, y: B / 2, s: 12, c: "#FF9DAE" },
        { x: 350, y: 14, s: 22, c: "#FF6B8A" },
        { x: 450, y: B / 2, s: 14, c: "#FFB6C1" },
        { x: 550, y: 20, s: 18, c: "#E8608A" },
        { x: 650, y: B / 2, s: 12, c: "#FF9DAE" },
        { x: 730, y: 24, s: 20, c: "#FF6B8A" },
        { x: 24, y: h - 24, s: 22, c: "#FF6B8A" },
        { x: 120, y: h - B / 2, s: 16, c: "#FFB6C1" },
        { x: 250, y: h - 18, s: 18, c: "#E8608A" },
        { x: 400, y: h - B / 2, s: 14, c: "#FF9DAE" },
        { x: 550, y: h - 20, s: 20, c: "#FF6B8A" },
        { x: 700, y: h - B / 2, s: 16, c: "#FFB6C1" },
        { x: B / 2, y: 140, s: 16, c: "#E8608A" },
        { x: B / 2, y: 240, s: 12, c: "#FF9DAE" },
        { x: B / 2, y: 350, s: 18, c: "#FF6B8A" },
        { x: B / 2, y: 450, s: 12, c: "#FFB6C1" },
        { x: w - B / 2, y: 130, s: 14, c: "#E8608A" },
        { x: w - B / 2, y: 240, s: 18, c: "#FF9DAE" },
        { x: w - B / 2, y: 360, s: 14, c: "#FF6B8A" },
        { x: w - B / 2, y: 470, s: 12, c: "#FFB6C1" },
      ];
      hearts.forEach(({ x, y, s, c }) => txt("♥", x, y, s, c));
      break;
    }

    /* ── 3. Cherry Blossom ────────────────────────────── */
    case "cherry-blossom": {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#FFD6E7");
      g.addColorStop(0.5, "#FFAECB");
      g.addColorStop(1, "#FFD6E7");
      fillBorder(g);
      innerLine("rgba(255,255,255,0.9)", B - 8, 3);

      const corners2 = [
        [B / 2, B / 2], [w - B / 2, B / 2],
        [B / 2, h - B / 2], [w - B / 2, h - B / 2],
      ] as [number, number][];
      corners2.forEach(([x, y]) => txt("✿", x, y, 32, "#FF6B9D"));

      [160, 320, 480, 640].forEach((x) => {
        txt("✿", x, B / 2, 18, "#FF9DC3");
        txt("✿", x, h - B / 2, 18, "#FF9DC3");
      });
      [150, 300, 450].forEach((y) => {
        txt("✿", B / 2, y, 16, "#FF9DC3");
        txt("✿", w - B / 2, y, 16, "#FF9DC3");
      });
      break;
    }

    /* ── 4. Vintage Lace ──────────────────────────────── */
    case "vintage-lace": {
      fillBorder("#5C0A2E");
      innerLine("#C8A96E", B - 6, 2);
      innerLine("#A08050", B - 11, 0.8);

      [[B / 2, B / 2], [w - B / 2, B / 2], [B / 2, h - B / 2], [w - B / 2, h - B / 2]].forEach(
        ([cx, cy]) => {
          ctx.fillStyle = "#C8A96E";
          ctx.beginPath();
          ctx.moveTo(cx, cy - 16);
          ctx.lineTo(cx + 16, cy);
          ctx.lineTo(cx, cy + 16);
          ctx.lineTo(cx - 16, cy);
          ctx.closePath();
          ctx.fill();
        }
      );

      ctx.fillStyle = "#C8A96E60";
      for (let i = 0; i < 10; i++) {
        const x = (w / 11) * (i + 1);
        ctx.beginPath(); ctx.arc(x, B / 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, h - B / 2, 3, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < 6; i++) {
        const y = (h / 7) * (i + 1);
        ctx.beginPath(); ctx.arc(B / 2, y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w - B / 2, y, 3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }

    /* ── 5. Starlight ─────────────────────────────────── */
    case "starlight": {
      fillBorder("#0D1B2A");
      innerLine("#C8A96E", B - 6, 1.5);

      const stars = [
        { x: B / 2, y: B / 2, s: 24 }, { x: w - B / 2, y: B / 2, s: 24 },
        { x: B / 2, y: h - B / 2, s: 24 }, { x: w - B / 2, y: h - B / 2, s: 24 },
        { x: 180, y: B / 2, s: 16 }, { x: 380, y: 12, s: 20 }, { x: 580, y: B / 2, s: 16 },
        { x: 180, y: h - B / 2, s: 16 }, { x: 380, y: h - 12, s: 20 }, { x: 580, y: h - B / 2, s: 16 },
        { x: B / 2, y: 180, s: 14 }, { x: B / 2, y: 380, s: 14 },
        { x: w - B / 2, y: 180, s: 14 }, { x: w - B / 2, y: 380, s: 14 },
      ];
      stars.forEach(({ x, y, s }) => txt("★", x, y, s, "#C8A96E"));

      ctx.fillStyle = "#C8A96E50";
      [[80, 10], [220, 22], [420, 8], [620, 18], [720, 12],
        [80, h - 10], [280, h - 8], [460, h - 22], [640, h - 10],
        [10, 110], [14, 290], [8, 470],
        [w - 12, 150], [w - 8, 330], [w - 14, 500]
      ].forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      });
      break;
    }

    /* ── 6. Love Letter ───────────────────────────────── */
    case "love-letter": {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#F5E6D3");
      g.addColorStop(1, "#EDD9B8");
      fillBorder(g);
      innerLine("#8B4513", B - 5, 1.5);
      innerLine("#8B451370", B - 9, 0.8);

      [[B / 2, B / 2], [w - B / 2, B / 2], [B / 2, h - B / 2], [w - B / 2, h - B / 2]].forEach(
        ([cx, cy]) => {
          ctx.fillStyle = "#8B1A1A";
          ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
          txt("♥", cx, cy, 14, "#C8A96E");
        }
      );

      for (let i = 1; i < 9; i++) {
        const x = (w / 9) * i;
        txt("·", x, B / 2, 16, "#8B4513");
        txt("·", x, h - B / 2, 16, "#8B4513");
      }
      break;
    }

    /* ── 7. Retro Film ────────────────────────────────── */
    case "retro-film": {
      ctx.fillStyle = "#1A1A26";
      ctx.fillRect(0, 0, w, B);
      ctx.fillRect(0, h - B, w, B);

      const hCount = 10;
      const hW = 26;
      const hH = 16;
      const hGap = (w - hCount * hW) / (hCount + 1);
      for (let i = 0; i < hCount; i++) {
        const hx = hGap + i * (hW + hGap);
        ctx.clearRect(hx, (B - hH) / 2, hW, hH);
        ctx.clearRect(hx, h - B + (B - hH) / 2, hW, hH);
      }

      ctx.fillStyle = "#C8A96E80";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("PHOTOBOOTH EXCLUSIVE · GEORGE & NADIA", w / 2, B / 2);
      ctx.fillText(String(new Date().getFullYear()), w / 2, h - B / 2);
      break;
    }

    /* ── 8. Polaroid ──────────────────────────────────── */
    case "polaroid": {
      ctx.fillStyle = "#F5EDD8";
      ctx.fillRect(0, 0, w, h);
      const m = 22;
      const bot = 72;
      ctx.clearRect(m, m, w - m * 2, h - m - bot);

      ctx.fillStyle = "#C8A96E40";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("George ♥ Nadia", w / 2, h - 24);

      ctx.strokeStyle = "#2A2A3E25";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h - 38);
      ctx.lineTo(w * 0.8, h - 38);
      ctx.stroke();
      break;
    }

    /* ── 9. Golden Moment ─────────────────────────────── */
    case "golden-moment": {
      ctx.strokeStyle = "#C8A96E";
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, w - 32, h - 32);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#A08050";
      ctx.strokeRect(22, 22, w - 44, h - 44);

      const cd = 12;
      [[cd + 4, cd + 4], [w - cd - 4, cd + 4], [cd + 4, h - cd - 4], [w - cd - 4, h - cd - 4]].forEach(
        ([cx, cy]) => {
          ctx.fillStyle = "#C8A96E";
          ctx.beginPath();
          ctx.moveTo(cx, cy - cd);
          ctx.lineTo(cx + cd, cy);
          ctx.lineTo(cx, cy + cd);
          ctx.lineTo(cx - cd, cy);
          ctx.closePath();
          ctx.fill();
        }
      );
      break;
    }

    /* ── 10. Floral Romance ───────────────────────────── */
    case "floral-romance": {
      fillBorder("#1A3A2A");
      innerLine("#C8A96E60", B - 5, 1);

      [[B / 2, B / 2], [w - B / 2, B / 2], [B / 2, h - B / 2], [w - B / 2, h - B / 2]].forEach(
        ([x, y]) => txt("❀", x, y, 26, "#E8608A")
      );

      [160, 320, 480, 640].forEach((x) => {
        txt("✿", x, B / 2, 16, "#FFB6C1");
        txt("✿", x, h - B / 2, 16, "#FFB6C1");
      });
      [150, 300, 450].forEach((y) => {
        txt("❀", B / 2, y, 14, "#FFB6C1");
        txt("❀", w - B / 2, y, 14, "#FFB6C1");
      });

      ctx.fillStyle = "#C8A96E40";
      for (let i = 1; i < 8; i++) {
        const x = (w / 8) * i;
        ctx.beginPath(); ctx.arc(x, B / 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, h - B / 2, 2, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
  }

  return canvas.toDataURL("image/png");
}

// ─── Preset Frame Definitions ─────────────────────────────────────────────────

export const PRESET_FRAMES = [
  { id: "none",           name: "Tanpa Frame",     preview: "none" },
  { id: "rose-gold",      name: "Rose Gold",       preview: "rose" },
  { id: "sweet-hearts",   name: "Sweet Hearts",    preview: "hearts" },
  { id: "cherry-blossom", name: "Cherry Blossom",  preview: "cherry" },
  { id: "vintage-lace",   name: "Vintage Lace",    preview: "lace" },
  { id: "starlight",      name: "Starlight",       preview: "stars" },
  { id: "love-letter",    name: "Love Letter",     preview: "letter" },
  { id: "retro-film",     name: "Retro Film",      preview: "film" },
  { id: "polaroid",       name: "Polaroid",        preview: "pola" },
  { id: "golden-moment",  name: "Golden Moment",   preview: "gold" },
  { id: "floral-romance", name: "Floral Romance",  preview: "floral" },
] as const;

type PresetId = (typeof PRESET_FRAMES)[number]["id"];

// ─── Card Preview CSS per type ────────────────────────────────────────────────

export function FrameCardPreview({ preview, name }: { preview: string; name: string }) {
  const base = "absolute inset-0 flex items-center justify-center text-2xl";

  if (preview === "none") {
    return (
      <div className={`${base} bg-booth-dark`}>
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-booth-border flex items-center justify-center">
          <span className="text-booth-border text-xl">—</span>
        </div>
      </div>
    );
  }
  if (preview === "rose") return (
    <div className={`${base} bg-booth-black`} style={{ border: "10px solid #FFB6C1" }}>
      <span style={{ fontSize: 8, color: "#E8608A", lineHeight: 1.2, textAlign: "center" }}>
        ♥ ♥ ♥<br />♥ 🌹 ♥<br />♥ ♥ ♥
      </span>
    </div>
  );
  if (preview === "hearts") return (
    <div className={`${base}`} style={{ background: "#FFF5F7", border: "10px solid #FFF5F7" }}>
      <span style={{ fontSize: 10, color: "#FF6B8A" }}>♥ ♥ ♥ ♥ ♥</span>
    </div>
  );
  if (preview === "cherry") return (
    <div className={`${base} bg-booth-black`} style={{ border: "10px solid #FFAECB" }}>
      <span style={{ fontSize: 10, color: "#FF6B9D" }}>✿ ✿ ✿</span>
    </div>
  );
  if (preview === "lace") return (
    <div className={`${base} bg-booth-black`} style={{ border: "10px solid #5C0A2E" }}>
      <span style={{ fontSize: 10, color: "#C8A96E" }}>◆ ◆ ◆</span>
    </div>
  );
  if (preview === "stars") return (
    <div className={`${base}`} style={{ background: "#0D1B2A", border: "10px solid #0D1B2A" }}>
      <span style={{ fontSize: 10, color: "#C8A96E" }}>★ ✦ ★</span>
    </div>
  );
  if (preview === "letter") return (
    <div className={`${base}`} style={{ background: "#F5E6D3", border: "10px solid #EDD9B8" }}>
      <span style={{ fontSize: 10, color: "#8B1A1A" }}>● ♥ ●</span>
    </div>
  );
  if (preview === "film") return (
    <div className={`${base} relative overflow-hidden bg-booth-black`}>
      <div className="absolute top-0 inset-x-0 h-6 bg-booth-dark flex items-center justify-around px-1">
        {[...Array(6)].map((_, i) => <div key={i} className="w-2 h-3 bg-booth-black rounded-sm" />)}
      </div>
      <div className="absolute bottom-0 inset-x-0 h-6 bg-booth-dark flex items-center justify-around px-1">
        {[...Array(6)].map((_, i) => <div key={i} className="w-2 h-3 bg-booth-black rounded-sm" />)}
      </div>
    </div>
  );
  if (preview === "pola") return (
    <div className={`${base} relative overflow-hidden`} style={{ background: "#F5EDD8" }}>
      <div className="absolute inset-2 bottom-8 bg-booth-black rounded-sm" />
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-booth-muted/60 font-mono whitespace-nowrap">
        George ♥ Nadia
      </div>
    </div>
  );
  if (preview === "gold") return (
    <div className={`${base} bg-booth-black`} style={{ border: "4px solid #C8A96E", outline: "2px solid #C8A96E", outlineOffset: "4px" }}>
      <span style={{ fontSize: 10, color: "#C8A96E" }}>◆</span>
    </div>
  );
  if (preview === "floral") return (
    <div className={`${base} bg-booth-black`} style={{ border: "10px solid #1A3A2A" }}>
      <span style={{ fontSize: 10, color: "#E8608A" }}>❀ ✿ ❀</span>
    </div>
  );

  return <div className={`${base} bg-booth-dark`}>{name}</div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FrameSelector({
  customFrames,
  onAddCustomFrame,
  onDeleteCustomFrame,
  onSelectFrame,
  onBack,
}: FrameSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>("none");
  const [isDragging, setIsDragging] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [setupFrame, setSetupFrame] = useState<{ objectUrl: string; hasChromaKey: boolean; defaultName: string } | null>(null);
  const [setupName, setSetupName] = useState("");
  const [setupOrientation, setSetupOrientation] = useState<"both" | "portrait" | "landscape">("both");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setDetectError("File harus berupa gambar (PNG/JPG).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setDetectError("Ukuran file maksimal 15 MB.");
      return;
    }
    setIsDetecting(true);
    setDetectError(null);
    try {
      const objectUrl = URL.createObjectURL(file);
      const { hasChromaKey, hasTransparency } = await analyzeFrameUpload(objectUrl);
      
      if (!hasChromaKey && !hasTransparency) {
        setDetectError("Frame harus memiliki area transparan atau ruang hijau (green screen) untuk tempat foto.");
        URL.revokeObjectURL(objectUrl);
        return;
      }

      let finalImageUrl = objectUrl;
      if (hasChromaKey) {
        finalImageUrl = await removeChromaKey(objectUrl);
        URL.revokeObjectURL(objectUrl);
      }

      setSetupFrame({
        objectUrl: finalImageUrl,
        hasChromaKey: false,
        defaultName: file.name.replace(/\.[^.]+$/, "")
      });
      setSetupName(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      console.error(err);
      setDetectError("Gagal memproses gambar. Coba lagi.");
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleConfirm = useCallback(() => {
    if (selectedId === "none") { onSelectFrame(null); return; }
    
    // Check if it's a custom frame
    const custom = customFrames.find((f) => f.id === selectedId);
    if (custom) { onSelectFrame(custom); return; }

    const preset = PRESET_FRAMES.find((f) => f.id === selectedId);
    if (!preset) return;

    const imageUrl = makeFrame(selectedId);
    onSelectFrame({ id: selectedId, name: preset.name, imageUrl, hasChromaKey: false });
  }, [selectedId, customFrames, onSelectFrame]);

  const selectedName =
    selectedId === "none"
      ? "Tanpa Frame"
      : customFrames.find((f) => f.id === selectedId)
        ? customFrames.find((f) => f.id === selectedId)!.name
        : PRESET_FRAMES.find((f) => f.id === selectedId)?.name ?? selectedId;

  return (
    <div className="fixed inset-0 bg-booth-black flex flex-col overflow-hidden">
      {/* Grid bg */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(#C8A96E 1px,transparent 1px),linear-gradient(90deg,#C8A96E 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

      {/* Header */}
      <header className="relative flex items-center gap-4 px-5 py-4 border-b border-booth-border bg-booth-dark/60 backdrop-blur-sm flex-shrink-0">
        <button
          id="frame-back-btn"
          onClick={onBack}
          className="w-9 h-9 rounded-full border border-booth-border flex items-center justify-center text-booth-muted hover:text-booth-warm hover:border-booth-muted transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-booth-warm font-display text-lg font-semibold">Pilih Frame</h2>
          <p className="text-booth-muted text-[11px] font-mono tracking-widest uppercase">10 tema romantis tersedia</p>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="relative flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">

        {/* Preset grid */}
        <div className="space-y-2">
          <label className="text-booth-muted text-xs font-mono tracking-widest uppercase">Frame Preset Romantis</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {PRESET_FRAMES.map((frame) => {
              const isSelected = selectedId === frame.id;
              return (
                <button
                  key={frame.id}
                  onClick={() => setSelectedId(frame.id)}
                  className={[
                    "relative rounded-xl overflow-hidden border-2 transition-all duration-200 aspect-[4/3]",
                    isSelected
                      ? "border-booth-accent shadow-[0_0_16px_#C8A96E50]"
                      : "border-booth-border hover:border-booth-muted",
                  ].join(" ")}
                >
                  <FrameCardPreview preview={frame.preview} name={frame.name} />

                  {/* Name label */}
                  <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-booth-black/90 to-transparent flex items-center justify-center gap-1">
                    <span className="text-booth-accent flex-shrink-0">
                      {getFrameIcon(frame.id, "w-2.5 h-2.5")}
                    </span>
                    <p className="text-booth-warm text-[9px] font-mono truncate leading-none">
                      {frame.name}
                    </p>
                  </div>

                  {/* Checkmark */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-booth-accent flex items-center justify-center">
                      <svg className="w-3 h-3 text-booth-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}

            {/* Custom upload cards */}
            {customFrames.map((custom) => {
              const isSelected = selectedId === custom.id;
              return (
                <div key={custom.id} className="relative aspect-[4/3] group">
                  <button
                    onClick={() => setSelectedId(custom.id)}
                    className={[
                      "relative w-full h-full rounded-xl overflow-hidden border-2 transition-all duration-200",
                      isSelected
                        ? "border-booth-accent shadow-[0_0_16px_#C8A96E50]"
                        : "border-booth-border hover:border-booth-muted",
                    ].join(" ")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={custom.thumbnailUrl || custom.imageUrl} alt={custom.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-booth-black/90 to-transparent flex items-center justify-center gap-1">
                      <Upload className="w-2.5 h-2.5 text-booth-accent flex-shrink-0" />
                      <p className="text-booth-warm text-[9px] font-mono truncate leading-none">{custom.name}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-booth-accent flex items-center justify-center">
                        <svg className="w-3 h-3 text-booth-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Hapus frame "${custom.name}"?`)) {
                        onDeleteCustomFrame(custom.id);
                        if (selectedId === custom.id) setSelectedId("none");
                      }
                    }}
                    className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    title="Hapus Frame"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upload zone */}
        <div className="space-y-2">
          <label className="text-booth-muted text-xs font-mono tracking-widest uppercase">Upload Frame Custom</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 p-4",
              isDragging ? "border-booth-accent bg-booth-accent/5" : "border-booth-border bg-booth-dark/40 hover:border-booth-muted",
            ].join(" ")}
          >
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} id="frame-upload-input" />
            {isDetecting ? (
              <div className="flex items-center gap-2 justify-center py-2">
                <div className="w-5 h-5 rounded-full border-2 border-booth-accent border-t-transparent animate-spin" />
                <p className="text-booth-muted text-xs font-mono">Mendeteksi green screen...</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border border-booth-border flex items-center justify-center text-booth-muted flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-booth-warm text-sm">
                    Upload frame sendiri{" "}
                    <span className="text-booth-accent underline underline-offset-2">· pilih file</span>
                  </p>
                  <p className="text-booth-muted text-[11px]">PNG transparan atau green screen (#00FF00)</p>
                </div>
              </div>
            )}
          </div>
          {detectError && <p className="text-red-400 text-xs font-mono">{detectError}</p>}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="relative flex-shrink-0 px-4 sm:px-5 py-4 border-t border-booth-border bg-booth-dark/80 backdrop-blur-sm">
        <button
          id="frame-confirm-btn"
          onClick={handleConfirm}
          disabled={isDetecting}
          className="w-full py-3.5 rounded-xl font-mono text-sm tracking-[0.15em] uppercase transition-all duration-200 bg-booth-accent text-booth-black font-bold hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDetecting ? "Memproses..." : `Gunakan "${selectedName}" →`}
        </button>
      </div>

      {/* Setup Custom Frame Modal — Scrollable fix with items-start sm:items-center and overflow-y-auto */}
      {setupFrame && (
        <div className="absolute inset-0 z-[60] bg-booth-black/95 backdrop-blur-sm flex justify-center items-start sm:items-center p-4 overflow-y-auto">
          <div className="bg-booth-dark border border-booth-border/50 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in my-auto">
            <h3 className="text-booth-warm font-display text-lg mb-1">Konfigurasi Frame Custom</h3>
            <p className="text-booth-muted text-xs font-mono mb-6">Atur nama dan dukungan orientasi untuk frame ini.</p>
            
            {/* Preview Thumbnail */}
            <div className="w-full aspect-video bg-booth-black/50 rounded-xl mb-6 border border-booth-border/30 flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setupFrame.objectUrl} className="max-w-full max-h-full object-contain drop-shadow-md" alt="Preview" />
            </div>

            <div className="space-y-4">
              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-booth-muted text-[10px] font-mono uppercase tracking-widest block">Nama Frame</label>
                <input 
                  type="text" 
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="w-full bg-booth-black border border-booth-border/50 rounded-lg px-4 py-3 text-booth-warm font-mono text-sm focus:outline-none focus:border-booth-accent transition-colors"
                  placeholder="Contoh: My Awesome Frame"
                />
              </div>

              {/* Orientation Selector */}
              <div className="space-y-1.5">
                <label className="text-booth-muted text-[10px] font-mono uppercase tracking-widest block">Dukungan Orientasi</label>
                <div className="flex gap-2 font-mono">
                  <button 
                    onClick={() => setSetupOrientation("portrait")}
                    className={`flex-1 py-2.5 rounded-lg border text-xs transition-all ${setupOrientation === "portrait" ? "border-booth-accent bg-booth-accent/10 text-booth-accent font-bold" : "border-booth-border/40 text-booth-muted hover:border-booth-muted"}`}
                  >
                    Portrait
                  </button>
                  <button 
                    onClick={() => setSetupOrientation("landscape")}
                    className={`flex-1 py-2.5 rounded-lg border text-xs transition-all ${setupOrientation === "landscape" ? "border-booth-accent bg-booth-accent/10 text-booth-accent font-bold" : "border-booth-border/40 text-booth-muted hover:border-booth-muted"}`}
                  >
                    Landscape
                  </button>
                  <button 
                    onClick={() => setSetupOrientation("both")}
                    className={`flex-1 py-2.5 rounded-lg border text-xs transition-all ${setupOrientation === "both" ? "border-booth-accent bg-booth-accent/10 text-booth-accent font-bold" : "border-booth-border/40 text-booth-muted hover:border-booth-muted"}`}
                  >
                    Keduanya
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setSetupFrame(null)}
                className="flex-1 py-3 rounded-xl border border-booth-border text-booth-muted font-mono text-xs uppercase tracking-widest hover:text-booth-warm transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  const newId = `custom-${Date.now()}`;
                  onAddCustomFrame({
                    id: newId,
                    name: setupName || "Custom Frame",
                    imageUrl: setupFrame.objectUrl,
                    hasChromaKey: false,
                    thumbnailUrl: setupFrame.objectUrl,
                    supportedOrientations: setupOrientation === "both" ? ["portrait", "landscape"] : [setupOrientation],
                  });
                  setSelectedId(newId);
                  setSetupFrame(null);
                }}
                className="flex-[2] py-3 rounded-xl bg-booth-accent text-booth-black font-mono font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(200,169,110,0.3)]"
              >
                Simpan &amp; Pilih
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
