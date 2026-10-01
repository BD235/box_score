import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        scoreboard: ["var(--font-chivo-mono)", "ui-monospace", "monospace"],
        interface: ["var(--font-inter)", "ui-sans-serif", "sans-serif"],
      },
      fontSize: {
        "display-score": ["clamp(6rem, 20vw, 26rem)", { lineHeight: "0.9", letterSpacing: "-0.05em" }],
        "display-timer": ["clamp(3.5rem, 11vw, 13rem)", { lineHeight: "1", letterSpacing: "-0.02em" }],
        "display-team": ["clamp(1.5rem, 4vw, 4.5rem)", { lineHeight: "1.1", fontWeight: "900" }],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        boxScoreDark: {
          "primary": "#2563eb",
          "secondary": "#dc2626",
          "accent": "#f59e0b",
          "neutral": "#0f172a",
          "base-100": "#020617",
          "base-200": "#0f172a",
          "base-300": "#1e293b",
          "info": "#0284c7",
          "success": "#16a34a",
          "warning": "#d97706",
          "error": "#e11d48",
        },
      },
    ],
  },
};

export default config;
