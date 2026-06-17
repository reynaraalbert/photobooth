"use client";

import { useEffect, useState } from "react";
import { Heart, Check } from "lucide-react";

interface LoadingScreenProps {
  onComplete: () => void;
}

const TITLE = "Photobooth";
const SUBTITLE = "exclusive for george with nadia";

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [titleVisible, setTitleVisible] = useState(false);
  const [subtitleChars, setSubtitleChars] = useState(0);
  const [heartBeat, setHeartBeat] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Total duration = 5000ms
  useEffect(() => {
    // 1. Title fades in at 300ms
    const t1 = setTimeout(() => setTitleVisible(true), 300);

    // 2. Subtitle types character by character starting at 900ms
    const subtitleDelay = 900;
    const charInterval = 60; // ms per character
    const charTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= SUBTITLE.length; i++) {
      charTimers.push(
        setTimeout(() => setSubtitleChars(i), subtitleDelay + i * charInterval)
      );
    }

    // 3. Heart pulse every 800ms
    const heartTimer = setInterval(() => setHeartBeat((b) => !b), 800);

    // 4. Progress bar: 5000ms total
    const DURATION = 5000;
    const TICK = 16;
    const steps = DURATION / TICK;
    let step = 0;
    const progressTimer = setInterval(() => {
      step++;
      const t = step / steps;
      // ease-in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setProgress(Math.min(eased * 100, 100));
      if (step >= steps) clearInterval(progressTimer);
    }, TICK);

    // 5. Exit at 4400ms (fade out), complete at 5000ms
    const exitTimer = setTimeout(() => setExiting(true), 4400);
    const completeTimer = setTimeout(() => onComplete(), 5000);

    return () => {
      clearTimeout(t1);
      charTimers.forEach(clearTimeout);
      clearInterval(heartTimer);
      clearInterval(progressTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "#0A0A0F",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: exiting ? 0 : 1,
        transition: "opacity 600ms ease-in-out",
        overflow: "hidden",
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(#C8A96E08 1px, transparent 1px), linear-gradient(90deg, #C8A96E08 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* Radial glow center */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, #C8A96E18 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Floating hearts */}
      {[...Array(8)].map((_, i) => {
        const size = i % 3 === 0 ? 18 : 12;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${8 + i * 12}%`,
              top: `${15 + ((i * 41) % 65)}%`,
              opacity: 0.15 + (i % 3) * 0.08,
              animation: `floatHeart ${3 + (i % 3)}s ease-in-out ${i * 0.4}s infinite alternate`,
              pointerEvents: "none",
              userSelect: "none",
              color: "#C8A96E",
            }}
          >
            <Heart size={size} strokeWidth={1} fill={i % 2 === 0 ? "#C8A96E" : "none"} />
          </span>
        );
      })}

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          position: "relative",
        }}
      >
        {/* Camera icon */}
        <div
          style={{
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? "scale(1) translateY(0)" : "scale(0.8) translateY(16px)",
            transition: "opacity 700ms ease-out, transform 700ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              border: "1px solid #C8A96E80",
              background: "#12121A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 40px #C8A96E30",
              position: "relative",
            }}
          >
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {/* Pulsing ring */}
            <div
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: 28,
                border: "1px solid #C8A96E",
                opacity: heartBeat ? 0.4 : 0.1,
                transform: heartBeat ? "scale(1.05)" : "scale(1)",
                transition: "opacity 800ms ease, transform 800ms ease",
              }}
            />
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            textAlign: "center",
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 800ms ease-out 200ms, transform 800ms ease-out 200ms",
          }}
        >
          <h1
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "clamp(2.5rem, 8vw, 4rem)",
              color: "#F5EDD8",
              margin: 0,
              lineHeight: 1,
              letterSpacing: "0.02em",
            }}
          >
            {TITLE}
          </h1>
        </div>

        {/* Subtitle with typewriter effect */}
        <div
          style={{
            minHeight: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: titleVisible ? 1 : 0,
            transition: "opacity 600ms ease 600ms",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "clamp(0.65rem, 2vw, 0.8rem)",
              color: "#C8A96E",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: 0,
              textAlign: "center",
              padding: "0 16px",
            }}
          >
            {SUBTITLE.slice(0, subtitleChars)}
            {subtitleChars < SUBTITLE.length && (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: "1em",
                  backgroundColor: "#C8A96E",
                  marginLeft: 2,
                  verticalAlign: "middle",
                  animation: "blink 0.7s step-end infinite",
                }}
              />
            )}
          </p>
        </div>

        {/* Heart divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: subtitleChars > 10 ? 1 : 0,
            transition: "opacity 600ms ease",
          }}
        >
          <div style={{ height: 1, width: 60, background: "linear-gradient(to right, transparent, #C8A96E40)" }} />
          <span
            style={{
              color: "#C8A96E",
              transform: heartBeat ? "scale(1.25)" : "scale(1)",
              transition: "transform 400ms ease",
              display: "inline-block",
            }}
          >
            <Heart size={16} strokeWidth={1.5} fill="#C8A96E" />
          </span>
          <div style={{ height: 1, width: 60, background: "linear-gradient(to left, transparent, #C8A96E40)" }} />
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: "min(220px, 80vw)",
            opacity: titleVisible ? 1 : 0,
            transition: "opacity 600ms ease 400ms",
          }}
        >
          <div
            style={{
              height: 1,
              background: "#2A2A3E",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(to right, #A08050, #C8A96E)",
                borderRadius: 999,
                transition: "width 16ms linear",
                boxShadow: "0 0 8px #C8A96E60",
              }}
            />
          </div>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.6rem",
              color: "#6B6B8A",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {progress < 100 ? (
              `${Math.round(progress)}%`
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                Siap <Check size={10} strokeWidth={3} className="text-booth-accent animate-bounce" />
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Year stamp */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.6rem",
          color: "#2A2A3E",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          opacity: titleVisible ? 1 : 0,
          transition: "opacity 1s ease 1s",
        }}
      >
        Photobooth · {new Date().getFullYear()}
      </div>

      {/* Keyframe animations injected via style tag */}
      <style>{`
        @keyframes floatHeart {
          0%   { transform: translateY(0px) rotate(-5deg); }
          100% { transform: translateY(-18px) rotate(5deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
