"use client";

import React, { memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Crown, 
  Trophy, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  Flame, 
  TrendingDown, 
  TrendingUp, 
  Table, 
  Radio, 
  Medal,
  Award
} from "lucide-react";
import { useMatchDetails } from "@/modules/match/hooks/use-match-details";
import { useMatchRealtime } from "@/lib/realtime/use-match-realtime";
import { playAudioEffect } from "@/lib/audio/buzzer";

interface PageProps {
  params: { matchId: string };
}

export default function LaptopArenaDisplayPage({ params }: PageProps) {
  const matchId = parseInt(params.matchId, 10);

  // Hook into real-time updates and audio triggers
  const { status: connectionStatus } = useMatchRealtime(matchId, {
    onAudioTrigger: (effect) => {
      playAudioEffect(effect);
    },
  });

  const { data: match, isLoading } = useMatchDetails(matchId);

  if (isLoading || !match) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] text-white">
        <span className="loading loading-spinner loading-lg text-amber-400"></span>
        <p className="mt-4 font-mono text-slate-500 tracking-widest uppercase text-sm">
          MEMUAT PAPAN SKOR SCORESYNC...
        </p>
      </div>
    );
  }

  const players = match.players || [];
  const displayState = match.displayState || {
    viewMode: "TOTAL_SCORE_ONLY",
    activeFilter: "ALL",
    timerSeconds: 0,
    isTimerRunning: false,
  };

  const viewMode = displayState.viewMode || "TOTAL_SCORE_ONLY";
  const activeFilter = displayState.activeFilter || "ALL";

  const timerSec = displayState.timerSeconds || 0;
  const timerMin = Math.floor(timerSec / 60).toString().padStart(2, "0");
  const timerRemainder = (timerSec % 60).toString().padStart(2, "0");

  const currentLeader = players.find((p) => p.rank === 1) || players[0];

  return (
    <main className="h-screen w-screen max-h-screen overflow-hidden flex flex-col justify-between p-6 md:p-8 bg-[#030712] text-white relative select-none">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Reconnecting Status Indicator */}
      {connectionStatus !== "connected" && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/90 border border-red-800 text-red-400 text-xs font-mono shadow-2xl backdrop-blur-md animate-pulse">
          <WifiOff className="w-3.5 h-3.5" />
          <span>RECONNECTING...</span>
        </div>
      )}

      {/* TOP ARENA HEADER */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/5">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                SCORESYNC OFFICIAL ARENA DISPLAY
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-[9px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE REMOTE
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
              {match.title}
            </h1>
          </div>
        </div>

        {/* Center: Active Round & Timer */}
        <div className="flex items-center gap-4">
          {/* Round Badge */}
          <div className="px-6 py-2 rounded-2xl bg-slate-900/80 border border-slate-700 shadow-xl text-center backdrop-blur-md">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
              RONDE AKTIF
            </span>
            <span className="text-2xl md:text-3xl font-black font-scoreboard text-amber-400">
              RONDE {match.currentRound}
            </span>
          </div>

          {/* Arena Clock */}
          <div className="px-5 py-2 rounded-2xl bg-slate-900/60 border border-slate-800 text-center backdrop-blur-md">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              MATCH CLOCK
            </span>
            <span className="text-xl md:text-2xl font-black font-mono text-white tracking-wider">
              {timerMin}:{timerRemainder}
            </span>
          </div>
        </div>

        {/* Right: Remote View Mode Status */}
        <div className="text-right">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block flex items-center justify-end gap-1">
            <Radio className="w-3 h-3 text-amber-400" />
            MODE TAMPILAN
          </span>
          <span className="text-sm font-black uppercase font-mono text-amber-400">
            {viewMode === "TOTAL_SCORE_ONLY" && "Skor Total Kumulatif"}
            {viewMode === "DETAIL_TABLE" && "Matriks Tabel Detail"}
            {viewMode === "HIGHLIGHT_MINUS_PLUS" && "Highlight Stat Ronde"}
            {viewMode === "LEADERBOARD" && "Papan Peringkat Podium"}
            {viewMode === "GAME_OVER" && "Pertandingan Selesai"}
          </span>
        </div>
      </header>

      {/* DYNAMIC VIEWPORT BODY (REMOTE DRIVEN) */}
      <div className="flex-1 my-4 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ======================================================== */}
          {/* MODE 1: SKOR TOTAL (CARD GRID SYSTEM 4-5+ PEMAIN)        */}
          {/* ======================================================== */}
          {viewMode === "TOTAL_SCORE_ONLY" && (
            <motion.section
              key="mode-total-score"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={`w-full h-full grid gap-5 items-stretch ${
                players.length === 5
                  ? "grid-cols-5"
                  : players.length === 4
                  ? "grid-cols-4"
                  : players.length === 3
                  ? "grid-cols-3"
                  : players.length === 6
                  ? "grid-cols-6"
                  : "grid-cols-4"
              }`}
            >
              {players.map((p) => {
                const isLeader = p.rank === 1;

                return (
                  <div
                    key={p.id}
                    className={`flex flex-col justify-between p-6 rounded-3xl bg-slate-900/60 border-2 backdrop-blur-md shadow-2xl relative overflow-hidden transition-all duration-300 ${
                      isLeader
                        ? "border-amber-400/90 shadow-[0_0_40px_rgba(245,158,11,0.25)] bg-slate-900/80"
                        : "border-slate-800"
                    }`}
                  >
                    {/* Top Accent Stripe */}
                    <div
                      className="absolute top-0 left-0 right-0 h-2.5"
                      style={{ backgroundColor: p.colorHex }}
                    />

                    {/* Watermark Position Number */}
                    <div className="absolute -bottom-10 -right-6 text-9xl font-black opacity-5 pointer-events-none select-none">
                      {p.slotOrder}
                    </div>

                    {/* Header: Rank Badge & Player Order */}
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                        <span
                          className={`text-xs font-black font-mono px-3 py-1 rounded-full flex items-center gap-1.5 ${
                            p.rank === 1
                              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                              : p.rank === 2
                              ? "bg-slate-300 text-slate-950"
                              : p.rank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {p.rank === 1 && <Crown className="w-3.5 h-3.5 fill-current" />}
                          PERINGKAT #{p.rank}
                        </span>

                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-inner"
                          style={{ backgroundColor: p.colorHex }}
                        >
                          {p.slotOrder}
                        </span>
                      </div>

                      {/* Player Name */}
                      <h3 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tight mt-4 truncate">
                        {p.name}
                      </h3>
                    </div>

                    {/* Total Score Display with Smooth Re-render */}
                    <div className="my-auto text-center py-6">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                        TOTAL POIN
                      </span>
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                          key={p.totalScore}
                          initial={{ opacity: 0, y: -20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.95 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className={`text-display-score font-scoreboard font-black tabular-nums tracking-tighter leading-none select-none drop-shadow-2xl ${
                            p.totalScore < 0 ? "text-red-400" : "text-white"
                          }`}
                        >
                          {p.totalScore}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Bottom Status Ribbon */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500">SLOT #{p.slotOrder}</span>
                      <span className={isLeader ? "text-amber-400 font-bold" : "text-slate-400"}>
                        {isLeader ? "★ PEMIMPIN SKOR" : "BERJALAN"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </motion.section>
          )}

          {/* ======================================================== */}
          {/* MODE 2: TABEL DETAIL SKOR PER RONDE                      */}
          {/* ======================================================== */}
          {viewMode === "DETAIL_TABLE" && (
            <motion.section
              key="mode-detail-table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Table className="w-5 h-5 text-amber-400" />
                  <h2 className="text-xl font-black text-white font-mono uppercase tracking-tight">
                    Matriks Rincian Skor Per Ronde
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Total Ronde Tercatat: {match.roundSummaries?.length || 0}
                </span>
              </div>

              <div className="flex-1 overflow-auto mt-4">
                <table className="table table-pin-rows w-full font-mono text-center">
                  <thead>
                    <tr className="bg-slate-950 text-slate-300 text-sm border-b border-slate-800">
                      <th className="text-left font-black">RONDE</th>
                      {players.map((p) => (
                        <th key={p.id} className="font-black text-white">
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: p.colorHex }}
                            />
                            {p.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {match.roundSummaries && match.roundSummaries.length > 0 ? (
                      match.roundSummaries.map((r) => (
                        <tr
                          key={r.roundNumber}
                          className="border-b border-slate-800/60 hover:bg-slate-800/40 text-base"
                        >
                          <td className="text-left font-bold text-amber-400">
                            Ronde {r.roundNumber}
                          </td>
                          {r.playerScores.map((ps) => (
                            <td key={ps.playerId} className="font-scoreboard font-bold">
                              <span
                                className={
                                  ps.roundDelta > 0
                                    ? "text-emerald-400"
                                    : ps.roundDelta < 0
                                    ? "text-red-400"
                                    : "text-slate-500"
                                }
                              >
                                {ps.roundDelta > 0 ? `+${ps.roundDelta}` : ps.roundDelta}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={players.length + 1} className="py-12 text-slate-500">
                          Belum ada data mutasi skor pada ronde ini
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-950 text-white font-black text-base border-t-2 border-slate-700">
                      <td className="text-left text-amber-400">TOTAL AKHIR</td>
                      {players.map((p) => (
                        <td key={p.id} className="font-scoreboard text-lg">
                          <span className={p.totalScore < 0 ? "text-red-400" : "text-white"}>
                            {p.totalScore}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </motion.section>
          )}

          {/* ======================================================== */}
          {/* MODE 3: HIGHLIGHT STAT RONDE (MOST MINUS & MOST PLUS)     */}
          {/* ======================================================== */}
          {viewMode === "HIGHLIGHT_MINUS_PLUS" && (
            <motion.section
              key="mode-highlights"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col justify-center"
            >
              <div className="text-center mb-6">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 block mb-1">
                  SOROTAN STATISTIK RONDE {match.currentRound}
                </span>
                <h2 className="text-3xl font-black text-white">
                  Performa Tertinggi & Terendah Ronde Berjalan
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
                {/* Most Plus Card */}
                {(activeFilter === "ALL" || activeFilter === "MOST_PLUS") && (
                  <div className="p-8 rounded-3xl bg-gradient-to-b from-emerald-950/40 via-slate-900/80 to-slate-900 border-2 border-emerald-500/60 shadow-2xl backdrop-blur-md relative overflow-hidden text-center">
                    <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 mb-4">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 block font-bold">
                      POIN PLUS TERBANYAK
                    </span>

                    {match.currentHighlight?.mostPlusPlayer ? (
                      <div className="mt-4">
                        <h3 className="text-3xl font-black uppercase text-white">
                          {match.currentHighlight.mostPlusPlayer.player.name}
                        </h3>
                        <div className="my-4 text-7xl font-scoreboard font-black text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                          +{match.currentHighlight.mostPlusPlayer.points}
                        </div>
                        <p className="text-sm font-mono text-slate-400">
                          Total Kumulatif: {match.currentHighlight.mostPlusPlayer.player.totalScore} pts
                        </p>
                      </div>
                    ) : (
                      <div className="my-12 text-slate-500 font-mono text-sm">
                        Belum ada perolehan poin plus pada ronde ini
                      </div>
                    )}
                  </div>
                )}

                {/* Most Minus Card */}
                {(activeFilter === "ALL" || activeFilter === "MOST_MINUS") && (
                  <div className="p-8 rounded-3xl bg-gradient-to-b from-red-950/40 via-slate-900/80 to-slate-900 border-2 border-red-500/60 shadow-2xl backdrop-blur-md relative overflow-hidden text-center">
                    <div className="inline-flex p-3 rounded-2xl bg-red-500/20 text-red-400 mb-4">
                      <TrendingDown className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-mono uppercase tracking-widest text-red-400 block font-bold">
                      PENALTI MINUS TERBANYAK
                    </span>

                    {match.currentHighlight?.mostMinusPlayer ? (
                      <div className="mt-4">
                        <h3 className="text-3xl font-black uppercase text-white">
                          {match.currentHighlight.mostMinusPlayer.player.name}
                        </h3>
                        <div className="my-4 text-7xl font-scoreboard font-black text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                          {match.currentHighlight.mostMinusPlayer.points}
                        </div>
                        <p className="text-sm font-mono text-slate-400">
                          Total Kumulatif: {match.currentHighlight.mostMinusPlayer.player.totalScore} pts
                        </p>
                      </div>
                    ) : (
                      <div className="my-12 text-slate-500 font-mono text-sm">
                        Belum ada perolehan penalti minus pada ronde ini
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* ======================================================== */}
          {/* MODE 4: PAPAN PERINGKAT PODIUM / LEADERBOARD             */}
          {/* ======================================================== */}
          {viewMode === "LEADERBOARD" && (
            <motion.section
              key="mode-leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col justify-center max-w-4xl mx-auto"
            >
              <div className="text-center mb-6">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 block mb-1">
                  OFFICIAL ARENA STANDINGS
                </span>
                <h2 className="text-3xl font-black text-white">
                  Papan Peringkat Sementara
                </h2>
              </div>

              <div className="space-y-3">
                {players.map((p, idx) => {
                  const isTop3 = p.rank <= 3;
                  return (
                    <motion.div
                      key={p.id}
                      layout
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 backdrop-blur-md shadow-xl ${
                        p.rank === 1
                          ? "bg-amber-500/10 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
                          : p.rank === 2
                          ? "bg-slate-800/80 border-slate-300"
                          : p.rank === 3
                          ? "bg-amber-950/30 border-amber-700"
                          : "bg-slate-900/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black font-mono text-base ${
                            p.rank === 1
                              ? "bg-amber-500 text-slate-950 shadow-md"
                              : p.rank === 2
                              ? "bg-slate-300 text-slate-950"
                              : p.rank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          #{p.rank}
                        </span>

                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full inline-block"
                            style={{ backgroundColor: p.colorHex }}
                          />
                          <h3 className="text-xl font-black uppercase text-white">
                            {p.name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <span className="text-3xl font-scoreboard font-black tabular-nums text-white">
                          {p.totalScore}{" "}
                          <span className="text-xs text-slate-400 font-mono font-normal">pts</span>
                        </span>
                        {p.rank === 1 && (
                          <Crown className="w-6 h-6 text-amber-400 fill-amber-400 animate-bounce" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ======================================================== */}
          {/* MODE 5: GAME OVER / WINNER CELEBRATION STAGE             */}
          {/* ======================================================== */}
          {viewMode === "GAME_OVER" && (
            <motion.section
              key="mode-game-over"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-gradient-to-b from-amber-600/20 via-slate-900 to-[#020617] border-4 border-amber-400 shadow-[0_0_80px_rgba(245,158,11,0.3)] relative overflow-hidden"
            >
              <div className="p-4 rounded-full bg-amber-500/20 border border-amber-400 text-amber-400 mb-4 animate-bounce">
                <Crown className="w-16 h-16 fill-amber-400" />
              </div>

              <span className="text-sm font-mono uppercase tracking-widest text-amber-300 font-bold block mb-2">
                PERTANDINGAN SELESAI • DATA DIKUNCI KE CLOUD
              </span>

              <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight uppercase">
                JUARA: {currentLeader?.name}
              </h2>

              <div className="my-6 text-8xl font-scoreboard font-black text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]">
                {currentLeader?.totalScore} <span className="text-3xl text-amber-200">PTS</span>
              </div>

              <p className="text-base font-mono text-slate-300 max-w-xl">
                Selamat kepada sang juara! Seluruh riwayat skor dan rekaman ronde pertandingan ini telah diarsipkan secara permanen.
              </p>

              {/* Podium Highlights */}
              <div className="mt-8 flex items-center justify-center gap-6">
                {players.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 min-w-[160px]"
                  >
                    <span className="text-xs font-mono font-bold text-amber-400">
                      JUARA #{p.rank}
                    </span>
                    <h4 className="text-base font-black text-white uppercase mt-1">
                      {p.name}
                    </h4>
                    <span className="text-xl font-scoreboard font-bold text-slate-200">
                      {p.totalScore} pts
                    </span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER: SYSTEM METRICS BAR */}
      <footer className="border-t border-slate-800/80 pt-3 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500 shrink-0">
        <div>SCORESYNC ARENA | REAL-TIME 60 FPS SPECTATOR ENGINE</div>
        <div className="flex items-center gap-6">
          <span>TOTAL PEMAIN: {players.length}</span>
          <span>LOG MUTASI: {match.scoreLogs?.length || 0}</span>
          <span className="text-amber-400 font-bold">ZERO-LATENCY REMOTE SYNC (&lt; 300 MS)</span>
        </div>
      </footer>
    </main>
  );
}
