"use client";

import React from "react";
import type { StripOrientation } from "@/types/photobooth";
import { Camera, Lock, Heart, Sparkles, Star } from "lucide-react";

interface StripLayoutPreviewProps {
  frameId: string;
  layout: number; // 2 | 3 | 4 | 5 | 6
  orientation: StripOrientation; // "vertical" | "horizontal"
  photosTaken: number;
  photos: string[];
  onRetakePhoto?: (index: number) => void;
  retakeIndex?: number | null;
}

export function StripLayoutPreview({
  frameId,
  layout,
  orientation,
  photosTaken,
  photos,
  onRetakePhoto,
  retakeIndex,
}: StripLayoutPreviewProps) {
  // Define styles based on frameId
  let bgClass = "bg-booth-black border-booth-border";
  let borderStyle = {};
  let decorationColor = "#C8A96E";
  let showHearts = false;
  let showStars = false;
  let showFlowers = false;
  let showFilmSprockets = false;
  let isPolaroid = false;

  switch (frameId) {
    case "rose-gold":
      bgClass = "bg-gradient-to-br from-[#F4C2C2] to-[#FFB6C1]";
      borderStyle = { borderColor: "#C8A96E", borderWidth: "2px", borderStyle: "solid" };
      decorationColor = "#E8608A";
      showHearts = true;
      break;
    case "sweet-hearts":
      bgClass = "bg-[#FFF5F7]";
      borderStyle = { borderColor: "#FFB6C1", borderWidth: "2px", borderStyle: "solid" };
      decorationColor = "#FF6B8A";
      showHearts = true;
      break;
    case "cherry-blossom":
      bgClass = "bg-gradient-to-br from-[#FFD6E7] to-[#FFAECB]";
      borderStyle = { borderColor: "rgba(255,255,255,0.9)", borderWidth: "2.5px", borderStyle: "solid" };
      decorationColor = "#FF6B9D";
      showFlowers = true;
      break;
    case "vintage-lace":
      bgClass = "bg-[#5C0A2E]";
      borderStyle = { borderColor: "#C8A96E", borderWidth: "2px", borderStyle: "solid" };
      decorationColor = "#C8A96E";
      break;
    case "starlight":
      bgClass = "bg-[#0D1B2A]";
      borderStyle = { borderColor: "#C8A96E", borderWidth: "2px", borderStyle: "solid" };
      decorationColor = "#C8A96E";
      showStars = true;
      break;
    case "love-letter":
      bgClass = "bg-gradient-to-br from-[#F5E6D3] to-[#EDD9B8]";
      borderStyle = { borderColor: "#8B4513", borderWidth: "2.5px", borderStyle: "solid" };
      decorationColor = "#8B1A1A";
      showHearts = true;
      break;
    case "retro-film":
      bgClass = "bg-[#1A1A26]";
      borderStyle = { borderColor: "rgba(200,169,110,0.2)", borderWidth: "1px", borderStyle: "solid" };
      showFilmSprockets = true;
      break;
    case "polaroid":
      bgClass = "bg-[#F5EDD8]";
      borderStyle = { borderColor: "rgba(42,42,62,0.1)", borderWidth: "1px", borderStyle: "solid" };
      isPolaroid = true;
      break;
    case "golden-moment":
      bgClass = "bg-[#0A0A0F]";
      borderStyle = { borderColor: "#C8A96E", borderWidth: "4px", borderStyle: "double" };
      decorationColor = "#C8A96E";
      break;
    case "floral-romance":
      bgClass = "bg-[#1A3A2A]";
      borderStyle = { borderColor: "rgba(200,169,110,0.4)", borderWidth: "2px", borderStyle: "solid" };
      decorationColor = "#E8608A";
      showFlowers = true;
      break;
    default:
      bgClass = "bg-booth-black";
      borderStyle = { borderColor: "rgba(200,169,110,0.25)", borderWidth: "1px", borderStyle: "solid" };
      break;
  }

  // Generate slots
  const slots = Array.from({ length: layout });

  const isPortraitLayout = orientation === "portrait";
  const N = layout;

  const containerW = isPortraitLayout ? 157.5 : 280;
  const containerH = isPortraitLayout ? 280 : 157.5;

  const activePadding = isPortraitLayout ? 6 : 10;
  const activeGap = isPortraitLayout ? 2.5 : 5;
  const activeLabelH = isPortraitLayout ? 8 : 16;

  let cols = 1;
  let rows = N;
  let maxPhotoW = 0;

  for (let c = 1; c <= N; c++) {
    const r = Math.ceil(N / c);

    // Enforce orientation alignment constraints
    if (isPortraitLayout && r < c) continue;
    if (!isPortraitLayout && c < r) continue;

    const availableW = containerW - activePadding * 2 - (c - 1) * activeGap;
    const availableH = containerH - activePadding * 2 - (r - 1) * activeGap - activeLabelH;
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

  const maxGridW = containerW - activePadding * 2;
  const maxGridH = containerH - activePadding * 2 - activeLabelH;

  const startX = activePadding + (maxGridW - gridW) / 2;
  const startY = activePadding + (maxGridH - gridH) / 2;

  let layoutClass = "relative"; // use relative positioning for container children

  const containerStyle = {
    ...borderStyle,
    width: `${containerW}px`,
    height: `${containerH}px`,
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-booth-black/40 rounded-xl border border-booth-border/50 animate-fade-in">
      <div className="text-[10px] font-mono text-booth-muted mb-2 tracking-wider uppercase">
        Layout Preview ({orientation})
      </div>

      {/* Outer Strip Container */}
      <div
        style={containerStyle}
        className={[
          "relative transition-all duration-300 rounded-lg overflow-hidden shadow-lg",
          layoutClass,
          bgClass,
        ].join(" ")}
      >
        {/* Sprockets for retro-film */}
        {showFilmSprockets && isPortraitLayout && (
          <>
            <div className="absolute left-1.5 top-0 bottom-0 flex flex-col justify-around py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-1.5 h-2 bg-booth-black rounded-sm border border-booth-border/20" />
              ))}
            </div>
            <div className="absolute right-1.5 top-0 bottom-0 flex flex-col justify-around py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-1.5 h-2 bg-booth-black rounded-sm border border-booth-border/20" />
              ))}
            </div>
          </>
        )}

        {showFilmSprockets && !isPortraitLayout && (
          <>
            <div className="absolute top-1.5 left-0 right-0 flex flex-row justify-around px-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-2 h-1.5 bg-booth-black rounded-sm border border-booth-border/20" />
              ))}
            </div>
            <div className="absolute bottom-1.5 left-0 right-0 flex flex-row justify-around px-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-2 h-1.5 bg-booth-black rounded-sm border border-booth-border/20" />
              ))}
            </div>
          </>
        )}

        {/* Decorative corner graphics */}
        {showHearts && (
          <div className="absolute top-1 left-1.5 text-[8px] animate-pulse" style={{ color: decorationColor }}>
            ♥
          </div>
        )}
        {showHearts && (
          <div className="absolute top-1 right-1.5 text-[8px] animate-pulse" style={{ color: decorationColor }}>
            ♥
          </div>
        )}
        {showStars && (
          <div className="absolute top-1 left-1.5 text-[8px]" style={{ color: decorationColor }}>
            ★
          </div>
        )}
        {showStars && (
          <div className="absolute top-1 right-1.5 text-[8px]" style={{ color: decorationColor }}>
            ★
          </div>
        )}
        {showFlowers && (
          <div className="absolute top-1.5 left-1.5 text-[8px]" style={{ color: decorationColor }}>
            ✿
          </div>
        )}
        {showFlowers && (
          <div className="absolute top-1.5 right-1.5 text-[8px]" style={{ color: decorationColor }}>
            ✿
          </div>
        )}

        {/* Slots */}
        {slots.map((_, i) => {
          const isCaptured = i < photosTaken;
          const isActive = i === photosTaken;
          const isRetaking = retakeIndex === i;
          const photoUrl = photos[i];

          const row = Math.floor(i / cols);
          const col = i % cols;

          // Center the last row if it's incomplete
          const isLastRow = row === rows - 1;
          const remainingInLastRow = layout - row * cols;
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

          const slotStyle = {
            position: "absolute" as const,
            left: `${x}px`,
            top: `${y}px`,
            width: `${finalPhotoW}px`,
            height: `${finalPhotoH}px`,
          };

          const canRetake = isCaptured && onRetakePhoto && !isRetaking;

          return (
            <div
              key={i}
              style={slotStyle}
              onClick={canRetake ? () => onRetakePhoto(i) : undefined}
              className={[
                "relative rounded-sm overflow-hidden flex items-center justify-center border transition-all duration-300",
                isPolaroid ? "bg-white p-0.5 shadow-sm border-neutral-200" : "",
                canRetake ? "cursor-pointer group" : "",
                isRetaking
                  ? "border-yellow-400 ring-1 ring-yellow-400/60 animate-pulse"
                  : isCaptured
                    ? "border-booth-border bg-booth-dark"
                    : isActive
                      ? "border-booth-accent bg-booth-accent/5 ring-1 ring-booth-accent/40 animate-pulse"
                      : "border-booth-border/40 bg-booth-black/50 opacity-40",
              ].join(" ")}
            >
              {isRetaking ? (
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <Camera className="w-3 h-3 text-yellow-400 animate-bounce" />
                  <span className="text-[5px] font-mono text-yellow-400 font-bold tracking-wider uppercase">
                    RETAKE
                  </span>
                </div>
              ) : isCaptured && photoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt={`Slot ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Retake overlay on hover */}
                  {onRetakePhoto && (
                    <div className="absolute inset-0 bg-booth-black/0 group-hover:bg-booth-black/50 transition-all flex items-center justify-center z-10">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-[5px] font-mono text-white font-bold">ULANG</span>
                      </div>
                    </div>
                  )}
                </>
              ) : isActive ? (
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <Camera className="w-3 h-3 text-booth-accent animate-bounce" />
                  <span className="text-[6px] font-mono text-booth-accent font-bold tracking-wider uppercase">
                    LIVE
                  </span>
                </div>
              ) : (
                <Lock className="w-2.5 h-2.5 text-booth-muted/40" />
              )}

              {/* Slot Number Badge */}
              <div className="absolute bottom-0.5 right-1 px-0.5 bg-booth-black/70 rounded text-[6px] font-mono text-booth-warm/75">
                {i + 1}
              </div>
            </div>
          );
        })}

        {/* Bottom Text for Polaroid Mockup */}
        {isPolaroid && isPortraitLayout && (
          <div className="absolute bottom-1.5 inset-x-0 text-center text-[6px] font-serif text-[#2A2A3E80] leading-none">
            George ♥ Nadia
          </div>
        )}
        {isPolaroid && !isPortraitLayout && (
          <div
            className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[5px] font-serif text-[#2A2A3E80] leading-none"
            style={{ writingMode: "vertical-rl" }}
          >
            George ♥ Nadia
          </div>
        )}
      </div>
    </div>
  );
}
