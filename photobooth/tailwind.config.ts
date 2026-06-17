import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        booth: {
          black: "#0A0A0F",
          dark: "#12121A",
          panel: "#1A1A26",
          border: "#2A2A3E",
          accent: "#C8A96E",
          "accent-dim": "#A08050",
          "accent-glow": "#C8A96E33",
          warm: "#F5EDD8",
          muted: "#6B6B8A",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "flash-in": "flashIn 0.15s ease-out",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.3s ease-out",
        "count-pop": "countPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 3s ease-in-out infinite alternate",
      },
      transitionDuration: {
        "600": "600ms",
      },
      keyframes: {
        flashIn: {
          "0%": { opacity: "1", backgroundColor: "#ffffff" },
          "100%": { opacity: "0", backgroundColor: "#ffffff" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        countPop: {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "60%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%": { transform: "translateY(0px) scale(1)", opacity: "0.3" },
          "100%": { transform: "translateY(-20px) scale(2)", opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
