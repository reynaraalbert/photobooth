"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useCountdown } from "@/hooks/useCountdown";
import { CameraView } from "./CameraView";
import { ControlPanel } from "./ControlPanel";
import { PhotoPreview } from "./PhotoPreview";
import type { PhotoFrame, PhotoMode, StripLayout, StripOrientation } from "@/types/photobooth";
import { composeWithFrame, analyzeFrameUpload, removeChromaKey } from "@/lib/frameComposer";
import { PRESET_FRAMES, makeFrame, FrameCardPreview, getFrameIcon } from "./FrameSelector";
import { ChevronLeft, Check, Upload } from "lucide-react";

interface PhotoboothProps {
  frame: PhotoFrame | null;
  onChangeFrame: () => void;
  onBack: () => void;
  onUpdateFrame: (frame: PhotoFrame | null) => void;
  customFrames: PhotoFrame[];
  onAddCustomFrame: (frame: PhotoFrame) => void;
  onDeleteCustomFrame: (id: string) => void;
}

export function Photobooth({
  frame,
  onChangeFrame,
  onBack,
  onUpdateFrame,
  customFrames,
  onAddCustomFrame,
  onDeleteCustomFrame,
}: PhotoboothProps) {
  const [mode, setMode] = useState<PhotoMode>("single");
  const [stripLayout, setStripLayout] = useState<StripLayout>(3);
  const [stripOrientation, setStripOrientation] = useState<StripOrientation>("portrait");
  const [showInlineFramePicker, setShowInlineFramePicker] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(3);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [editedPhotos, setEditedPhotos] = useState<string[]>([]);
  const [customLabel, setCustomLabel] = useState<string>(`Photobooth · ${new Date().getFullYear()}`);
  const [showPreview, setShowPreview] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCompositing, setIsCompositing] = useState(false);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);

  const camera = useCamera({ facing: "user" });
  const { countdown, start: startCountdown, cancel: cancelCountdown } =
    useCountdown(countdownSeconds);

  // Start camera on mount
  useEffect(() => {
    camera.startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerFlash = useCallback(() => {
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);
  }, []);

  /**
   * Captures raw photo from camera and optionally composites with frame.
   * Returns the final data URL (composited if frame exists, raw otherwise).
   */
  const captureAndCompose = useCallback(async (): Promise<string | null> => {
    const rawUrl = camera.capturePhoto();
    if (!rawUrl) return null;

    triggerFlash();

    if (!frame) return rawUrl;

    // For preset frames and custom frames in strip mode, we capture RAW photos
    // since the frame is composed around the entire strip or on individual photos dynamically.
    if (mode === "strip") {
      return rawUrl;
    }

    try {
      const composited = await composeWithFrame({
        photoDataUrl: rawUrl,
        frameDataUrl: frame.imageUrl,
        hasChromaKey: frame.hasChromaKey,
        outputWidth: 1280,
      });
      return composited;
    } catch (err) {
      console.error("[Photobooth] Frame composition failed:", err);
      // Fallback to raw photo
      return rawUrl;
    }
  }, [camera, frame, mode, triggerFlash]);

  // ── Single capture ─────────────────────────────────────────────────────────

  const handleSingleCapture = useCallback(async () => {
    setIsCompositing(true);
    const url = await captureAndCompose();
    setIsCompositing(false);

    if (!url) {
      setIsCapturing(false);
      return;
    }
    setCapturedPhotos([url]);
    setEditedPhotos([url]);
    setTimeout(() => setShowPreview(true), 200);
    setIsCapturing(false);
  }, [captureAndCompose]);

  // ── Strip capture ──────────────────────────────────────────────────────────

  const stripCaptureRef = useRef<{
    remaining: number;
    photos: string[];
  } | null>(null);

  const captureNextStripPhoto = useCallback(async () => {
    if (!stripCaptureRef.current) return;

    setIsCompositing(true);
    const url = await captureAndCompose();
    setIsCompositing(false);

    if (!url) {
      setIsCapturing(false);
      stripCaptureRef.current = null;
      return;
    }

    stripCaptureRef.current.photos.push(url);
    stripCaptureRef.current.remaining -= 1;

    // Update capturedPhotos incrementally so live preview shows each photo
    const currentPhotos = [...stripCaptureRef.current.photos];
    setCapturedPhotos(currentPhotos);

    if (stripCaptureRef.current.remaining <= 0) {
      const allPhotos = [...stripCaptureRef.current.photos];
      setEditedPhotos(allPhotos);
      stripCaptureRef.current = null;
      setIsCapturing(false);
      // Removed auto-transition. Wait for user to click "Selesai"
    } else {
      // Brief pause then countdown for next photo
      setTimeout(() => {
        startCountdown(() => {
          captureNextStripPhoto();
        });
      }, 800);
    }
  }, [captureAndCompose, startCountdown]);

  // ── Main capture trigger ───────────────────────────────────────────────────

  const handleCapture = useCallback(() => {
    if (camera.state.status !== "active") return;
    if (isCapturing || countdown.isActive || isCompositing) return;

    if (mode === "single") {
      setIsCapturing(true);
      if (countdownSeconds > 0) {
        startCountdown(() => {
          handleSingleCapture();
        });
      } else {
        handleSingleCapture();
      }
    } else {
      setIsCapturing(true);
      setCapturedPhotos([]);
      stripCaptureRef.current = { remaining: stripLayout, photos: [] };

      if (countdownSeconds > 0) {
        startCountdown(() => captureNextStripPhoto());
      } else {
        captureNextStripPhoto();
      }
    }
  }, [
    camera.state.status,
    isCapturing,
    countdown.isActive,
    isCompositing,
    mode,
    countdownSeconds,
    stripLayout,
    startCountdown,
    handleSingleCapture,
    captureNextStripPhoto,
  ]);

  const handleRetake = useCallback(() => {
    setShowPreview(false);
    setCapturedPhotos([]);
    setEditedPhotos([]);
    setIsCapturing(false);
    setIsCompositing(false);
    setRetakeIndex(null);
    cancelCountdown();
    stripCaptureRef.current = null;
  }, [cancelCountdown]);

  // ── Retake a specific photo in strip mode ────────────────────────────────
  const handleRetakePhoto = useCallback(async (index: number) => {
    if (camera.state.status !== "active") return;
    if (isCapturing || countdown.isActive || isCompositing) return;

    setRetakeIndex(index);
    setIsCapturing(true);

    const doRetake = async () => {
      setIsCompositing(true);
      const url = await captureAndCompose();
      setIsCompositing(false);

      if (!url) {
        setIsCapturing(false);
        setRetakeIndex(null);
        return;
      }

      setCapturedPhotos(prev => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
      setEditedPhotos(prev => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
      setIsCapturing(false);
      setRetakeIndex(null);
    };

    if (countdownSeconds > 0) {
      startCountdown(() => doRetake());
    } else {
      doRetake();
    }
  }, [camera.state.status, isCapturing, countdown.isActive, isCompositing, countdownSeconds, captureAndCompose, startCountdown]);

  const handleModeChange = useCallback(
    (newMode: PhotoMode) => {
      if (isCapturing || countdown.isActive) return;
      setMode(newMode);
      setCapturedPhotos([]);
      setEditedPhotos([]);
    },
    [isCapturing, countdown.isActive]
  );

  const handleFinishStrip = useCallback(() => {
    setShowPreview(true);
  }, []);

  const isBusy = isCapturing || countdown.isActive || isCompositing;

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-screen w-full overflow-hidden bg-booth-black">
      {/* Brand header — mobile only */}
      <MobileHeader onChangeFrame={() => setShowInlineFramePicker(true)} onBack={onBack} />

      {/* Camera viewfinder */}
      <div className="relative flex-1 lg:flex-1 aspect-[4/3] lg:aspect-auto lg:h-screen">
        <CameraView
          videoRef={camera.videoRef}
          cameraState={camera.state}
          countdownValue={countdown.value}
          isCountdownActive={countdown.isActive}
          isMirrored={camera.facing === "user"}
          flashActive={flashActive}
          frame={frame}
          zoom={camera.zoom}
          isNativeZoomSupported={camera.isNativeZoomSupported}
          onZoomChange={camera.setZoom}
        />

        {/* Live indicator */}
        {camera.state.status === "active" && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-booth-black/60 backdrop-blur-sm border border-booth-border rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-booth-warm text-xs font-mono tracking-widest uppercase">
              Live
            </span>
          </div>
        )}

        {/* Compositing spinner overlay */}
        {isCompositing && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-booth-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-booth-accent border-t-transparent animate-spin" />
              <p className="text-booth-muted text-xs font-mono tracking-widest uppercase">
                Menerapkan frame...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Control panel sidebar */}
      <div className="w-full lg:w-[380px] lg:h-screen flex flex-col bg-booth-dark border-t lg:border-t-0 lg:border-l border-booth-border overflow-y-auto">
        {showInlineFramePicker ? (
          <InlineFramePicker
            currentFrame={frame}
            onSelectFrame={onUpdateFrame}
            onClose={() => setShowInlineFramePicker(false)}
            customFrames={customFrames}
            onAddCustomFrame={onAddCustomFrame}
            onDeleteCustomFrame={onDeleteCustomFrame}
          />
        ) : (
          <>
            {/* Brand — desktop sidebar */}
            <DesktopSidebarHeader
              frame={frame}
              onChangeFrame={() => setShowInlineFramePicker(true)}
              onBack={onBack}
            />

            {/* Start camera button if idle/error */}
            {(camera.state.status === "idle" ||
              camera.state.status === "error") && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => camera.startCamera()}
                  className="w-full py-3 rounded-xl bg-booth-accent text-booth-black font-mono text-sm tracking-widest uppercase hover:brightness-110 transition-all"
                >
                  {camera.state.status === "error" ? "Coba Lagi" : "Aktifkan Kamera"}
                </button>
              </div>
            )}

            {/* Controls */}
            <div className="flex-1">
              <ControlPanel
                mode={mode}
                onModeChange={handleModeChange}
                stripLayout={stripLayout}
                onStripLayoutChange={setStripLayout}
                stripOrientation={stripOrientation}
                onStripOrientationChange={setStripOrientation}
                frameId={frame ? frame.id : "none"}
                photos={capturedPhotos}
                countdownSeconds={countdownSeconds}
                onCountdownChange={setCountdownSeconds}
                onCapture={handleCapture}
                onSwitchCamera={camera.switchCamera}
                hasMultipleCameras={camera.hasMultipleCameras}
                isCapturing={isBusy}
                isCountdownActive={countdown.isActive}
                photosTaken={capturedPhotos.length}
                onRetakePhoto={handleRetakePhoto}
                retakeIndex={retakeIndex}
                onFinishStrip={handleFinishStrip}
              />
            </div>

            {/* Footer */}
            <div className="px-4 pb-6 pt-2">
              <p className="text-booth-border text-xs font-mono text-center tracking-widest">
                PHOTOBOOTH · {new Date().getFullYear()}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Preview modal */}
      {showPreview && capturedPhotos.length > 0 && (
        <PhotoPreview
          photos={capturedPhotos}
          editedPhotos={editedPhotos.length > 0 ? editedPhotos : capturedPhotos}
          onSaveEdits={(newPhotos, newFrame, newOrientation, newLabel) => {
            setEditedPhotos(newPhotos);
            if (onUpdateFrame) onUpdateFrame(newFrame);
            setStripOrientation(newOrientation);
            setCustomLabel(newLabel);
          }}
          mode={mode}
          onClose={() => setShowPreview(false)}
          onRetake={handleRetake}
          onChangeFrame={() => {
            setShowPreview(false);
            setShowInlineFramePicker(true);
          }}
          stripOrientation={stripOrientation}
          frame={frame}
          label={customLabel}
          customFrames={customFrames}
        />
      )}
    </div>
  );
}

function MobileHeader({ onChangeFrame, onBack }: { onChangeFrame: () => void; onBack: () => void }) {
  return (
    <header className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-booth-border bg-booth-dark flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onBack}
          className="w-7 h-7 rounded-full border border-booth-border flex items-center justify-center text-booth-muted hover:text-booth-warm transition-all mr-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-6 h-6 rounded border border-booth-accent flex items-center justify-center">
          <span className="text-booth-accent text-xs font-mono font-bold">P</span>
        </div>
        <span className="text-booth-warm font-display text-sm font-semibold tracking-wide">
          Photobooth
        </span>
      </div>
      <button
        onClick={onChangeFrame}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-booth-border text-booth-muted hover:text-booth-warm hover:border-booth-muted transition-all text-xs font-mono"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Frame
      </button>
    </header>
  );
}

function DesktopSidebarHeader({
  frame,
  onChangeFrame,
  onBack,
}: {
  frame: PhotoFrame | null;
  onChangeFrame: () => void;
  onBack: () => void;
}) {
  return (
    <div className="hidden lg:block px-6 pt-8 pb-6 border-b border-booth-border">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-booth-muted hover:text-booth-warm transition-colors mb-4 text-xs font-mono group"
      >
        <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="tracking-widest uppercase">Keluar Studio</span>
      </button>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded border border-booth-accent flex items-center justify-center">
          <span className="text-booth-accent text-sm font-mono font-bold">P</span>
        </div>
        <h1 className="text-booth-warm font-display text-xl font-semibold tracking-wide">
          Photobooth
        </h1>
      </div>
      <p className="text-booth-muted text-xs font-mono tracking-widest ml-11 uppercase">
        Studio · Web Edition
      </p>

      {/* Current frame indicator */}
      <button
        onClick={onChangeFrame}
        className="mt-4 ml-11 flex items-center gap-2 group"
      >
        <span className="text-[10px] font-mono text-booth-muted tracking-widest uppercase">
          Frame:
        </span>
        <span className="text-[10px] font-mono text-booth-accent group-hover:text-booth-warm transition-colors underline underline-offset-2">
          {frame ? frame.name : "Tanpa Frame"}
        </span>
      </button>
    </div>
  );
}

function InlineFramePicker({
  currentFrame,
  onSelectFrame,
  onClose,
  customFrames,
  onAddCustomFrame,
  onDeleteCustomFrame,
}: {
  currentFrame: PhotoFrame | null;
  onSelectFrame: (frame: PhotoFrame | null) => void;
  onClose: () => void;
  customFrames: PhotoFrame[];
  onAddCustomFrame: (frame: PhotoFrame) => void;
  onDeleteCustomFrame: (id: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [setupFrame, setSetupFrame] = useState<{ objectUrl: string; hasChromaKey: boolean; defaultName: string } | null>(null);
  const [setupName, setSetupName] = useState("");
  const [setupOrientation, setSetupOrientation] = useState<"both" | "portrait" | "landscape">("both");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback((id: string) => {
    if (id === "none") {
      onSelectFrame(null);
      return;
    }
    
    // Check if it's a custom frame
    const custom = customFrames.find((f) => f.id === id);
    if (custom) {
      onSelectFrame(custom);
      return;
    }

    const preset = PRESET_FRAMES.find((f) => f.id === id);
    if (!preset) return;
    const imageUrl = makeFrame(id);
    onSelectFrame({ id, name: preset.name, imageUrl, hasChromaKey: false });
  }, [customFrames, onSelectFrame]);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setDetectError("File harus berupa gambar.");
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
        setDetectError("Frame harus memiliki area transparan atau hijau (green screen).");
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
      setDetectError("Gagal memproses gambar.");
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

  return (
    <div className="flex flex-col h-full bg-booth-dark animate-fade-in">
      {/* Header */}
      <div className="px-5 py-4 border-b border-booth-border flex items-center justify-between flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-booth-muted hover:text-booth-warm transition-colors text-xs font-mono group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="tracking-widest uppercase">Kembali</span>
        </button>
        <span className="text-booth-warm font-display text-sm font-semibold">Pilih Frame</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Preset grid */}
        <div className="space-y-1.5">
          <label className="text-booth-muted text-[10px] font-mono tracking-widest uppercase">Preset Romantis</label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_FRAMES.map((frame) => {
              const isSelected = (!currentFrame && frame.id === "none") || (currentFrame && currentFrame.id === frame.id);
              return (
                <button
                  key={frame.id}
                  onClick={() => handleSelect(frame.id)}
                  className={[
                    "relative rounded-lg overflow-hidden border transition-all duration-200 aspect-[4/3]",
                    isSelected ? "border-booth-accent ring-1 ring-booth-accent/50" : "border-booth-border hover:border-booth-muted",
                  ].join(" ")}
                >
                  <FrameCardPreview preview={frame.preview} name={frame.name} />
                  <div className="absolute bottom-0 inset-x-0 px-1 py-0.5 bg-gradient-to-t from-booth-black/90 to-transparent flex items-center justify-center gap-1">
                    <span className="text-booth-accent flex-shrink-0">
                      {getFrameIcon(frame.id, "w-2.5 h-2.5")}
                    </span>
                    <p className="text-booth-warm text-[8px] font-mono truncate leading-none">{frame.name}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-booth-accent flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-booth-black" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom upload */}
        <div className="space-y-1.5">
          <label className="text-booth-muted text-[10px] font-mono tracking-widest uppercase font-semibold">Upload Frame Custom</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "rounded-lg border border-dashed cursor-pointer transition-all duration-200 p-3 text-center",
              isDragging ? "border-booth-accent bg-booth-accent/5" : "border-booth-border bg-booth-dark/50 hover:border-booth-muted",
            ].join(" ")}
          >
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {isDetecting ? (
              <div className="flex items-center gap-1.5 justify-center py-1">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-booth-accent border-t-transparent animate-spin" />
                <span className="text-booth-muted text-[10px] font-mono">Memproses...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 justify-center py-1">
                <Upload className="w-4 h-4 text-booth-muted" />
                <p className="text-booth-warm text-xs font-semibold">Upload PNG / Green Screen</p>
                <p className="text-booth-muted text-[9px] leading-none">Klik atau Seret file ke sini</p>
              </div>
            )}
          </div>
          {detectError && <p className="text-red-400 text-[9px] font-mono">{detectError}</p>}
        </div>

        {/* Custom Frames List */}
        {customFrames.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-booth-muted text-[10px] font-mono tracking-widest uppercase font-semibold">Frame Custom Anda</label>
            <div className="grid grid-cols-2 gap-2">
              {customFrames.map((custom) => {
                const isSelected = currentFrame && currentFrame.id === custom.id;
                return (
                  <div key={custom.id} className="relative aspect-[4/3] group">
                    <button
                      onClick={() => onSelectFrame(custom)}
                      className={[
                        "relative w-full h-full rounded-lg overflow-hidden border transition-all duration-200",
                        isSelected ? "border-booth-accent ring-1 ring-booth-accent/50" : "border-booth-border hover:border-booth-muted",
                      ].join(" ")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={custom.thumbnailUrl || custom.imageUrl} alt={custom.name} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 px-1 py-0.5 bg-gradient-to-t from-booth-black/90 to-transparent flex items-center justify-center gap-1">
                        <Upload className="w-2 h-2 text-booth-accent flex-shrink-0" />
                        <p className="text-booth-warm text-[8px] font-mono truncate leading-none">{custom.name}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-booth-accent flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-booth-black" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Hapus frame "${custom.name}"?`)) {
                          onDeleteCustomFrame(custom.id);
                        }
                      }}
                      className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      title="Hapus Frame"
                    >
                      <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-booth-border bg-booth-dark/60 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg font-mono text-xs tracking-wider uppercase bg-booth-accent text-booth-black font-bold hover:brightness-105 transition-all"
        >
          Selesai
        </button>
      </div>

      {/* Setup Custom Frame Modal — Scrollable fix with items-start sm:items-center and overflow-y-auto */}
      {setupFrame && (
        <div className="absolute inset-0 z-[60] bg-booth-black/95 backdrop-blur-sm flex justify-center items-start sm:items-center p-4 overflow-y-auto">
          <div className="bg-booth-dark border border-booth-border/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in my-auto">
            <h3 className="text-booth-warm font-display text-base mb-1">Konfigurasi Frame Custom</h3>
            
            <div className="w-full aspect-video bg-booth-black/50 rounded-xl mb-4 border border-booth-border/30 flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setupFrame.objectUrl} className="max-w-full max-h-full object-contain" alt="Preview" />
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-booth-muted text-[10px] font-mono uppercase tracking-widest block">Nama Frame</label>
                <input 
                  type="text" 
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="w-full bg-booth-black border border-booth-border/50 rounded-lg px-3 py-2.5 text-booth-warm font-mono text-sm focus:outline-none focus:border-booth-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-booth-muted text-[10px] font-mono uppercase tracking-widest block">Dukungan Orientasi</label>
                <div className="flex gap-2 font-mono">
                  <button onClick={() => setSetupOrientation("portrait")} className={`flex-1 py-2 rounded-lg border text-[10px] ${setupOrientation === "portrait" ? "border-booth-accent text-booth-accent font-bold" : "border-booth-border/40 text-booth-muted"}`}>Portrait</button>
                  <button onClick={() => setSetupOrientation("landscape")} className={`flex-1 py-2 rounded-lg border text-[10px] ${setupOrientation === "landscape" ? "border-booth-accent text-booth-accent font-bold" : "border-booth-border/40 text-booth-muted"}`}>Landscape</button>
                  <button onClick={() => setSetupOrientation("both")} className={`flex-1 py-2 rounded-lg border text-[10px] ${setupOrientation === "both" ? "border-booth-accent text-booth-accent font-bold" : "border-booth-border/40 text-booth-muted"}`}>Keduanya</button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setSetupFrame(null)} className="flex-1 py-2.5 rounded-xl border border-booth-border text-booth-muted font-mono text-xs uppercase hover:text-booth-warm">Batal</button>
              <button 
                onClick={() => {
                  const newId = `custom-${Date.now()}`;
                  onSelectFrame({
                    id: newId,
                    name: setupName || "Custom Frame",
                    imageUrl: setupFrame.objectUrl,
                    hasChromaKey: false,
                    thumbnailUrl: setupFrame.objectUrl,
                    supportedOrientations: setupOrientation === "both" ? ["portrait", "landscape"] : [setupOrientation],
                  });
                  onAddCustomFrame({
                    id: newId,
                    name: setupName || "Custom Frame",
                    imageUrl: setupFrame.objectUrl,
                    hasChromaKey: false,
                    thumbnailUrl: setupFrame.objectUrl,
                    supportedOrientations: setupOrientation === "both" ? ["portrait", "landscape"] : [setupOrientation],
                  });
                  setSetupFrame(null);
                }}
                className="flex-[2] py-2.5 rounded-xl bg-booth-accent text-booth-black font-mono font-bold text-xs uppercase hover:brightness-110"
              >
                Gunakan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
