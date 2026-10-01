2. SYSTEM ARCHITECTURE DOCUMENT (SAD): BOX SCORE
Document Version: 3.0.0
Architecture Style: Decoupled Real-Time Modular Monolith (Command-Query Segregation Pattern)

---

2.1. Topologi Fisik & Aliran Data Sistem

BOX Score memisahkan aliran kontrol input (Command) dan aliran observasi display (Observation) menjadi dua jalur independen:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                             COMMAND PLANE                                │
│                     (Operator Console / Admin Screen)                    │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ 1. HTTPS POST Mutation (Server Action)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ NEXT.JS FULL-STACK SERVER (Node.js Edge / Serverless Container)          │
│                                                                          │
│   ┌───────────────────────────┐      Parse & Verify                      │
│   │ /actions/mutate-score.ts  │ ─────────────────────────┐               │
│   └─────────────┬─────────────┘                          ▼               │
│                 │ Valid Payload                ┌──────────────────┐      │
│                 ▼                              │ Zod Schema Guard │      │
│   ┌───────────────────────────┐                └──────────────────┘      │
│   │ Drizzle ORM Transaction   │                                          │
│   └─────────────┬─────────────┘                                          │
└─────────────────┼────────────────────────────────────────────────────────┘
                  │ 2. Parameterized SQL Query (Connection Pooled)
                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ DATA STORAGE & CDC TIER (PostgreSQL on Supabase)                         │
│                                                                          │
│   ┌──────────────────────────────────────────────┐                       │
│   │ PostgreSQL Database (Write Target)           │                       │
│   │ - Row Level Security Enforced                │                       │
│   │ - Transaction committed with commit_lsn       │                       │
│   └──────────────────────┬───────────────────────┘                       │
│                          │ 3. WAL Logical Replication (wal2json)         │
│                          ▼                                               │
│   ┌──────────────────────────────────────────────┐                       │
│   │ Supabase Realtime Engine (Phoenix WebSockets)│                       │
│   └──────────────────────┬───────────────────────┘                       │
└──────────────────────────┼───────────────────────────────────────────────┘
                           │ 4. Sub-512B Event Payload (WSS Broadcast)
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           OBSERVATION PLANE                              │
│                      (Public Arena Display Screen)                       │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │ useMatchRealtime (WebSocket Channel Listener)                    │   │
│   └──────────────────────────────┬───────────────────────────────────┘   │
│                                  │ In-Memory Cache Injection             │
│                                  ▼                                       │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │ TanStack Query (queryClient.setQueryData)                        │   │
│   └──────────────────────────────┬───────────────────────────────────┘   │
│                                  │ Sub-tree Selective Re-render          │
│                                  ▼                                       │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │ Framer Motion Hardware-Accelerated Viewport (GPU Transform)      │   │
│   └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

2.2. Isolasi Bundle Aplikasi (Route Group Boundary)

Pemanfaatan Route Groups Next.js App Router untuk memastikan pembagian bundle script secara absolut:

```text
src/app/
├── (admin)/                     // Chunk Admin: Termasuk React Hook Form, Zod Resolver,
│   └── dashboard/[matchId]/     // komponen dialog modal kompleks, dan audit table view.
│       ├── layout.tsx
│       └── page.tsx
│
├── (display)/                   // Chunk Display: Berkas minimalis. Tanpa library form.
│   └── screen/[matchId]/        // Hanya DaisyUI CSS utilitas, Framer Motion murni,
│       ├── layout.tsx           // dan Lucide icon individual.
│       └── page.tsx
│
└── layout.tsx                   // Global Root: TanStack Query Provider & Font Definition
```

---

2.3. Kontrak Payload Sinkronisasi (Zero Over-Fetching Contract)

Setiap mutasi data skor di database hanya memancarkan kolom yang diperlukan oleh layar display untuk menghemat bandwidth:

```json
{
  "topic": "realtime:public:matches:id=eq.101",
  "event": "UPDATE",
  "payload": {
    "id": 101,
    "score_team_a": 104,
    "score_team_b": 98,
    "fouls_team_a": 4,
    "fouls_team_b": 3,
    "period": 4,
    "timer_seconds": 14,
    "is_timer_running": true,
    "timer_last_updated_at": "2026-09-16T03:52:11.450Z",
    "updated_at": "2026-09-16T03:52:11.455Z"
  }
}
```

---

2.4. Protokol Toleransi Gangguan Jaringan (Fault-Tolerance & Reconnection)

Jika terjadi gangguan koneksi internet atau kabel LAN arena terputus sejenak:
- Pendeteksian: WebSocket client mendeteksi hilangnya transmisi heartbeat ping dalam 5 detik.
- State UI Display: Komponen indikator koneksi memicu transisi ikon WifiOff (Lucide React) kecil di pojok layar dengan status reconnecting. Layar tidak me-refresh dirinya sendiri dan mempertahankan nilai skor terakhir yang valid.
- Rekoneksi Eksponensial: Client melakukan percobaan sambung ulang dengan interval: 1s, 2s, 4s, 8s hingga batas maksimal 15s.
- State Reconciliation (Fast Recovery): Seketika channel kembali berstatus SUBSCRIBED, sistem mengeksekusi:

```typescript
queryClient.invalidateQueries({ queryKey: ["match", matchId] });
```

Tindakan ini menyinkronkan data in-memory dengan snapshot terbaru PostgreSQL tanpa memuat ulang aset DOM.