"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Monitor, 
  RotateCcw, 
  Plus, 
  Crown, 
  Trophy, 
  AlertTriangle, 
  Trash2, 
  Wifi, 
  WifiOff,
  CheckCircle2,
  Play,
  Pause,
  Clock,
  Volume2,
  Table,
  Sparkles,
  Flame,
  MinusCircle,
  PlusCircle,
  Flag,
  Radio,
  ChevronRight,
  Edit2
} from "lucide-react";
import { useMatchDetails } from "@/modules/match/hooks/use-match-details";
import { useMatchRealtime } from "@/lib/realtime/use-match-realtime";
import { mutateScore } from "@/app/actions/mutate-score";

interface PageProps {
  params: { matchId: string };
}

export default function AdminMobileControllerPage({ params }: PageProps) {
  const matchId = parseInt(params.matchId, 10);
  const router = useRouter();

  const { data: match, refetch, isLoading } = useMatchDetails(matchId);
  const { status: connectionStatus } = useMatchRealtime(matchId);

  // Manual input modal state
  const [manualPlayerId, setManualPlayerId] = useState<number | null>(null);
  const [manualPoints, setManualPoints] = useState<string>("");
  
  // Confirmation modals
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  // Quick Score Action
  async function handleScore(playerId: number, delta: number, type: "PRESET" | "MANUAL" = "PRESET") {
    if (isSubmitting || !match) return;
    setIsSubmitting(true);
    try {
      const res = await mutateScore({
        action: "INPUT_SCORE",
        matchId,
        playerId,
        pointDelta: delta,
        sourceType: type,
      });
      if (res.success) {
        triggerToast(`Skor ${delta > 0 ? `+${delta}` : delta} tercatat!`);
        refetch();
      } else {
        alert(res.error || "Gagal menginput skor");
      }
    } catch (err) {
      console.error("Score mutation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Undo Last Score
  async function handleUndo() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await mutateScore({
        action: "UNDO_LAST_SCORE",
        matchId,
      });
      if (res.success) {
        triggerToast("Skor terakhir dibatalkan (Undo)!");
        refetch();
      } else {
        alert(res.error || "Tidak ada skor untuk dibatalkan");
      }
    } catch (err) {
      console.error("Undo error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Remote Display Switcher
  async function handleSwitchDisplayMode(
    mode: "TOTAL_SCORE_ONLY" | "DETAIL_TABLE" | "HIGHLIGHT_MINUS_PLUS" | "LEADERBOARD" | "GAME_OVER",
    filter?: "ALL" | "MOST_MINUS" | "MOST_PLUS"
  ) {
    try {
      await mutateScore({
        action: "SWITCH_DISPLAY_MODE",
        matchId,
        viewMode: mode,
        activeFilter: filter || "ALL",
      });
      triggerToast(`Layar dialihkan ke: ${mode}`);
      refetch();
    } catch (err) {
      console.error("Display switch error:", err);
    }
  }

  // Sound Trigger
  async function handleTriggerAudio(effect: "VICTORY" | "MINUS_PENALTY" | "ROUND_BELL") {
    try {
      await mutateScore({
        action: "TRIGGER_AUDIO",
        matchId,
        effect,
      });
      triggerToast(`Bunyi ${effect} terkirim ke laptop!`);
    } catch (err) {
      console.error("Audio trigger error:", err);
    }
  }

  // Timer Controls
  async function handleTimer(operation: "START" | "PAUSE" | "RESET") {
    try {
      await mutateScore({
        action: "CONTROL_TIMER",
        matchId,
        operation,
      });
      refetch();
    } catch (err) {
      console.error("Timer error:", err);
    }
  }

  // Advance Round
  async function handleAdvanceRound() {
    try {
      await mutateScore({
        action: "ADVANCE_ROUND",
        matchId,
      });
      triggerToast(`Ronde ${match ? match.currentRound + 1 : ""} Dimulai!`);
      refetch();
    } catch (err) {
      console.error("Advance round error:", err);
    }
  }

  // Finish Match
  async function handleFinishMatch() {
    setIsSubmitting(true);
    try {
      await mutateScore({
        action: "FINISH_MATCH",
        matchId,
      });
      setIsFinishConfirmOpen(false);
      triggerToast("Pertandingan Selesai & Data Dikunci!");
      refetch();
    } catch (err) {
      console.error("Finish error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Reset Match
  async function handleResetMatch() {
    setIsSubmitting(true);
    try {
      await mutateScore({
        action: "RESET_MATCH",
        matchId,
      });
      setIsResetConfirmOpen(false);
      triggerToast("Pertandingan telah direset!");
      refetch();
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || !match) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-3 text-sm text-slate-400 font-mono tracking-wider">MEMUAT KONSOL HP...</p>
      </div>
    );
  }

  const currentViewMode = match.displayState?.viewMode || "TOTAL_SCORE_ONLY";
  const currentFilter = match.displayState?.activeFilter || "ALL";
  const timerSec = match.displayState?.timerSeconds || 0;
  const isTimerRunning = match.displayState?.isTimerRunning || false;

  const timerMin = Math.floor(timerSec / 60).toString().padStart(2, "0");
  const timerRemainder = (timerSec % 60).toString().padStart(2, "0");

  const lastLog = match.scoreLogs && match.scoreLogs.length > 0 ? match.scoreLogs[0] : null;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-28 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-primary/95 text-primary-content px-4 py-2 rounded-full shadow-2xl text-xs font-bold font-mono tracking-wide backdrop-blur-md animate-bounce border border-primary-focus">
          {toastMessage}
        </div>
      )}

      {/* TOP HEADER: Mobile Navigation & Status */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="btn btn-circle btn-sm btn-ghost text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="badge badge-primary badge-xs font-bold font-mono uppercase">
                  ADMIN HP
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  RONDE {match.currentRound}
                </span>
              </div>
              <h1 className="text-sm font-black text-white truncate max-w-[170px]">
                {match.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Indicator */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                connectionStatus === "connected"
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                  : "bg-red-950/80 text-red-400 border border-red-800"
              }`}
            >
              {connectionStatus === "connected" ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-400 animate-spin" />
              )}
              <span>{connectionStatus === "connected" ? "LIVE" : "SYNC..."}</span>
            </div>

            {/* Display Link */}
            <Link
              href={`/screen/${match.id}`}
              target="_blank"
              className="btn btn-square btn-sm btn-ghost bg-slate-800/80 text-amber-400 border border-slate-700"
              title="Buka Layar Laptop"
            >
              <Monitor className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* TIMER & QUICK TOOLBAR BAR */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
          {/* Timer Display & Actions */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 px-2.5 py-1 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-black font-mono tracking-wider text-amber-400">
              {timerMin}:{timerRemainder}
            </span>
            <button
              onClick={() => handleTimer(isTimerRunning ? "PAUSE" : "START")}
              className={`btn btn-xs btn-circle ${
                isTimerRunning ? "btn-warning" : "btn-success"
              } ml-1`}
              title={isTimerRunning ? "Pause Timer" : "Start Timer"}
            >
              {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleTimer("RESET")}
              className="btn btn-xs btn-circle btn-ghost text-slate-500 hover:text-white"
              title="Reset Timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Advance Round Button */}
          <button
            onClick={handleAdvanceRound}
            className="btn btn-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 gap-1 rounded-xl font-bold font-mono text-[11px]"
          >
            <ChevronRight className="w-3.5 h-3.5 text-primary" />
            Next Ronde ({match.currentRound + 1})
          </button>
        </div>
      </header>

      {/* REMOTE DISPLAY SWITCHER SECTION (MODUL REMOTE LAPTOP CONTROL) */}
      <section className="px-4 py-3 bg-slate-900/60 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            Remote Tampilan Layar Laptop
          </span>
          <span className="text-[10px] font-mono text-primary font-bold">
            Mode Aktif: {currentViewMode.replace(/_/g, " ")}
          </span>
        </div>

        {/* 5 Display Mode Buttons */}
        <div className="grid grid-cols-5 gap-1.5">
          <button
            onClick={() => handleSwitchDisplayMode("TOTAL_SCORE_ONLY")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold font-mono transition-all border ${
              currentViewMode === "TOTAL_SCORE_ONLY"
                ? "bg-primary text-primary-content border-primary shadow-md shadow-primary/30"
                : "bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800"
            }`}
          >
            <span className="text-xs">🔢</span>
            <span className="mt-1 leading-tight text-center">Skor Total</span>
          </button>

          <button
            onClick={() => handleSwitchDisplayMode("DETAIL_TABLE")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold font-mono transition-all border ${
              currentViewMode === "DETAIL_TABLE"
                ? "bg-primary text-primary-content border-primary shadow-md shadow-primary/30"
                : "bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800"
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span className="mt-1 leading-tight text-center">Tabel Detail</span>
          </button>

          <button
            onClick={() => handleSwitchDisplayMode("HIGHLIGHT_MINUS_PLUS", "ALL")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold font-mono transition-all border ${
              currentViewMode === "HIGHLIGHT_MINUS_PLUS"
                ? "bg-primary text-primary-content border-primary shadow-md shadow-primary/30"
                : "bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="mt-1 leading-tight text-center">Stat Ronde</span>
          </button>

          <button
            onClick={() => handleSwitchDisplayMode("LEADERBOARD")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold font-mono transition-all border ${
              currentViewMode === "LEADERBOARD"
                ? "bg-primary text-primary-content border-primary shadow-md shadow-primary/30"
                : "bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="mt-1 leading-tight text-center">Klasemen</span>
          </button>

          <button
            onClick={() => setIsFinishConfirmOpen(true)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold font-mono transition-all border ${
              match.status === "FINISHED" || currentViewMode === "GAME_OVER"
                ? "bg-error text-error-content border-error"
                : "bg-red-950/40 text-red-300 border-red-900/60 hover:bg-red-900/50"
            }`}
          >
            <Flag className="w-3.5 h-3.5 text-red-400" />
            <span className="mt-1 leading-tight text-center">Selesai</span>
          </button>
        </div>

        {/* Subfilter if Stat Ronde mode */}
        {currentViewMode === "HIGHLIGHT_MINUS_PLUS" && (
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">Filter Stat:</span>
            <button
              onClick={() => handleSwitchDisplayMode("HIGHLIGHT_MINUS_PLUS", "ALL")}
              className={`btn btn-xs rounded-lg ${
                currentFilter === "ALL" ? "btn-primary" : "btn-ghost text-slate-400"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => handleSwitchDisplayMode("HIGHLIGHT_MINUS_PLUS", "MOST_MINUS")}
              className={`btn btn-xs rounded-lg ${
                currentFilter === "MOST_MINUS" ? "btn-error" : "btn-ghost text-slate-400"
              }`}
            >
              Most Minus
            </button>
            <button
              onClick={() => handleSwitchDisplayMode("HIGHLIGHT_MINUS_PLUS", "MOST_PLUS")}
              className={`btn btn-xs rounded-lg ${
                currentFilter === "MOST_PLUS" ? "btn-success" : "btn-ghost text-slate-400"
              }`}
            >
              Most Plus
            </button>
          </div>
        )}
      </section>

      {/* LAPTOP SOUNDBOARD TRIGGERS */}
      <section className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1 shrink-0">
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          Sound FX:
        </span>
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <button
            onClick={() => handleTriggerAudio("ROUND_BELL")}
            className="btn btn-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-lg text-[10px] font-mono"
          >
            🔔 Bell Ronde
          </button>
          <button
            onClick={() => handleTriggerAudio("MINUS_PENALTY")}
            className="btn btn-xs bg-red-950/80 hover:bg-red-900 text-red-300 border-red-800 rounded-lg text-[10px] font-mono"
          >
            🚨 Penalty
          </button>
          <button
            onClick={() => handleTriggerAudio("VICTORY")}
            className="btn btn-xs bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-800 rounded-lg text-[10px] font-mono"
          >
            🎺 Victory
          </button>
        </div>
      </section>

      {/* MAIN PLAYERS LIST: INPUT SKOR PER PEMAIN */}
      <main className="p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black font-mono uppercase tracking-wider text-slate-400">
            Daftar Pemain ({match.players?.length || 0})
          </h2>
          <span className="text-[10px] font-mono text-slate-500">
            One-Tap Input & Koreksi Cepat
          </span>
        </div>

        {match.players?.map((player) => {
          return (
            <div
              key={player.id}
              className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-lg relative overflow-hidden"
            >
              {/* Left Color Accent */}
              <div
                className="absolute top-0 bottom-0 left-0 w-1.5"
                style={{ backgroundColor: player.colorHex }}
              />

              {/* Player Header: Name, Slot, Total Score */}
              <div className="flex items-center justify-between pl-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black font-mono text-white shadow-sm"
                    style={{ backgroundColor: player.colorHex }}
                  >
                    {player.slotOrder}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      {player.name}
                      {player.rank === 1 && (
                        <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      )}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      Rank #{player.rank}
                    </span>
                  </div>
                </div>

                {/* Big Score Badge */}
                <div className="text-right">
                  <span className="text-2xl font-black font-scoreboard tabular-nums text-white drop-shadow">
                    {player.totalScore}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block -mt-1">
                    pts total
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS: PRESETS & MANUAL */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/70 grid grid-cols-6 gap-1.5 pl-2">
                {/* Minus Presets: -200, -100 */}
                <button
                  onClick={() => handleScore(player.id, -200, "PRESET")}
                  disabled={isSubmitting || match.status === "FINISHED"}
                  className="btn btn-xs h-10 bg-red-950/70 hover:bg-red-900 border-red-800/80 text-red-300 font-mono font-black text-xs rounded-xl shadow active:scale-95 transition-transform"
                >
                  -200
                </button>
                <button
                  onClick={() => handleScore(player.id, -100, "PRESET")}
                  disabled={isSubmitting || match.status === "FINISHED"}
                  className="btn btn-xs h-10 bg-red-950/70 hover:bg-red-900 border-red-800/80 text-red-300 font-mono font-black text-xs rounded-xl shadow active:scale-95 transition-transform"
                >
                  -100
                </button>

                {/* Plus Presets: +100, +150, +200 */}
                <button
                  onClick={() => handleScore(player.id, 100, "PRESET")}
                  disabled={isSubmitting || match.status === "FINISHED"}
                  className="btn btn-xs h-10 bg-emerald-950/70 hover:bg-emerald-900 border-emerald-800/80 text-emerald-300 font-mono font-black text-xs rounded-xl shadow active:scale-95 transition-transform"
                >
                  +100
                </button>
                <button
                  onClick={() => handleScore(player.id, 150, "PRESET")}
                  disabled={isSubmitting || match.status === "FINISHED"}
                  className="btn btn-xs h-10 bg-emerald-950/70 hover:bg-emerald-900 border-emerald-800/80 text-emerald-300 font-mono font-black text-xs rounded-xl shadow active:scale-95 transition-transform"
                >
                  +150
                </button>
                <button
                  onClick={() => handleScore(player.id, 200, "PRESET")}
                  disabled={isSubmitting || match.status === "FINISHED"}
                  className="btn btn-xs h-10 bg-emerald-950/70 hover:bg-emerald-900 border-emerald-800/80 text-emerald-300 font-mono font-black text-xs rounded-xl shadow active:scale-95 transition-transform"
                >
                  +200
                </button>

                {/* Manual Input Button */}
                <button
                  onClick={() => {
                    setManualPlayerId(player.id);
                    setManualPoints("");
                  }}
                  disabled={isSubmitting || match.status === "FINISHED"}
                  className="btn btn-xs h-10 bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400 font-mono font-bold text-xs rounded-xl shadow active:scale-95 transition-transform"
                  title="Input Nilai Manual (+/-)"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </main>

      {/* BOTTOM FLOATING ACTION BAR: UNDO LAST SCORE & RESET */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 p-3 flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          {lastLog ? (
            <div className="text-left truncate">
              <span className="text-[10px] text-slate-400 font-mono block">Input Terakhir:</span>
              <span className="text-xs font-bold font-mono text-slate-200 truncate">
                R{lastLog.roundNumber}:{" "}
                <span className={lastLog.pointDelta > 0 ? "text-emerald-400" : "text-red-400"}>
                  {lastLog.pointDelta > 0 ? `+${lastLog.pointDelta}` : lastLog.pointDelta}
                </span>{" "}
                ({lastLog.sourceType})
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-mono">Belum ada input poin</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleUndo}
            disabled={!lastLog || isSubmitting || match.status === "FINISHED"}
            className="btn btn-sm bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700 rounded-xl font-bold font-mono gap-1.5 shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="btn btn-sm btn-ghost text-slate-500 hover:text-red-400 rounded-xl"
            title="Reset Skor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* MANUAL SCORE INPUT MODAL */}
      {manualPlayerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white font-mono">
              Input Skor Manual
            </h3>
            <p className="text-xs text-slate-400">
              Pemain:{" "}
              <strong className="text-white">
                {match.players?.find((p) => p.id === manualPlayerId)?.name}
              </strong>
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400">
                Nilai Poin (Bisa positif misal 35, atau negatif misal -15):
              </label>
              <input
                type="number"
                value={manualPoints}
                onChange={(e) => setManualPoints(e.target.value)}
                placeholder="Contoh: 35 atau -15"
                className="input input-bordered w-full bg-slate-950 font-scoreboard text-xl font-bold text-center text-white border-slate-700 focus:border-primary"
                autoFocus
              />
            </div>

            {/* Quick Helper buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setManualPoints("35")}
                className="btn btn-xs flex-1 bg-slate-800 text-slate-300 font-mono"
              >
                +35
              </button>
              <button
                type="button"
                onClick={() => setManualPoints("-15")}
                className="btn btn-xs flex-1 bg-slate-800 text-slate-300 font-mono"
              >
                -15
              </button>
              <button
                type="button"
                onClick={() => setManualPoints("50")}
                className="btn btn-xs flex-1 bg-slate-800 text-slate-300 font-mono"
              >
                +50
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setManualPlayerId(null)}
                className="btn btn-sm btn-ghost text-slate-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const pts = parseInt(manualPoints, 10);
                  if (isNaN(pts)) {
                    alert("Masukkan angka yang valid");
                    return;
                  }
                  await handleScore(manualPlayerId, pts, "MANUAL");
                  setManualPlayerId(null);
                }}
                disabled={!manualPoints}
                className="btn btn-sm btn-primary font-bold font-mono px-5"
              >
                Simpan Skor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINISH MATCH MODAL */}
      {isFinishConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Trophy className="w-8 h-8" />
              <div>
                <h3 className="text-base font-black text-white font-mono">
                  Akhiri Pertandingan?
                </h3>
                <p className="text-xs text-slate-400">
                  Layar laptop akan menampilkan panggung pemenang dan pertandingan akan dikunci.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsFinishConfirmOpen(false)}
                className="btn btn-sm btn-ghost text-slate-400"
              >
                Batal
              </button>
              <button
                onClick={handleFinishMatch}
                className="btn btn-sm btn-error font-bold font-mono"
              >
                Ya, Akhiri & Kunci
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET CONFIRM MODAL */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-8 h-8" />
              <div>
                <h3 className="text-base font-black text-white font-mono">
                  Reset Semua Skor?
                </h3>
                <p className="text-xs text-slate-400">
                  Semua nilai skor pemain dan riwayat log ronde akan dikosongkan.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="btn btn-sm btn-ghost text-slate-400"
              >
                Batal
              </button>
              <button
                onClick={handleResetMatch}
                className="btn btn-sm btn-error font-bold font-mono"
              >
                Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
