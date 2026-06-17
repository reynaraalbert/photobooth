import { StripLayoutPreview } from "./StripLayoutPreview";
import type { PhotoMode, StripLayout, StripOrientation } from "@/types/photobooth";
import { Minus, Plus, Camera } from "lucide-react";

interface ControlPanelProps {
  mode: PhotoMode;
  onModeChange: (mode: PhotoMode) => void;
  stripLayout: StripLayout;
  onStripLayoutChange: (n: StripLayout) => void;
  stripOrientation: StripOrientation;
  onStripOrientationChange: (o: StripOrientation) => void;
  frameId: string;
  photos: string[];
  countdownSeconds: number;
  onCountdownChange: (s: number) => void;
  onCapture: () => void;
  onSwitchCamera: () => void;
  hasMultipleCameras: boolean;
  isCapturing: boolean;
  isCountdownActive: boolean;
  photosTaken: number;
  onRetakePhoto?: (index: number) => void;
  retakeIndex?: number | null;
  onFinishStrip?: () => void;
}

export function ControlPanel({
  mode,
  onModeChange,
  stripLayout,
  onStripLayoutChange,
  stripOrientation,
  onStripOrientationChange,
  frameId,
  photos,
  countdownSeconds,
  onCountdownChange,
  onCapture,
  onSwitchCamera,
  hasMultipleCameras,
  isCapturing,
  isCountdownActive,
  photosTaken,
  onRetakePhoto,
  retakeIndex,
  onFinishStrip,
}: ControlPanelProps) {
  const isBusy = isCapturing || isCountdownActive;
  const stripProgress = mode === "strip" ? photosTaken : null;

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Mode toggle */}
      <div className="space-y-2">
        <label className="text-booth-muted text-xs font-mono tracking-widest uppercase">
          Mode
        </label>
        <div className="flex rounded-lg overflow-hidden border border-booth-border bg-booth-dark">
          {(["single", "strip"] as PhotoMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              disabled={isBusy}
              className={[
                "flex-1 py-2.5 text-xs font-mono tracking-widest uppercase transition-all duration-200",
                mode === m
                  ? "bg-booth-accent text-booth-black font-bold"
                  : "text-booth-muted hover:text-booth-warm",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              {m === "single" ? "Single" : "Strip"}
            </button>
          ))}
        </div>
      </div>

      {/* Strip layout (only when strip mode) */}
      {mode === "strip" && (
        <div className="space-y-3 animate-fade-in">
          <div className="space-y-1">
            <label className="text-booth-muted text-xs font-mono tracking-widest uppercase flex justify-between">
              <span>Jumlah Foto</span>
              {stripProgress !== null && (
                <span className="text-booth-accent font-semibold">
                  {photosTaken}/{stripLayout}
                </span>
              )}
            </label>
            <div className="flex items-center justify-between border border-booth-border bg-booth-dark/50 rounded-lg p-1.5 gap-2">
              <button
                type="button"
                onClick={() => onStripLayoutChange(Math.max(2, stripLayout - 1))}
                disabled={isBusy || photosTaken > 0 || stripLayout <= 2}
                className="w-10 h-10 rounded-md border border-booth-border flex items-center justify-center text-booth-muted hover:text-booth-warm hover:border-booth-muted transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-booth-border/20"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center justify-center flex-1">
                <span className="text-booth-warm text-lg font-bold font-mono tracking-tight">{stripLayout}</span>
                <span className="text-booth-muted text-[9px] font-mono tracking-widest uppercase">FOTO</span>
              </div>
              <button
                type="button"
                onClick={() => onStripLayoutChange(Math.min(20, stripLayout + 1))}
                disabled={isBusy || photosTaken > 0 || stripLayout >= 20}
                className="w-10 h-10 rounded-md border border-booth-border flex items-center justify-center text-booth-muted hover:text-booth-warm hover:border-booth-muted transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-booth-border/20"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Orientation Toggle */}
          <div className="space-y-1">
            <label className="text-booth-muted text-[10px] font-mono tracking-widest uppercase">
              Letak Strip
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["portrait", "landscape"] as StripOrientation[]).map((o) => (
                <button
                  key={o}
                  onClick={() => onStripOrientationChange(o)}
                  disabled={isBusy || photosTaken > 0}
                  className={[
                    "py-2 rounded-md text-[9px] font-mono border transition-all duration-200 uppercase tracking-wider text-center",
                    stripOrientation === o
                      ? "border-booth-accent text-booth-accent bg-booth-accent/10 font-semibold"
                      : "border-booth-border text-booth-muted hover:border-booth-muted",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                  ].join(" ")}
                >
                  {o === "portrait" && "Frame Portrait"}
                  {o === "landscape" && "Frame Landscape"}
                </button>
              ))}
            </div>
          </div>

          {/* Strip Layout Preview Mockup */}
          <div className="pt-1">
            <StripLayoutPreview
              frameId={frameId}
              layout={stripLayout}
              orientation={stripOrientation}
              photosTaken={photosTaken}
              photos={photos}
              onRetakePhoto={onRetakePhoto}
              retakeIndex={retakeIndex}
            />
          </div>

          {/* Strip progress dots */}
          {photosTaken > 0 && (
            <div className="flex gap-1.5 justify-center pt-1">
              {Array.from({ length: stripLayout }).map((_, i) => (
                <div
                  key={i}
                  className={[
                    "w-2 h-2 rounded-full transition-all duration-300",
                    i < photosTaken
                      ? "bg-booth-accent scale-110"
                      : "bg-booth-border",
                  ].join(" ")}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timer */}
      <div className="space-y-2">
        <label className="text-booth-muted text-xs font-mono tracking-widest uppercase">
          Timer
        </label>
        <div className="flex gap-2">
          {[0, 3, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => onCountdownChange(s)}
              disabled={isBusy}
              className={[
                "flex-1 py-2 rounded-md text-xs font-mono border transition-all duration-200",
                countdownSeconds === s
                  ? "border-booth-accent text-booth-accent bg-booth-accent/10"
                  : "border-booth-border text-booth-muted hover:border-booth-muted",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              {s === 0 ? "Off" : `${s}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Capture / Finish + Switch buttons */}
      <div className="flex items-center gap-3 pt-2">
        {/* Switch camera */}
        {hasMultipleCameras && (
          <button
            onClick={onSwitchCamera}
            disabled={isBusy}
            title="Ganti kamera"
            className={[
              "w-12 h-12 rounded-full border border-booth-border flex items-center justify-center",
              "text-booth-muted hover:text-booth-warm hover:border-booth-muted",
              "transition-all duration-200 flex-shrink-0",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            <SwitchCameraIcon />
          </button>
        )}

        {/* Capture or Finish Button */}
        {mode === "strip" && photosTaken === stripLayout ? (
          <button
            type="button"
            onClick={onFinishStrip}
            className="flex-1 h-14 rounded-full bg-booth-accent text-booth-black font-mono font-bold tracking-widest uppercase hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            Selesai & Lihat Hasil
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCapture}
            disabled={isCapturing}
            className="relative group flex-1 h-20 rounded-full bg-booth-dark border-[4px] border-booth-accent text-booth-accent hover:bg-booth-accent hover:text-booth-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center max-w-[120px] mx-auto"
          >
            {isCountdownActive ? (
              <span className="text-3xl font-mono font-bold animate-pulse">
                {countdownSeconds}
              </span>
            ) : (
              <Camera className="w-8 h-8" />
            )}
          </button>
        )}

        {/* Empty space for balance if multiple cameras */}
        {hasMultipleCameras && <div className="w-12 shrink-0" />}
      </div>
    </div>
  );
}

function SwitchCameraIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}
