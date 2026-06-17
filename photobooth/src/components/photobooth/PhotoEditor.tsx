"use client";

import { useCallback, useRef, useState } from "react";

// ─── Filter Presets ───────────────────────────────────────────────────────────

interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  css: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "normal",   name: "Normal",   icon: "○", css: "" },
  { id: "warm",     name: "Warm",     icon: "☀", css: "sepia(0.25) saturate(1.4) hue-rotate(-8deg)" },
  { id: "cool",     name: "Cool",     icon: "❄", css: "saturate(0.85) hue-rotate(20deg)" },
  { id: "bw",       name: "B&W",      icon: "◑", css: "grayscale(1)" },
  { id: "sepia",    name: "Sepia",    icon: "🟤", css: "sepia(0.85)" },
  { id: "fade",     name: "Fade",     icon: "◻", css: "saturate(0.45) contrast(0.85)" },
  { id: "vivid",    name: "Vivid",    icon: "◉", css: "saturate(1.9) contrast(1.08)" },
  { id: "vintage",  name: "Vintage",  icon: "📜", css: "sepia(0.45) saturate(0.85) contrast(0.9)" },
  { id: "romantic", name: "Romantic", icon: "♥", css: "sepia(0.15) saturate(1.6) hue-rotate(-12deg)" },
  { id: "dreamy",   name: "Dreamy",   icon: "✦", css: "saturate(1.25) hue-rotate(5deg) contrast(0.9)" },
];

// ─── Helper: apply CSS filter to canvas & return data URL ────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function applyFilterToCanvas(
  imageUrl: string,
  filterCSS: string
): Promise<string> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  if (filterCSS) ctx.filter = filterCSS;
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.93);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PhotoEditorProps {
  /** The photo URL to edit */
  photoUrl: string;
  /** Called with the edited data URL on save */
  onSave: (editedUrl: string) => void;
  /** Called on cancel (no changes) */
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

async function simulateAIAction(
  imageUrl: string,
  action: string
): Promise<string> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get context");

  if (action === "retouch") {
    // 1. Draw base photo
    ctx.drawImage(img, 0, 0);
    // 2. Overlay a blurred soft focus bloom layer
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.filter = "blur(6px) brightness(1.08) contrast(1.05)";
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    // 3. Subtle brightening and color balance
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.filter = "saturate(1.15) hue-rotate(-5deg)";
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  } else if (action === "cartoon") {
    // High-contrast pop-art sketch style
    ctx.drawImage(img, 0, 0);
    ctx.save();
    ctx.filter = "contrast(1.6) saturate(1.8) brightness(1.05) sepia(0.15)";
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    // Overlay soft outline border
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  } else if (action === "cutout") {
    // Draw romantic background gradient
    const g = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) / 1.8);
    g.addColorStop(0, "#FFF0F3");
    g.addColorStop(0.5, "#FFD1DC");
    g.addColorStop(1, "#FF8DA1");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Draw hearts on background
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "bold 48px Arial";
    ctx.fillText("♥", w * 0.15, h * 0.25);
    ctx.fillText("♥", w * 0.85, h * 0.3);
    ctx.fillText("♥", w * 0.2, h * 0.8);
    ctx.fillText("♥", w * 0.8, h * 0.75);

    // Draw clipped subject portrait in center (studio style cutout vignette)
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.46, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    // Draw clean borders around circle cutout
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.46, 0, Math.PI * 2);
    ctx.stroke();
  }

  return canvas.toDataURL("image/jpeg", 0.93);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PhotoEditor({ photoUrl, onSave, onClose }: PhotoEditorProps) {
  const [basePhotoUrl, setBasePhotoUrl] = useState(photoUrl);
  const [activeFilter, setActiveFilter] = useState("normal");
  const [brightness, setBrightness] = useState(0); // -50 … +50
  const [contrast, setContrast]     = useState(0);
  const [isSaving, setIsSaving]     = useState(false);
  const [editorMode, setEditorMode] = useState<"manual" | "beautycam">("manual");
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiAction, setAIAction] = useState<string | null>(null);
  
  const filterRowRef = useRef<HTMLDivElement>(null);

  /** Build the complete CSS filter string */
  const buildFilterCSS = useCallback(
    (filterId: string, bVal: number, cVal: number): string => {
      const preset = FILTER_PRESETS.find((f) => f.id === filterId) ?? FILTER_PRESETS[0];
      const parts = [preset.css];
      if (bVal !== 0) parts.push(`brightness(${(1 + bVal / 100).toFixed(2)})`);
      if (cVal !== 0) parts.push(`contrast(${(1 + cVal / 100).toFixed(2)})`);
      return parts.filter(Boolean).join(" ");
    },
    []
  );

  const currentFilterCSS = buildFilterCSS(activeFilter, brightness, contrast);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const edited = await applyFilterToCanvas(basePhotoUrl, currentFilterCSS);
      onSave(edited);
    } catch (err) {
      console.error("[PhotoEditor] save failed:", err);
      onSave(basePhotoUrl); // fallback: return current base
    } finally {
      setIsSaving(false);
    }
  }, [basePhotoUrl, currentFilterCSS, onSave]);

  const handleApplyAI = useCallback(
    async (action: "retouch" | "cartoon" | "cutout") => {
      setIsAIProcessing(true);
      setAIAction(action);
      try {
        // Simulasikan delay sebentar untuk premium UX feel
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Terapkan simulasi efek canvas client-side secara langsung
        const simulated = await simulateAIAction(basePhotoUrl, action);
        setBasePhotoUrl(simulated);

        // Reset kontrol manual
        setActiveFilter("normal");
        setBrightness(0);
        setContrast(0);
      } catch (err) {
        console.error("AI processing failed:", err);
      } finally {
        setIsAIProcessing(false);
      }
    },
    [basePhotoUrl]
  );

  const isEdited =
    basePhotoUrl !== photoUrl || activeFilter !== "normal" || brightness !== 0 || contrast !== 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-booth-black relative">
      {/* CSS Scanner animations */}
      <style>{`
        @keyframes scanAnim {
          0% { transform: translateY(0px); }
          50% { transform: translateY(140px); }
          100% { transform: translateY(0px); }
        }
        .ai-scanner-line {
          animation: scanAnim 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-booth-border bg-booth-dark flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-booth-muted hover:text-booth-warm transition-colors text-sm font-mono"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Batal
        </button>
        <span className="text-booth-warm font-display text-base font-semibold">Edit Foto</span>
        <button
          id="photo-editor-save-btn"
          onClick={handleSave}
          disabled={isSaving || isAIProcessing}
          className={[
            "px-4 py-1.5 rounded-full font-mono text-xs tracking-widest uppercase transition-all",
            isSaving || isAIProcessing
              ? "bg-booth-border text-booth-muted"
              : isEdited
                ? "bg-booth-accent text-booth-black font-bold"
                : "border border-booth-border text-booth-muted",
          ].join(" ")}
        >
          {isSaving ? "Menyimpan..." : "Simpan"}
        </button>
      </header>

      {/* Photo preview area */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center bg-[#050508] p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={basePhotoUrl}
          alt="Editing photo"
          className="max-w-full max-h-full object-contain rounded-lg"
          style={{ filter: currentFilterCSS || "none" }}
          draggable={false}
        />
        {/* Filter label */}
        {(activeFilter !== "normal" || brightness !== 0 || contrast !== 0) && (
          <div className="absolute top-3 left-3 bg-booth-black/70 backdrop-blur-sm border border-booth-border rounded-full px-2 py-0.5">
            <span className="text-booth-accent text-[10px] font-mono tracking-widest">
              {FILTER_PRESETS.find((f) => f.id === activeFilter)?.name}
              {brightness !== 0 && ` · B${brightness > 0 ? "+" : ""}${brightness}`}
              {contrast !== 0 && ` · C${contrast > 0 ? "+" : ""}${contrast}`}
            </span>
          </div>
        )}
      </div>

      {/* AI Processing Overlay */}
      {isAIProcessing && (
        <div className="absolute inset-0 z-[70] bg-booth-black/90 flex flex-col items-center justify-center gap-4 animate-fade-in backdrop-blur-sm">
          <div className="relative w-36 h-36 border border-booth-accent/20 rounded-2xl overflow-hidden flex items-center justify-center bg-booth-dark/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={basePhotoUrl}
              alt="Processing"
              className="w-full h-full object-cover opacity-60"
            />
            {/* Scanning line */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-booth-accent to-transparent ai-scanner-line z-10 shadow-[0_0_8px_rgba(200,169,110,0.8)]" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h3 className="text-booth-accent font-mono text-xs tracking-widest uppercase font-bold animate-pulse">
              Memproses AI Beautycam...
            </h3>
            <p className="text-booth-muted text-[10px] font-mono">
              Sedang menerapkan efek {aiAction === "retouch" ? "retouching wajah" : aiAction === "cartoon" ? "sketsa seni" : "penghapusan latar"}
            </p>
          </div>
        </div>
      )}

      {/* Controls panel */}
      <div className="flex-shrink-0 bg-booth-dark border-t border-booth-border space-y-0 pb-safe">
        
        {/* Tab Selector */}
        <div className="flex border-b border-booth-border/30 bg-booth-dark/50">
          <button
            type="button"
            onClick={() => setEditorMode("manual")}
            className={[
              "flex-1 py-3.5 text-xs font-mono tracking-wider uppercase border-b-2 transition-all font-semibold",
              editorMode === "manual"
                ? "border-booth-accent text-booth-accent"
                : "border-transparent text-booth-muted hover:text-booth-warm",
            ].join(" ")}
          >
            Filter Manual
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("beautycam")}
            className={[
              "flex-1 py-3.5 text-xs font-mono tracking-wider uppercase border-b-2 transition-all font-semibold flex items-center justify-center gap-1.5",
              editorMode === "beautycam"
                ? "border-booth-accent text-booth-accent"
                : "border-transparent text-booth-muted hover:text-booth-warm",
            ].join(" ")}
          >
            <span className="text-[10px] animate-pulse">✨</span> AI Beautycam
          </button>
        </div>

        {editorMode === "manual" ? (
          <div className="space-y-4 pt-1">
            {/* Filter presets — horizontal scroll */}
            <div
              ref={filterRowRef}
              className="flex gap-2 overflow-x-auto py-4 px-4 scrollbar-none"
              style={{ scrollbarWidth: "none" }}
            >
              {FILTER_PRESETS.map((f) => {
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    id={`filter-${f.id}-btn`}
                    onClick={() => setActiveFilter(f.id)}
                    className={[
                      "flex flex-col items-center gap-1.5 flex-shrink-0 w-14 transition-all duration-200",
                      isActive ? "opacity-100" : "opacity-50 hover:opacity-75",
                    ].join(" ")}
                  >
                    {/* Thumbnail with filter */}
                    <div
                      className={[
                        "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                        isActive ? "border-booth-accent" : "border-booth-border",
                      ].join(" ")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={basePhotoUrl}
                        alt={f.name}
                        className="w-full h-full object-cover"
                        style={{ filter: f.css || "none" }}
                        draggable={false}
                      />
                    </div>
                    <span
                      className={`text-[9px] font-mono tracking-wide leading-none ${isActive ? "text-booth-accent" : "text-booth-muted"}`}
                    >
                      {f.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sliders */}
            <div className="px-4 pb-4 space-y-3">
              {/* Brightness */}
              <div className="flex items-center gap-3">
                <span className="text-booth-muted text-[11px] font-mono w-20 text-right shrink-0">
                  Kecerahan{" "}
                  <span className={brightness !== 0 ? "text-booth-accent" : ""}>
                    {brightness > 0 ? `+${brightness}` : brightness}
                  </span>
                </span>
                <input
                  id="brightness-slider"
                  type="range"
                  min={-50}
                  max={50}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="flex-1 accent-[#C8A96E] h-1 rounded-full bg-booth-border cursor-pointer"
                />
                <button
                  onClick={() => setBrightness(0)}
                  className="text-[10px] text-booth-muted hover:text-booth-warm font-mono shrink-0"
                >
                  Reset
                </button>
              </div>

              {/* Contrast */}
              <div className="flex items-center gap-3">
                <span className="text-booth-muted text-[11px] font-mono w-20 text-right shrink-0">
                  Kontras{" "}
                  <span className={contrast !== 0 ? "text-booth-accent" : ""}>
                    {contrast > 0 ? `+${contrast}` : contrast}
                  </span>
                </span>
                <input
                  id="contrast-slider"
                  type="range"
                  min={-50}
                  max={50}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="flex-1 accent-[#C8A96E] h-1 rounded-full bg-booth-border cursor-pointer"
                />
                <button
                  onClick={() => setContrast(0)}
                  className="text-[10px] text-booth-muted hover:text-booth-warm font-mono shrink-0"
                >
                  Reset
                </button>
              </div>

              {/* Reset all */}
              {(activeFilter !== "normal" || brightness !== 0 || contrast !== 0 || basePhotoUrl !== photoUrl) && (
                <button
                  onClick={() => {
                    setBasePhotoUrl(photoUrl);
                    setActiveFilter("normal");
                    setBrightness(0);
                    setContrast(0);
                  }}
                  className="w-full text-center text-[11px] font-mono text-booth-muted hover:text-booth-warm transition-colors"
                >
                  Reset semua perubahan
                </button>
              )}
            </div>
          </div>
        ) : (
          /* AI Beautycam Action Panel */
          <div className="p-5 grid grid-cols-3 gap-3 animate-fade-in bg-booth-black/20">
            {/* AI Retouch */}
            <button
              type="button"
              onClick={() => handleApplyAI("retouch")}
              disabled={isAIProcessing}
              className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-booth-border/50 hover:border-booth-accent/50 hover:bg-booth-accent/5 transition-all group active:scale-95 disabled:opacity-40"
            >
              <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                <span className="text-xl">✨</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-booth-warm uppercase tracking-wider text-center">
                AI Retouch
              </span>
              <span className="text-[8px] font-mono text-booth-muted text-center leading-tight">
                Retouch Wajah
              </span>
            </button>

            {/* AI Cartoon */}
            <button
              type="button"
              onClick={() => handleApplyAI("cartoon")}
              disabled={isAIProcessing}
              className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-booth-border/50 hover:border-booth-accent/50 hover:bg-booth-accent/5 transition-all group active:scale-95 disabled:opacity-40"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <span className="text-xl">🎨</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-booth-warm uppercase tracking-wider text-center">
                AI Cartoon
              </span>
              <span className="text-[8px] font-mono text-booth-muted text-center leading-tight">
                Sketsa Seni
              </span>
            </button>

            {/* AI Cutout */}
            <button
              type="button"
              onClick={() => handleApplyAI("cutout")}
              disabled={isAIProcessing}
              className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-booth-border/50 hover:border-booth-accent/50 hover:bg-booth-accent/5 transition-all group active:scale-95 disabled:opacity-40"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <span className="text-xl">👤</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-booth-warm uppercase tracking-wider text-center">
                AI Cutout
              </span>
              <span className="text-[8px] font-mono text-booth-muted text-center leading-tight">
                Hapus Latar
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
