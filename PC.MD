6. HIGH PERFORMANCE & ANTI-LAG ENGINEERING GUIDELINES
Document Version: 3.0.0
Focus: Zero-Lag Display Execution, Zero Memory Leaks, Sub-16ms Frame Budgets

---

6.1. Anatomi Penghapusan Lag pada Web Real-Time

Lag pada aplikasi papan skor dwilayar berasal dari tiga hambatan komputasi utama:
1. Script Evaluation Blocking: Siklus komputasi form, validasi Zod berat, atau layout calculation JavaScript yang memblokir main thread browser.
2. Global Component Re-renders: Satu state tunggal di root component menyebabkan seluruh pohon DOM (termasuk judul, kontainer, dan background) dihitung ulang.
3. Timer Drifting & Micro-Stutter: Penggunaan setInterval biasa yang tersendat akibat aktivitas garbage collection peramban.

---

6.2. Strategi Granular Sub-Tree Re-Render (TanStack Query Selectors)

Layar display dilarang mendengarkan seluruh objek Match dalam satu komponen besar. Komponen dipecah dan hanya mendengarkan properti primitif menggunakan selektor fungsi murni:

```typescript
// src/modules/match/hooks/use-team-score.ts
import { useQuery } from "@tanstack/react-query";
import type { Match } from "@/db/schema/matches.schema";

// Selektor ini memastikan komponen Skor Tim A HANYA re-render jika skor Tim A berubah.
// Perubahan timer atau skor Tim B tidak akan pernah menyentuh komponen ini.
export function useTeamScore(matchId: number, team: "A" | "B") {
  return useQuery({
    queryKey: ["match", matchId],
    select: (match: Match) => team === "A" ? match.scoreTeamA : match.scoreTeamB,
    staleTime: Infinity,
    gcTime: 86_400_000, // 24 Jam (milidetik)
    notifyOnChangeProps: ["data"],
  });
}
```

---

6.3. Audit Memory Leak & Garbage Collection Lifecycle

Untuk menjamin layar display dapat beroperasi selama turnamen berhari-hari tanpa me-refresh browser:
- Pembersihan Kanal WebSocket: Setiap listener channel Supabase wajib mengembalikan fungsi pembersih (cleanup function) yang memanggil supabase.removeChannel(channel).
- Pembatasan Log Riwayat di Memori Display: Klien display tidak boleh menyimpan riwayat audit log. Audit log hanya dikonsumsi oleh panel Admin. Klien display hanya menyimpan state pertandingan aktif saat ini.
- Stateless SVG Icons: Ikon dari lucide-react dirender secara statis tanpa membungkusnya dalam wrapper animasi kontinu yang memicu alokasi frame heap baru setiap milidetik.

---

6.4. Tabel Target Benchmark Produksi (Performance SLO)

| Metrik Kunci | Batas Maksimum (SLA) | Kondisi Pengujian | Cara Pengukuran |
| :--- | :--- | :--- | :--- |
| Input-to-Display Latency | < 100 ms | Jaringan Wi-Fi lokal / Cloud (RTT <= 40 ms) | High-speed camera (240 FPS) / Network timestamp log delta |
| Display Frame Rate | 60 FPS ± 1 | Monitor 1080p saat transisi digit skor | Chrome Performance Panel DevTools (0 dropped frames) |
| JS Heap Allocation | < 45 MB | Berjalan terus-menerus selama 4 jam mutasi | DevTools Memory Allocation Timeline |
| Display Initial Bundle | < 120 KB | Kompresi Brotli/Gzip | @next/bundle-analyzer build output |
| Layout Shift (CLS) | = 0.000 | Resolusi dinamis 720p hingga 4K | Lighthouse CI Audit Score = 100 |