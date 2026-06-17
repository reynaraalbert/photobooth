"use client";

import { useEffect, useRef } from "react";
import type { CameraState, PhotoFrame } from "@/types/photobooth";

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraState: CameraState;
  countdownValue: number | null;
  isCountdownActive: boolean;
  isMirrored: boolean;
  flashActive: boolean;
  /** Optional frame to overlay on the live camera feed */
  frame?: PhotoFrame | null;
  zoom: number;
  isNativeZoomSupported: boolean;
  onZoomChange: (level: number) => void;
}

export function CameraView({
  videoRef,
  cameraState,
  countdownValue,
  isCountdownActive,
  isMirrored,
  flashActive,
  frame,
  zoom,
  isNativeZoomSupported,
  onZoomChange,
}: CameraViewProps) {
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    prevCountRef.current = countdownValue;
  }, [countdownValue]);

  return (
    <div className="relative w-full h-full bg-booth-black overflow-hidden">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          transform: `${!isNativeZoomSupported && zoom !== 1 ? `scale(${zoom})` : ""} ${isMirrored ? "scaleX(-1)" : ""}`.trim() || undefined
        }}
        className={[
          "w-full h-full object-cover transition-opacity duration-500",
          cameraState.status === "active" ? "opacity-100" : "opacity-0",
        ]
          .filter(Boolean)
          .join(" ")}
      />

      {/* Frame overlay on live camera */}
      {frame && cameraState.status === "active" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frame.imageUrl}
          alt="Frame overlay"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
          style={{
            opacity: frame.hasChromaKey ? 0.85 : 0.9,
            // Don't mirror the frame — frame is already in correct orientation
          }}
        />
      )}

      {/* Frame label badge */}
      {frame && cameraState.status === "active" && (
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-booth-black/60 backdrop-blur-sm border border-booth-border rounded-full px-2.5 py-1">
          <span className="text-[9px] font-mono text-booth-muted tracking-widest uppercase">
            Frame:
          </span>
          <span className="text-[9px] font-mono text-booth-accent tracking-wide">
            {frame.name}
          </span>
        </div>
      )}

      {/* Zoom controls floating overlay */}
      {cameraState.status === "active" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-booth-black/70 backdrop-blur-md border border-booth-border rounded-full p-1 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          {[0.5, 1, 2, 3].map((level) => {
            const isSelected = Math.abs(zoom - level) < 0.05;
            return (
              <button
                key={level}
                onClick={() => onZoomChange(level)}
                className={[
                  "w-9 h-9 rounded-full text-[10px] font-mono font-bold transition-all duration-200",
                  isSelected
                    ? "bg-booth-accent text-booth-black shadow-md scale-105"
                    : "text-booth-warm/80 hover:text-booth-warm hover:bg-booth-border/40"
                ].join(" ")}
              >
                {level === 0.5 ? "0.5x" : `${level}x`}
              </button>
            );
          })}
        </div>
      )}

      {/* Overlay states */}
      {cameraState.status !== "active" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {cameraState.status === "requesting" && <LoadingState />}
          {cameraState.status === "idle" && <IdleState />}
          {cameraState.status === "error" && (
            <ErrorState error={cameraState.error} />
          )}
        </div>
      )}

      {/* Viewfinder frame corners */}
      {cameraState.status === "active" && (
        <ViewfinderCorners isCountdownActive={isCountdownActive} />
      )}

      {/* Countdown overlay */}
      {isCountdownActive && countdownValue !== null && (
        <CountdownOverlay value={countdownValue} />
      )}

      {/* Flash effect */}
      {flashActive && (
        <div className="absolute inset-0 bg-white animate-flash-in pointer-events-none z-50" />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <>
      <div className="w-10 h-10 rounded-full border-2 border-booth-accent border-t-transparent animate-spin" />
      <p className="text-booth-muted text-sm font-mono tracking-widest uppercase">
        Mengakses kamera...
      </p>
    </>
  );
}

function IdleState() {
  return (
    <>
      <div className="w-20 h-20 rounded-full border border-booth-border flex items-center justify-center">
        <svg
          className="w-8 h-8 text-booth-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <circle cx="12" cy="13" r="3" strokeWidth={1} />
        </svg>
      </div>
      <p className="text-booth-muted text-sm font-mono tracking-widest uppercase">
        Kamera siap
      </p>
    </>
  );
}

function ErrorState({ error }: { error: { message: string } }) {
  return (
    <div className="max-w-xs text-center px-6 space-y-3">
      <div className="w-14 h-14 rounded-full border border-red-500/40 flex items-center justify-center mx-auto">
        <svg
          className="w-6 h-6 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className="text-red-400 text-sm leading-relaxed">{error.message}</p>
    </div>
  );
}

function ViewfinderCorners({
  isCountdownActive,
}: {
  isCountdownActive: boolean;
}) {
  const cornerClass = `absolute w-6 h-6 border-booth-accent transition-all duration-300 ${
    isCountdownActive ? "opacity-100 w-8 h-8" : "opacity-40"
  }`;

  return (
    <>
      <div className={`${cornerClass} top-4 left-4 border-t-2 border-l-2`} />
      <div className={`${cornerClass} top-4 right-4 border-t-2 border-r-2`} />
      <div className={`${cornerClass} bottom-4 left-4 border-b-2 border-l-2`} />
      <div
        className={`${cornerClass} bottom-4 right-4 border-b-2 border-r-2`}
      />
    </>
  );
}

function CountdownOverlay({ value }: { value: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
      <div className="relative">
        {/* Pulsing ring */}
        <div className="absolute inset-0 rounded-full border-2 border-booth-accent animate-ping opacity-30 scale-150" />
        <div
          key={value}
          className="relative w-28 h-28 rounded-full bg-booth-black/70 border border-booth-accent/60 flex items-center justify-center backdrop-blur-sm animate-count-pop"
        >
          <span className="text-booth-accent font-display text-6xl font-bold leading-none tabular-nums">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}
