"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoFrame, PhotoMode, StripOrientation } from "@/types/photobooth";
import {
  composePhotoStrip,
  downloadDataUrl,
  generateFilename,
  composeWithFrame,
  generateSlideshowVideo,
  generateSlideshowGif,
} from "@/lib/frameComposer";
import { PhotoEditor, FILTER_PRESETS, applyFilterToCanvas } from "./PhotoEditor";
import { PRESET_FRAMES, makeFrame } from "./FrameSelector";
import { saveCapturedSession } from "@/lib/db";

function cropTo169(photoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = img.naturalWidth;
      const h = Math.round(w * 9 / 16);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get context for crop"));
        return;
      }
      ctx.drawImage(img, 0, (img.naturalHeight - h) / 2, w, h, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.93));
    };
    img.onerror = reject;
    img.src = photoUrl;
  });
}

interface PhotoPreviewProps {
  photos: string[];
  editedPhotos: string[];
  onSaveEdits: (
    newPhotos: string[],
    newFrame: PhotoFrame | null,
    newOrientation: StripOrientation,
    newLabel: string
  ) => void;
  mode: PhotoMode;
  onClose: () => void;
  onRetake: () => void;
  onChangeFrame: () => void;
  stripOrientation: StripOrientation;
  frame: PhotoFrame | null;
  label?: string;
  customFrames: PhotoFrame[];
}

export function PhotoPreview({
  photos: initialPhotos,
  editedPhotos,
  onSaveEdits,
  mode,
  onClose,
  onRetake,
  onChangeFrame,
  stripOrientation,
  frame,
  label,
  customFrames,
}: PhotoPreviewProps) {
  const [localEditedPhotos, setLocalEditedPhotos] = useState<string[]>(editedPhotos);
  const [localOrientation, setLocalOrientation] = useState<StripOrientation>(stripOrientation);
  const [localFrame, setLocalFrame] = useState<PhotoFrame | null>(frame);
  const [localLabel, setLocalLabel] = useState<string>(
    label ?? `Photobooth · ${new Date().getFullYear()}`
  );
  
  const [activeVersion, setActiveVersion] = useState<"original" | "edited">("edited");
  const [showSettings, setShowSettings] = useState(false);

  // Reset orientation when changing modes
  useEffect(() => {
    setLocalOrientation(stripOrientation);
  }, [stripOrientation]);

  // Ensure localOrientation is valid for the current frame
  useEffect(() => {
    if (localFrame?.supportedOrientations && !localFrame.supportedOrientations.includes(localOrientation)) {
      const fallback = localFrame.supportedOrientations.find(
        (o): o is StripOrientation => o === "portrait" || o === "landscape"
      ) ?? "portrait";
      setLocalOrientation(fallback);
    }
  }, [localFrame, localOrientation]);

  const currentPhotos = activeVersion === "original" ? initialPhotos : localEditedPhotos;
  const currentFrame = activeVersion === "original" ? frame : localFrame;
  const currentOrientation = activeVersion === "original" ? stripOrientation : localOrientation;
  const currentLabel = activeVersion === "original" ? (label ?? `Photobooth · ${new Date().getFullYear()}`) : localLabel;

  const [stripDataUrl, setStripDataUrl] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Video / GIF slideshow state
  const [activeTab, setActiveTab] = useState<"photo" | "video">("photo");
  const [framedPhotos, setFramedPhotos] = useState<string[]>([]);
  const [slideshowVideoUrl, setSlideshowVideoUrl] = useState<string | null>(null);
  const [slideshowGifUrl, setSlideshowGifUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [gifIndex, setGifIndex] = useState(0);

  // Zoom / detail view
  const [showStripZoom, setShowStripZoom] = useState(false);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  // Editor
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Strip-level filter & effects state
  const [stripFilter, setStripFilter] = useState("normal");
  const [stripBrightness, setStripBrightness] = useState(0);
  const [stripContrast, setStripContrast] = useState(0);
  const [isApplyingStripFilter, setIsApplyingStripFilter] = useState(false);

  // Ref for filter row scrolling
  const stripFilterRowRef = useRef<HTMLDivElement>(null);

  // Cloud save states
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [cloudShareUrl, setCloudShareUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentStripFilterCSS = (() => {
    const preset = FILTER_PRESETS.find((f) => f.id === stripFilter) ?? FILTER_PRESETS[0];
    const parts = [preset.css];
    if (stripBrightness !== 0) parts.push(`brightness(${(1 + stripBrightness / 100).toFixed(2)})`);
    if (stripContrast !== 0) parts.push(`contrast(${(1 + stripContrast / 100).toFixed(2)})`);
    return parts.filter(Boolean).join(" ");
  })();

  const handleSaveToCloud = useCallback(async () => {
    setIsSavingToCloud(true);
    setSaveError(null);
    try {
      let finalStripUrl: string | null = null;
      if (mode === "strip") {
        const isCustomFrame = currentFrame && (currentFrame.id === "custom-upload" || currentFrame.id.startsWith("custom-"));
        const photosToCompose = (isCustomFrame && framedPhotos.length === currentPhotos.length) ? framedPhotos : currentPhotos;
        finalStripUrl =
          stripDataUrl ??
          (await composePhotoStrip({
            photos: photosToCompose,
            photoWidth: 600,
            orientation: currentOrientation,
            frameId: isCustomFrame ? "none" : (currentFrame ? currentFrame.id : "none"),
            label: currentLabel,
          }));
      }

      const sessionId = await saveCapturedSession(mode, currentPhotos, finalStripUrl);
      
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/gallery?id=${sessionId}`;
      setCloudShareUrl(shareUrl);
    } catch (err) {
      console.error("Gagal menyimpan ke cloud:", err);
      setSaveError("Gagal menyimpan ke cloud Firebase. Coba lagi.");
    } finally {
      setIsSavingToCloud(false);
    }
  }, [mode, currentPhotos, stripDataUrl, currentOrientation, currentFrame, currentLabel, framedPhotos]);

  // ── Auto-save local changes back to parent ─────────────────────────────────
  useEffect(() => {
    onSaveEdits(localEditedPhotos, localFrame, localOrientation, localLabel);
  }, [localEditedPhotos, localFrame, localOrientation, localLabel, onSaveEdits]);

  // ── Compose strip whenever photos change ──────────────────────────────────
  useEffect(() => {
    if (mode !== "strip" || currentPhotos.length < 2) return;
    setIsComposing(true);
    setStripDataUrl(null);

    const isCustomFrame = currentFrame && (currentFrame.id === "custom-upload" || currentFrame.id.startsWith("custom-"));
    if (isCustomFrame && framedPhotos.length !== currentPhotos.length) {
      setIsComposing(false);
      return;
    }

    composePhotoStrip({
      photos: isCustomFrame ? framedPhotos : currentPhotos,
      photoWidth: 600,
      gap: 12,
      padding: 20,
      backgroundColor: "#0A0A0F",
      label: currentLabel,
      orientation: currentOrientation,
      frameId: isCustomFrame ? "none" : (currentFrame ? currentFrame.id : "none"),
    })
      .then(setStripDataUrl)
      .catch(console.error)
      .finally(() => setIsComposing(false));
  }, [currentPhotos, mode, currentOrientation, currentFrame, currentLabel, framedPhotos]);

  // ── Pre-composite framed photos ──────────────────────────────────────────
  useEffect(() => {
    if (currentPhotos.length === 0) {
      setFramedPhotos([]);
      return;
    }
    
    const processPhotos = async () => {
      return Promise.all(
        currentPhotos.map(async (photo) => {
          try {
            // Force 16:9 crop so detail matches slot proportions
            const cropped = await cropTo169(photo);
            if (currentFrame && currentFrame.id !== "none") {
              return await composeWithFrame({
                photoDataUrl: cropped,
                frameDataUrl: currentFrame.imageUrl,
                hasChromaKey: currentFrame.hasChromaKey,
                outputWidth: 800,
              });
            }
            return cropped;
          } catch (e) {
            console.error("[PhotoPreview] Framing failed:", e);
            return photo;
          }
        })
      );
    };

    processPhotos().then(setFramedPhotos);
  }, [currentPhotos, currentFrame]);

  // ── Generate slideshow video & GIF ────────────────────────────────────────
  useEffect(() => {
    if (framedPhotos.length === 0) return;
    
    setIsGeneratingVideo(true);
    
    generateSlideshowVideo(framedPhotos)
      .then((url) => {
        setSlideshowVideoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch(console.error)
      .finally(() => setIsGeneratingVideo(false));

    generateSlideshowGif(framedPhotos)
      .then((url) => {
        setSlideshowGifUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch(console.error);
  }, [framedPhotos]);

  // ── Cleanup object URLs on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (slideshowVideoUrl) URL.revokeObjectURL(slideshowVideoUrl);
      if (slideshowGifUrl) URL.revokeObjectURL(slideshowGifUrl);
    };
  }, [slideshowVideoUrl, slideshowGifUrl]);

  // ── Cycle GIF index ────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentPhotos.length <= 1) return;
    const interval = setInterval(() => {
      setGifIndex((prev) => (prev + 1) % currentPhotos.length);
    }, 600);
    return () => clearInterval(interval);
  }, [currentPhotos.length]);

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingIndex !== null) { setEditingIndex(null); return; }
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, editingIndex]);

  // ── Photo editor callback ─────────────────────────────────────────────────
  const handleEditorSave = useCallback(
    (index: number, editedUrl: string) => {
      setLocalEditedPhotos((prev) => {
        const next = [...prev];
        next[index] = editedUrl;
        return next;
      });
      setEditingIndex(null);
    },
    []
  );

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      if (mode === "single") {
        const url = (currentFrame && currentFrame.id !== "none") ? (framedPhotos[0] || currentPhotos[0]) : currentPhotos[0];
        downloadDataUrl(url, generateFilename("photo"));
      } else {
        const isCustomFrame = currentFrame && (currentFrame.id === "custom-upload" || currentFrame.id.startsWith("custom-"));
        const photosToCompose = (isCustomFrame && framedPhotos.length === currentPhotos.length) ? framedPhotos : currentPhotos;
        const url =
          stripDataUrl ??
          (await composePhotoStrip({
            photos: photosToCompose,
            photoWidth: 600,
            orientation: currentOrientation,
            frameId: isCustomFrame ? "none" : (currentFrame ? currentFrame.id : "none"),
            label: currentLabel,
          }));
        downloadDataUrl(url, generateFilename("strip"));
      }
    } finally {
      setIsDownloading(false);
    }
  }, [mode, currentPhotos, stripDataUrl, currentOrientation, currentFrame, currentLabel, framedPhotos]);

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = useCallback(async () => {
    let url = "";
    if (mode === "single") {
      url = (currentFrame && currentFrame.id !== "none") ? (framedPhotos[0] || currentPhotos[0]) : currentPhotos[0];
    } else {
      const isCustomFrame = currentFrame && (currentFrame.id === "custom-upload" || currentFrame.id.startsWith("custom-"));
      const photosToCompose = (isCustomFrame && framedPhotos.length === currentPhotos.length) ? framedPhotos : currentPhotos;
      url =
        stripDataUrl ??
        (await composePhotoStrip({
          photos: photosToCompose,
          photoWidth: 600,
          orientation: currentOrientation,
          frameId: isCustomFrame ? "none" : (currentFrame ? currentFrame.id : "none"),
          label: currentLabel,
        }));
    }

    if (!url) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir.");
      return;
    }

    const isPortrait = mode === "strip" && currentOrientation === "portrait";
    const pageOrientation = isPortrait ? "portrait" : "landscape";

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Photobooth</title>
          <style>
            @page {
              size: ${pageOrientation};
              margin: 0;
            }
            body {
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100vw;
              height: 100vh;
              background-color: white;
              box-sizing: border-box;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              ${mode === "strip" ? `aspect-ratio: ${isPortrait ? "9/16" : "16/9"};` : ""}
            }
          </style>
        </head>
        <body>
          <img src="${url}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [mode, currentPhotos, stripDataUrl, currentOrientation, currentFrame, currentLabel, framedPhotos]);

  // ── If editor is open ─────────────────────────────────────────────────────
  if (editingIndex !== null) {
    return (
      <PhotoEditor
        photoUrl={localEditedPhotos[editingIndex]}
        onSave={(url) => handleEditorSave(editingIndex, url)}
        onClose={() => setEditingIndex(null)}
      />
    );
  }

  // ── Full Strip Zoom modal ──────────────────────────────────────────────────
  if (showStripZoom && stripDataUrl) {
    return (
      <StripZoomModal
        stripUrl={stripDataUrl}
        onClose={() => setShowStripZoom(false)}
        isPortrait={mode === "strip" && currentOrientation === "portrait"}
        filterCSS={currentStripFilterCSS}
      />
    );
  }

  // ── View Detail Photo modal ────────────────────────────────────────────────
  if (viewingIndex !== null) {
    return (
      <div className="fixed inset-0 z-[55] bg-booth-black/95 backdrop-blur-md flex flex-col p-4 sm:p-8 animate-fade-in">
        <div className="flex justify-between items-center pb-4">
          <button
            onClick={() => setViewingIndex(null)}
            className="text-booth-muted hover:text-booth-warm flex items-center gap-2 font-mono text-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </button>
          <span className="text-booth-warm font-mono text-sm tracking-widest uppercase">Foto {viewingIndex + 1}</span>
          <div className="w-20" /> {/* Spacer */}
        </div>
        
        <div className="flex-1 min-h-0 flex items-center justify-center relative py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={localEditedPhotos[viewingIndex]} 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
            alt="Detail" 
          />
        </div>

        <div className="pt-4 pb-2 flex justify-center">
          <button
            onClick={() => {
              setActiveVersion("edited");
              setEditingIndex(viewingIndex);
              setViewingIndex(null);
            }}
            className="px-8 py-3 rounded-full bg-booth-accent text-booth-black font-mono font-bold tracking-widest uppercase hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(200,169,110,0.3)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Foto Ini
          </button>
        </div>
      </div>
    );
  }



  const displayUrl =
    mode === "single" ? (framedPhotos[0] || currentPhotos[0]) : stripDataUrl ?? currentPhotos[currentPhotos.length - 1];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-0 sm:p-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Preview foto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-booth-black/90 backdrop-blur-md cursor-pointer"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg my-auto animate-slide-up sm:animate-fade-in z-10 px-4 sm:px-0 flex flex-col">
        <div className="bg-booth-panel border border-booth-border rounded-2xl sm:rounded-2xl overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h2 className="text-booth-warm font-display text-lg font-semibold">
                {mode === "single" ? "Foto Anda" : "Photo Strip"}
              </h2>
              <p className="text-booth-muted text-xs font-mono mt-0.5">
                {mode === "strip" ? `${currentPhotos.length} foto · tap untuk detail` : "Tap foto untuk edit"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-booth-border flex items-center justify-center text-booth-muted hover:text-booth-warm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Photo display */}
          <div className="px-5 pb-3">
            {/* Version Selector (Original vs Edited) */}
            <div className="flex bg-booth-dark/60 rounded-xl p-1 border border-booth-border/30 mb-4 gap-1">
              <button
                type="button"
                onClick={() => setActiveVersion("original")}
                className={`flex-1 py-1.5 text-xs font-mono tracking-widest uppercase rounded-lg transition-all ${
                  activeVersion === "original"
                    ? "bg-booth-accent text-booth-black font-bold shadow-md"
                    : "text-booth-muted hover:text-booth-warm"
                }`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => setActiveVersion("edited")}
                className={`flex-1 py-1.5 text-xs font-mono tracking-widest uppercase rounded-lg transition-all ${
                  activeVersion === "edited"
                    ? "bg-booth-accent text-booth-black font-bold shadow-md"
                    : "text-booth-muted hover:text-booth-warm"
                }`}
              >
                Edited
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-booth-border/30 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab("photo")}
                className={[
                  "flex-1 pb-2 text-xs font-mono tracking-wider uppercase border-b-2 transition-all font-semibold",
                  activeTab === "photo"
                    ? "border-booth-accent text-booth-accent"
                    : "border-transparent text-booth-muted hover:text-booth-warm",
                ].join(" ")}
              >
                Foto
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("video")}
                className={[
                  "flex-1 pb-2 text-xs font-mono tracking-wider uppercase border-b-2 transition-all font-semibold",
                  activeTab === "video"
                    ? "border-booth-accent text-booth-accent"
                    : "border-transparent text-booth-muted hover:text-booth-warm",
                ].join(" ")}
              >
                Video &amp; GIF
              </button>
            </div>

            {activeTab === "photo" ? (
              mode === "strip" && currentPhotos.length > 1 ? (
                <StripPreview
                  photos={currentPhotos}
                  framedPhotos={framedPhotos}
                  stripUrl={stripDataUrl}
                  isComposing={isComposing}
                  onThumbnailClick={(i) => {
                    setViewingIndex(i);
                  }}
                  onStripClick={() => setShowStripZoom(true)}
                  frame={currentFrame}
                  filterCSS={currentStripFilterCSS}
                />
              ) : (
                /* Single photo — clickable */
                <button
                  id="preview-photo-btn"
                  onClick={() => setViewingIndex(0)}
                  className="relative w-full rounded-lg overflow-hidden bg-booth-dark border border-booth-border group cursor-zoom-in"
                >
                  {displayUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayUrl}
                        alt="Captured photo"
                        className="w-full h-auto max-h-[50vh] object-contain"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-booth-black/0 group-hover:bg-booth-black/30 transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-booth-black/70 backdrop-blur-sm rounded-full px-3 py-1.5">
                          <svg className="w-3.5 h-3.5 text-booth-warm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                          <span className="text-booth-warm text-[11px] font-mono">Detail &amp; Edit</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-48 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-2 border-booth-accent border-t-transparent animate-spin" />
                    </div>
                  )}
                </button>
              )
            ) : (
              /* Video & GIF Tab */
              <div className="space-y-4 animate-fade-in">
                {/* Video Loop Player */}
                <div className="relative w-full rounded-lg overflow-hidden bg-booth-dark border border-booth-border">
                  {isGeneratingVideo ? (
                    <div className="h-48 flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-booth-accent border-t-transparent animate-spin" />
                      <p className="text-booth-muted text-xs font-mono tracking-widest uppercase">Memproses video...</p>
                    </div>
                  ) : slideshowVideoUrl ? (
                    <video
                      src={slideshowVideoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                      className="w-full h-auto max-h-[35vh] object-contain mx-auto"
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-booth-muted text-xs font-mono">
                      Gagal memuat video
                    </div>
                  )}
                </div>

                {/* Simulated GIF loop */}
                <div className="relative w-full rounded-lg overflow-hidden bg-booth-dark border border-booth-border/50 p-2 flex flex-col items-center gap-2">
                  <span className="text-[9px] font-mono text-booth-muted tracking-wider uppercase">GIF Loop</span>
                  <div className="relative w-full max-w-[200px] aspect-[4/3] rounded overflow-hidden shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentPhotos[gifIndex]}
                      alt="GIF Cycle"
                      className="w-full h-full object-cover"
                    />
                    {currentFrame && currentFrame.id !== "none" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentFrame.imageUrl}
                        alt="Frame overlay"
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                        style={{ opacity: 0.95 }}
                      />
                    )}
                  </div>
                </div>
                
                {/* Download actions */}
                <div className="flex gap-2 w-full">
                  {slideshowVideoUrl && (
                    <button
                      type="button"
                      onClick={() => downloadDataUrl(slideshowVideoUrl, generateFilename("slideshow", "webm"))}
                      className="flex-1 py-2.5 rounded-xl border border-booth-accent/50 text-booth-accent hover:bg-booth-accent/10 font-mono text-[11px] tracking-widest uppercase transition-all flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Unduh Video
                    </button>
                  )}
                  {slideshowGifUrl && (
                    <button
                      type="button"
                      onClick={() => downloadDataUrl(slideshowGifUrl, generateFilename("slideshow", "gif"))}
                      className="flex-1 py-2.5 rounded-xl border border-booth-accent/50 text-booth-accent hover:bg-booth-accent/10 font-mono text-[11px] tracking-widest uppercase transition-all flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Unduh GIF
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Editing Section (Only in strip mode + edited version) */}
          {mode === "strip" && (
            <div className="px-5 pb-2">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-between py-2 border-t border-booth-border/20 text-booth-muted hover:text-booth-warm transition-colors font-mono text-xs uppercase"
              >
                <span>Edit Pengaturan Strip</span>
                <span className="text-booth-accent font-bold">{showSettings ? "[-]" : "[+]"}</span>
              </button>
              
              {showSettings && (
                <div className="mt-3 space-y-5 p-3 bg-booth-dark/50 border border-booth-border/30 rounded-xl animate-fade-in text-left">

                  {/* 1. Ubah Tipe Frame — Prominent */}
                  <div className="space-y-2">
                    <label className="text-booth-warm text-[11px] font-mono tracking-widest uppercase block font-semibold">Ubah Tipe Frame</label>
                    <div className="flex gap-2">
                      {(!currentFrame?.supportedOrientations || currentFrame.supportedOrientations.includes("portrait")) && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveVersion("edited");
                            setLocalOrientation("portrait");
                          }}
                          className={`flex-1 py-3 rounded-xl border-2 text-xs font-mono tracking-wider uppercase transition-all flex flex-col items-center gap-1.5 ${
                            localOrientation === "portrait"
                              ? "border-booth-accent bg-booth-accent/15 text-booth-accent font-bold shadow-md"
                              : "border-booth-border/40 text-booth-muted hover:text-booth-warm hover:border-booth-muted"
                          }`}
                        >
                          <svg className="w-5 h-7" viewBox="0 0 20 28" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="1" y="1" width="18" height="26" rx="2" />
                            <line x1="5" y1="6" x2="15" y2="6" strokeWidth="1" opacity="0.4" />
                            <line x1="5" y1="11" x2="15" y2="11" strokeWidth="1" opacity="0.4" />
                            <line x1="5" y1="16" x2="15" y2="16" strokeWidth="1" opacity="0.4" />
                            <line x1="5" y1="21" x2="15" y2="21" strokeWidth="1" opacity="0.4" />
                          </svg>
                          Portrait (9:16)
                        </button>
                      )}
                      {(!currentFrame?.supportedOrientations || currentFrame.supportedOrientations.includes("landscape")) && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveVersion("edited");
                            setLocalOrientation("landscape");
                          }}
                          className={`flex-1 py-3 rounded-xl border-2 text-xs font-mono tracking-wider uppercase transition-all flex flex-col items-center gap-1.5 ${
                            localOrientation === "landscape"
                              ? "border-booth-accent bg-booth-accent/15 text-booth-accent font-bold shadow-md"
                              : "border-booth-border/40 text-booth-muted hover:text-booth-warm hover:border-booth-muted"
                          }`}
                        >
                          <svg className="w-7 h-5" viewBox="0 0 28 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="1" y="1" width="26" height="18" rx="2" />
                            <line x1="6" y1="5" x2="6" y2="15" strokeWidth="1" opacity="0.4" />
                            <line x1="11" y1="5" x2="11" y2="15" strokeWidth="1" opacity="0.4" />
                            <line x1="16" y1="5" x2="16" y2="15" strokeWidth="1" opacity="0.4" />
                            <line x1="21" y1="5" x2="21" y2="15" strokeWidth="1" opacity="0.4" />
                          </svg>
                          Landscape (16:9)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. Filter Strip — Horizontal scroll */}
                  <div className="space-y-2">
                    <label className="text-booth-warm text-[11px] font-mono tracking-widest uppercase block font-semibold">Filter Strip</label>
                    <div
                      ref={stripFilterRowRef}
                      className="flex gap-2 overflow-x-auto py-2 scrollbar-none"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {FILTER_PRESETS.map((f) => {
                        const isActive = stripFilter === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setActiveVersion("edited");
                              setStripFilter(f.id);
                            }}
                            className={[
                              "flex flex-col items-center gap-1 flex-shrink-0 w-12 transition-all duration-200",
                              isActive ? "opacity-100" : "opacity-50 hover:opacity-75",
                            ].join(" ")}
                          >
                            <div
                              className={[
                                "w-10 h-10 rounded-lg overflow-hidden border-2 transition-all",
                                isActive ? "border-booth-accent" : "border-booth-border/50",
                              ].join(" ")}
                            >
                              {initialPhotos[0] && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={initialPhotos[0]}
                                  alt={f.name}
                                  className="w-full h-full object-cover"
                                  style={{ filter: f.css || "none" }}
                                  draggable={false}
                                />
                              )}
                            </div>
                            <span
                              className={`text-[8px] font-mono tracking-wide leading-none ${isActive ? "text-booth-accent" : "text-booth-muted"}`}
                            >
                              {f.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Efek Strip — Brightness & Contrast */}
                  <div className="space-y-2">
                    <label className="text-booth-warm text-[11px] font-mono tracking-widest uppercase block font-semibold">Efek Strip</label>
                    <div className="space-y-2.5">
                      {/* Brightness */}
                      <div className="flex items-center gap-2">
                        <span className="text-booth-muted text-[10px] font-mono w-16 text-right shrink-0">
                          Cerah{" "}
                          <span className={stripBrightness !== 0 ? "text-booth-accent" : ""}>
                            {stripBrightness > 0 ? `+${stripBrightness}` : stripBrightness}
                          </span>
                        </span>
                        <input
                          type="range"
                          min={-50}
                          max={50}
                          value={stripBrightness}
                          onChange={(e) => {
                            setActiveVersion("edited");
                            setStripBrightness(Number(e.target.value));
                          }}
                          className="flex-1 accent-[#C8A96E] h-1 rounded-full bg-booth-border cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setStripBrightness(0)}
                          className="text-[9px] text-booth-muted hover:text-booth-warm font-mono shrink-0"
                        >
                          Reset
                        </button>
                      </div>
                      {/* Contrast */}
                      <div className="flex items-center gap-2">
                        <span className="text-booth-muted text-[10px] font-mono w-16 text-right shrink-0">
                          Kontras{" "}
                          <span className={stripContrast !== 0 ? "text-booth-accent" : ""}>
                            {stripContrast > 0 ? `+${stripContrast}` : stripContrast}
                          </span>
                        </span>
                        <input
                          type="range"
                          min={-50}
                          max={50}
                          value={stripContrast}
                          onChange={(e) => {
                            setActiveVersion("edited");
                            setStripContrast(Number(e.target.value));
                          }}
                          className="flex-1 accent-[#C8A96E] h-1 rounded-full bg-booth-border cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setStripContrast(0)}
                          className="text-[9px] text-booth-muted hover:text-booth-warm font-mono shrink-0"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Apply Strip Filter Button */}
                  {(stripFilter !== "normal" || stripBrightness !== 0 || stripContrast !== 0) && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={isApplyingStripFilter}
                        onClick={async () => {
                          setIsApplyingStripFilter(true);
                          try {
                            const preset = FILTER_PRESETS.find((f) => f.id === stripFilter);
                            const parts = [preset?.css ?? ""];
                            if (stripBrightness !== 0) parts.push(`brightness(${(1 + stripBrightness / 100).toFixed(2)})`);
                            if (stripContrast !== 0) parts.push(`contrast(${(1 + stripContrast / 100).toFixed(2)})`);
                            const filterCSS = parts.filter(Boolean).join(" ");

                            const newPhotos = await Promise.all(
                              localEditedPhotos.map((photo) => applyFilterToCanvas(photo, filterCSS))
                            );
                            setLocalEditedPhotos(newPhotos);
                            setActiveVersion("edited");
                            // Reset strip controls after applying
                            setStripFilter("normal");
                            setStripBrightness(0);
                            setStripContrast(0);
                          } catch (err) {
                            console.error("Strip filter application failed:", err);
                          } finally {
                            setIsApplyingStripFilter(false);
                          }
                        }}
                        className="w-full py-2.5 rounded-xl bg-booth-accent text-booth-black font-mono text-[11px] tracking-widest uppercase font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isApplyingStripFilter ? (
                          <>
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-booth-black border-t-transparent animate-spin" />
                            Menerapkan...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Terapkan Filter ke Semua Foto
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStripFilter("normal");
                          setStripBrightness(0);
                          setStripContrast(0);
                        }}
                        className="w-full text-center text-[10px] font-mono text-booth-muted hover:text-booth-warm transition-colors"
                      >
                        Reset filter strip
                      </button>
                    </div>
                  )}

                  {/* 4. Custom Label Text */}
                  <div className="space-y-1.5">
                    <label className="text-booth-muted text-[10px] font-mono tracking-widest uppercase block">Teks Label Bawah</label>
                    <input
                      type="text"
                      value={localLabel}
                      onChange={(e) => {
                        setActiveVersion("edited");
                        setLocalLabel(e.target.value);
                      }}
                      className="w-full bg-booth-dark border border-booth-border/50 rounded-lg px-3 py-2 text-xs font-mono text-booth-warm focus:outline-none focus:border-booth-accent"
                      placeholder="Ketik label strip..."
                    />
                  </div>

                  {/* 5. Preset Frame Theme Selector */}
                  <div className="space-y-1.5">
                    <label className="text-booth-muted text-[10px] font-mono tracking-widest uppercase block">Pilih Tema Frame</label>
                    <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-booth-black/60 border border-booth-border/30 rounded-lg scrollbar-thin">
                      {PRESET_FRAMES.map((f) => {
                        const isSelected = localFrame?.id === f.id || (!localFrame && f.id === "none");
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setActiveVersion("edited");
                              if (f.id === "none") {
                                setLocalFrame(null);
                              } else {
                                const imageUrl = makeFrame(f.id);
                                setLocalFrame({ id: f.id, name: f.name, imageUrl, hasChromaKey: false });
                              }
                            }}
                            className={`py-1.5 px-2 rounded border text-[10px] font-mono truncate transition-all ${
                              isSelected
                                ? "border-booth-accent bg-booth-accent/15 text-booth-accent font-semibold"
                                : "border-booth-border/30 text-booth-muted hover:text-booth-warm hover:border-booth-border/60"
                            }`}
                          >
                            {f.name}
                          </button>
                        );
                      })}
                      {customFrames.map((custom) => {
                        const isSelected = localFrame?.id === custom.id;
                        return (
                          <button
                            key={custom.id}
                            type="button"
                            onClick={() => {
                              setActiveVersion("edited");
                              setLocalFrame(custom);
                            }}
                            className={`py-1.5 px-2 rounded border text-[10px] font-mono truncate transition-all ${
                              isSelected
                                ? "border-booth-accent bg-booth-accent/15 text-booth-accent font-semibold"
                                : "border-booth-border/30 text-booth-muted hover:text-booth-warm hover:border-booth-border/60"
                            }`}
                          >
                            {custom.name} (Custom)
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reset all strip edits */}
                  <button
                    type="button"
                    onClick={() => {
                      setLocalEditedPhotos([...initialPhotos]);
                      setLocalOrientation(stripOrientation);
                      setLocalFrame(frame);
                      setLocalLabel(label ?? `Photobooth · ${new Date().getFullYear()}`);
                      setStripFilter("normal");
                      setStripBrightness(0);
                      setStripContrast(0);
                      setActiveVersion("original");
                    }}
                    className="w-full text-center text-[10px] font-mono text-booth-muted hover:text-red-400 transition-colors pt-1 border-t border-booth-border/10"
                  >
                    Reset semua ke Original
                  </button>
                  
                  <div className="text-[9px] font-mono text-booth-muted text-center pt-1 border-t border-booth-border/10">
                    ✓ Perubahan disimpan otomatis pada versi &quot;Edited&quot;
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Primary actions */}
          <div className="flex gap-2 px-5 pt-2 pb-3">
            <button
              onClick={onRetake}
              className="flex-1 py-3 rounded-xl border border-booth-border text-booth-muted hover:text-booth-warm hover:border-booth-muted font-mono text-xs tracking-widest uppercase transition-all duration-200"
            >
              Ulangi
            </button>
            <button
              onClick={handlePrint}
              disabled={isComposing || (mode === "strip" && !stripDataUrl)}
              className="flex-1 py-3 rounded-xl border border-booth-accent/60 text-booth-accent hover:bg-booth-accent/10 font-mono text-xs tracking-widest uppercase transition-all duration-200 disabled:opacity-40"
            >
              Cetak
            </button>
            <button
              id="preview-download-btn"
              onClick={handleDownload}
              disabled={isDownloading || isComposing}
              className={[
                "flex-1 py-3 rounded-xl font-mono text-xs tracking-widest uppercase transition-all duration-200",
                isDownloading || isComposing
                  ? "bg-booth-border text-booth-muted cursor-not-allowed"
                  : "bg-booth-accent text-booth-black hover:brightness-110 active:scale-95",
              ].join(" ")}
            >
              {isDownloading ? "Unduh..." : isComposing ? "Proses..." : "Unduh"}
            </button>
          </div>

          {/* Secondary actions */}
          <div className="flex flex-col gap-3 px-5 pb-6">
            {/* Save to Cloud Section */}
            {!cloudShareUrl ? (
              <button
                type="button"
                onClick={handleSaveToCloud}
                disabled={isSavingToCloud || isComposing}
                className="w-full py-3 rounded-xl border border-booth-accent bg-booth-accent/5 hover:bg-booth-accent/15 text-booth-accent font-mono text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSavingToCloud ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-booth-accent border-t-transparent animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    Simpan ke Cloud ☁️
                  </>
                )}
              </button>
            ) : (
              <div className="bg-booth-dark/60 border border-booth-accent/30 rounded-xl p-3 flex flex-col gap-2 animate-fade-in text-left">
                <span className="text-booth-accent text-[10px] font-mono font-semibold tracking-wider uppercase">Tautan Berbagi (Share Link)</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={cloudShareUrl}
                    className="flex-1 bg-booth-black border border-booth-border/50 rounded-lg px-2.5 py-1.5 text-xs font-mono text-booth-warm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(cloudShareUrl);
                      alert("Tautan disalin!");
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-booth-accent text-booth-black font-mono text-xs font-semibold hover:brightness-110 active:scale-95 transition-all"
                  >
                    Salin
                  </button>
                </div>
              </div>
            )}
            {saveError && <p className="text-red-400 text-[10px] font-mono text-center">{saveError}</p>}

            <div className="flex gap-2 w-full">
              {/* Edit — single mode */}
              {mode === "single" && (
                <button
                  id="preview-edit-btn"
                  onClick={() => setViewingIndex(0)}
                  className="flex-1 py-2.5 rounded-xl border border-booth-border/60 text-booth-muted hover:text-booth-warm hover:border-booth-border font-mono text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Foto
                </button>
              )}
              {/* Change frame */}
              <button
                id="preview-change-frame-btn"
                onClick={onChangeFrame}
                className="flex-1 py-2.5 rounded-xl border border-booth-border/60 text-booth-muted hover:text-booth-warm hover:border-booth-border font-mono text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Ganti Frame
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Strip Preview ────────────────────────────────────────────────────────────

interface StripPreviewProps {
  photos: string[];
  framedPhotos: string[];
  stripUrl: string | null;
  isComposing: boolean;
  onThumbnailClick: (index: number) => void;
  onStripClick: () => void;
  frame: PhotoFrame | null;
  filterCSS?: string;
}

function StripPreview({
  photos,
  framedPhotos,
  stripUrl,
  isComposing,
  onThumbnailClick,
  onStripClick,
  frame,
  filterCSS,
}: StripPreviewProps) {
  if (isComposing) {
    return (
      <div className="h-52 rounded-lg border border-booth-border bg-booth-dark flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-booth-accent border-t-transparent animate-spin" />
        <p className="text-booth-muted text-xs font-mono tracking-widest uppercase">Menyusun strip...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Final strip — clickable for zoom */}
      {stripUrl && (
        <button
          onClick={onStripClick}
          className="relative w-full rounded-lg overflow-hidden border border-booth-border bg-booth-dark flex justify-center group cursor-zoom-in"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={stripUrl} 
            alt="Photo strip" 
            className="max-h-[40vh] w-auto object-contain" 
            style={{ filter: filterCSS || "none" }}
          />
          <div className="absolute inset-0 bg-booth-black/0 group-hover:bg-booth-black/25 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-booth-black/70 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="text-booth-warm text-[11px] font-mono">Lihat penuh</span>
            </div>
          </div>
        </button>
      )}

      {/* Individual thumbnails — edit each */}
      <div className="flex gap-2 flex-wrap justify-center">
        {photos.map((photo, i) => (
          <button
            key={i}
            onClick={() => onThumbnailClick(i)}
            className="relative w-[30%] min-w-[80px] rounded-md overflow-hidden border border-booth-border bg-booth-dark group cursor-pointer aspect-[16/9]"
            title={`Edit foto ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={framedPhotos[i] || photo} 
              alt={`Photo ${i + 1}`} 
              className="w-full h-full object-cover" 
              style={{ filter: filterCSS || "none" }}
            />
            
            <div className="absolute inset-0 bg-booth-black/0 group-hover:bg-booth-black/40 transition-all flex items-center justify-center z-20">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-booth-black/70 to-transparent py-1 z-20">
              <p className="text-booth-warm text-[8px] font-mono text-center">{i + 1}</p>
            </div>
          </button>
        ))}
      </div>
      <p className="text-booth-muted text-[10px] font-mono text-center tracking-widest">
        Tap thumbnail untuk lihat detail &amp; edit filter
      </p>
    </div>
  );
}



// ─── Full Strip Zoom Modal ────────────────────────────────────────────────────

interface StripZoomModalProps {
  stripUrl: string;
  onClose: () => void;
  isPortrait: boolean;
  filterCSS?: string;
}

function StripZoomModal({ stripUrl, onClose, isPortrait, filterCSS }: StripZoomModalProps) {
  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-booth-black/80 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-booth-muted hover:text-booth-warm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-mono">Kembali</span>
        </button>

        <span className="text-booth-muted text-xs font-mono">Pratinjau Full Strip</span>

        <button
          onClick={() => downloadDataUrl(stripUrl, generateFilename("strip_full"))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-booth-accent/50 text-booth-accent hover:bg-booth-accent/10 transition-all text-xs font-mono"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Unduh Strip
        </button>
      </div>

      {/* Main image content */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center p-4 bg-[#030304]">
        <div className={[
          "relative rounded-lg overflow-hidden shadow-2xl bg-booth-dark flex items-center justify-center",
          isPortrait ? "h-full max-h-[85vh] aspect-[9/16]" : "w-full max-w-[85vw] aspect-[16/9]"
        ].join(" ")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stripUrl}
            alt="Full size photo strip"
            className="max-w-full max-h-full object-contain"
            style={{ filter: filterCSS || "none" }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
