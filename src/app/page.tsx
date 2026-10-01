"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { 
  Plus, 
  Trash2, 
  Monitor, 
  Smartphone, 
  Trophy, 
  Crown,
  Sparkles,
  Users,
  Radio,
  Clock,
  Layers,
  ChevronRight
} from "lucide-react";
import type { FullMatchData } from "@/db/schema/matches.schema";

const DEFAULT_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"];

export default function ScoreSyncHubPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("Turnamen Event Grand 2026");

  // Default 4 to 5 players per PRD
  const [players, setPlayers] = useState([
    { name: "Pemain 1", colorHex: DEFAULT_COLORS[0] },
    { name: "Pemain 2", colorHex: DEFAULT_COLORS[1] },
    { name: "Pemain 3", colorHex: DEFAULT_COLORS[2] },
    { name: "Pemain 4", colorHex: DEFAULT_COLORS[3] },
    { name: "Pemain 5", colorHex: DEFAULT_COLORS[4] },
  ]);

  const { data, isLoading } = useQuery<{ matches: FullMatchData[] }>({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches");
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          players,
        }),
      });
      if (!res.ok) throw new Error("Failed to create match");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/matches/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete match");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  function addPlayer() {
    if (players.length >= 8) return;
    const nextIdx = players.length;
    setPlayers([
      ...players,
      {
        name: `Pemain ${nextIdx + 1}`,
        colorHex: DEFAULT_COLORS[nextIdx % DEFAULT_COLORS.length],
      },
    ]);
  }

  function removePlayer(index: number) {
    if (players.length <= 4) return; // Invariant: min 4 players
    setPlayers(players.filter((_, i) => i !== index));
  }

  function updatePlayer(index: number, field: "name" | "colorHex", value: string) {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);
  }

  return (
    <main className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto bg-[#030712] text-slate-100">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-amber-500 flex items-center justify-center text-white shadow-xl shadow-primary/20">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-primary badge-sm font-bold font-mono">SCORESYNC 1.0</span>
              <span className="text-xs text-slate-400 font-mono">REAL-TIME DUAL-SCREEN ENGINE</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mt-1">
              ScoreSync Tournament Hub
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Konsol Admin Mobile (HP) &amp; Papan Skor Layar Arena (Laptop 16:9)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary font-bold font-mono px-6 gap-2 rounded-2xl shadow-lg shadow-primary/25"
        >
          <Plus className="w-5 h-5" />
          Buat Pertandingan Baru
        </button>
      </header>

      {/* Grid of Matches */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Sesi Pertandingan Aktif
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {data?.matches?.length || 0} Pertandingan Terdaftar
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-3xl bg-slate-900/40 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : !data?.matches || data.matches.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-slate-900/30 border border-slate-800/80 p-8">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-300 font-mono">Belum ada pertandingan</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              Mulai pertandingan baru dengan 4-5 pemain untuk menghubungkan remote HP dan layar laptop.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary btn-sm font-bold font-mono px-5 rounded-xl"
            >
              + Buat Pertandingan Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.matches.map((match) => {
              const leader = match.players?.find((p) => p.rank === 1) || match.players?.[0];

              return (
                <div
                  key={match.id}
                  className="rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 backdrop-blur-md p-6 flex flex-col justify-between shadow-xl transition-all duration-300 relative group overflow-hidden"
                >
                  <div>
                    {/* Status & Round Badge */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span
                          className={`badge badge-sm font-mono font-bold ${
                            match.status === "FINISHED"
                              ? "badge-error"
                              : "badge-success"
                          }`}
                        >
                          {match.status}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          Ronde {match.currentRound}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          if (confirm(`Hapus pertandingan "${match.title}"?`)) {
                            deleteMutation.mutate(match.id);
                          }
                        }}
                        className="btn btn-ghost btn-xs text-slate-600 hover:text-red-400"
                        title="Hapus Pertandingan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-black text-white tracking-tight mt-4 truncate">
                      {match.title}
                    </h3>

                    {/* Leader Highlight */}
                    {leader && (
                      <div className="mt-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <div>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              PEMIMPIN SKOR
                            </span>
                            <span className="text-sm font-bold text-slate-200">
                              {leader.name}
                            </span>
                          </div>
                        </div>
                        <span className="text-xl font-scoreboard font-black text-white">
                          {leader.totalScore} <span className="text-xs font-normal text-slate-500">pts</span>
                        </span>
                      </div>
                    )}

                    {/* Players Preview Avatars */}
                    <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>{match.players?.length || 0} Pemain</span>
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {match.players?.map((p) => (
                          <div
                            key={p.id}
                            className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                            style={{ backgroundColor: p.colorHex }}
                            title={p.name}
                          >
                            {p.slotOrder}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dual Screen Launch Buttons */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                    <Link
                      href={`/dashboard/${match.id}`}
                      className="btn btn-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-xl font-mono text-xs gap-1.5 shadow"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-primary" />
                      Remote HP
                    </Link>

                    <Link
                      href={`/screen/${match.id}`}
                      target="_blank"
                      className="btn btn-sm bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 rounded-xl font-mono text-xs gap-1.5 shadow"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      Layar Laptop
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CREATE MATCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-xl font-black text-white font-mono flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Inisiasi Pertandingan Baru
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Konfigurasi nama acara dan pemain (default 4-5 pemain sesuai PRD ScoreSync).
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                  Nama Acara / Pertandingan
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Turnamen Event Grand 2026"
                  className="input input-bordered w-full bg-slate-950 text-white border-slate-700 font-mono text-sm"
                />
              </div>

              {/* Players Configuration */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono font-bold text-slate-300">
                    Daftar Pemain ({players.length} Pemain - Min 4)
                  </label>
                  {players.length < 8 && (
                    <button
                      type="button"
                      onClick={addPlayer}
                      className="btn btn-ghost btn-xs text-primary font-mono gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Pemain
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {players.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: p.colorHex }}
                      >
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => updatePlayer(idx, "name", e.target.value)}
                        className="input input-sm input-ghost w-full font-mono text-white text-xs"
                      />
                      <input
                        type="color"
                        value={p.colorHex}
                        onChange={(e) => updatePlayer(idx, "colorHex", e.target.value)}
                        className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0 shrink-0"
                      />
                      {players.length > 4 && (
                        <button
                          type="button"
                          onClick={() => removePlayer(idx)}
                          className="btn btn-ghost btn-xs text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn btn-sm btn-ghost text-slate-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !title.trim()}
                className="btn btn-sm btn-primary font-bold font-mono px-6 rounded-xl"
              >
                {createMutation.isPending ? "Membuat..." : "Simpan & Buka"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
