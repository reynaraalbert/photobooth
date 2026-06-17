"use client";

import { useState } from "react";
import { Camera, Film, Image as ImageIcon } from "lucide-react";

interface WelcomeScreenProps {
  onStart: () => void;
}

const FEATURES = [
  { icon: "camera", label: "Single Photo", desc: "Satu jepretan sempurna" },
  { icon: "film", label: "Photo Strip", desc: "Rangkaian 2–6 foto" },
  { icon: "image", label: "Custom Frame", desc: "Upload frame sendiri" },
];

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="fixed inset-0 bg-booth-black flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#C8A96E 1px, transparent 1px), linear-gradient(90deg, #C8A96E 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, #C8A96E12 0%, transparent 65%)",
        }}
      />

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-booth-border opacity-40" />
      <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-booth-border opacity-40" />
      <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-booth-border opacity-40" />
      <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-booth-border opacity-40" />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-10 max-w-md w-full animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-booth-accent/50 bg-booth-dark flex items-center justify-center shadow-[0_0_30px_#C8A96E20]">
            <svg
              className="w-8 h-8 text-booth-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.3}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <circle cx="12" cy="13" r="3" strokeWidth={1.3} />
            </svg>
          </div>

          <div className="text-center">
            <h1 className="font-display text-5xl sm:text-6xl text-booth-warm leading-none mb-2">
              Photobooth
            </h1>
            <p className="font-mono text-booth-muted text-xs tracking-[0.3em] uppercase">
              Studio · Web Edition
            </p>
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center space-y-1">
          <p className="text-booth-warm/70 text-base font-light leading-relaxed">
            Abadikan momen terbaik Anda,
          </p>
          <p className="text-booth-warm/70 text-base font-light leading-relaxed">
            langsung dari browser — kapan saja, di mana saja.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-3 justify-center">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-booth-border bg-booth-dark/60 backdrop-blur-sm"
            >
              <span className="text-booth-accent flex-shrink-0">
                {f.icon === "camera" && <Camera className="w-4 h-4" />}
                {f.icon === "film" && <Film className="w-4 h-4" />}
                {f.icon === "image" && <ImageIcon className="w-4 h-4" />}
              </span>
              <div>
                <p className="text-booth-warm text-xs font-semibold leading-none mb-0.5">
                  {f.label}
                </p>
                <p className="text-booth-muted text-[10px] leading-none">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          id="start-photobooth-btn"
          onClick={onStart}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={[
            "relative w-full max-w-xs py-4 rounded-2xl font-mono text-sm tracking-[0.2em] uppercase",
            "transition-all duration-300 overflow-hidden",
            "bg-booth-accent text-booth-black font-bold",
            hovered
              ? "shadow-[0_0_40px_#C8A96E60] scale-[1.02]"
              : "shadow-[0_0_20px_#C8A96E30]",
          ].join(" ")}
        >
          {/* Shimmer overlay */}
          <div
            className={[
              "absolute inset-0 opacity-0 transition-opacity duration-300",
              hovered ? "opacity-30" : "",
            ].join(" ")}
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, #fff 50%, transparent 60%)",
              backgroundSize: "200% 100%",
              animation: hovered ? "shimmer 1.5s linear infinite" : "none",
            }}
          />
          <span className="relative flex items-center justify-center gap-2">
            <span>Mulai Sesi</span>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${hovered ? "translate-x-1" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </span>
        </button>

        {/* Footer note */}
        <p className="text-booth-border text-[10px] font-mono tracking-widest text-center uppercase">
          Photobooth · {new Date().getFullYear()} · Web Camera Required
        </p>
      </div>
    </div>
  );
}
