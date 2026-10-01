4. UI/UX DESIGN SYSTEM SPECIFICATION: BOX SCORE
Design Framework: Tailwind CSS + DaisyUI (CSS-Pure) + Framer Motion (GPU Driven)
Icon Engine: Lucide React (Named Tree-Shaken Imports)

---

4.1. Filosofi Desain Dua Sisi (Dual-Screen Ergonomics)

1. Sisi Admin (Ergonomi Taktil Operator):
   - Fokus pada efisiensi ruang jempol (thumb zone mapping) jika diakses melalui tablet sentuh.
   - Umpan balik visual langsung saat tombol ditekan menggunakan pseudo-class :active murni CSS DaisyUI tanpa penundaan rendering JavaScript.
   - Menggunakan tema DaisyUI bernuansa gelap (slate/dark neutral) untuk menghemat daya baterai perangkat portabel operator di lapangan.

2. Sisi Display (Visibilitas Arena Maksimal):
   - Kanvas visual 100% terkunci (h-screen overflow-hidden select-none).
   - Menggunakan tipografi angka dengan varian monospaced (font-mono tabular-nums) untuk mencegah pergeseran layout (layout jitter) saat angka bertambah dari 9 ke 10 atau 99 ke 100.
   - Kontras rasio hitam pekat (#050505) dan putih terang (#ffffff) dengan saturasi aksen tim yang tajam memenuhi standar WCAG AAA.

---

4.2. Token Warna & Skema DaisyUI

Konfigurasi tema khusus pada tailwind.config.ts:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        scoreboard: ["var(--font-chivo-mono)", "monospace"],
        interface: ["var(--font-inter)", "sans-serif"],
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
```