// Synthetic Web Audio API Sound Effects (ScoreSync Audio Engine)
// 100% synthetic, zero external asset requests, zero network latency

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Standard tournament buzzer horn
 */
export function playTournamentBuzzer(durationMs: number = 1800) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = durationMs / 1000;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.8, now + 0.05);
    masterGain.gain.setValueAtTime(0.8, now + duration - 0.15);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    masterGain.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, now);
    filter.connect(masterGain);

    const freqs = [185, 233, 277, 370];

    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.25, now);

      osc.connect(oscGain);
      oscGain.connect(filter);

      osc.start(now);
      osc.stop(now + duration);
    });
  } catch (err) {
    console.warn("Could not play synthesized buzzer:", err);
  }
}

/**
 * Victory fanfare: Celebratory ascending chords (C4, E4, G4, C5)
 */
export function playVictoryFanfare() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25]; // C4, E4, G4, C5, E5

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.12;
      const duration = idx === notes.length - 1 ? 1.0 : 0.22;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.6, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (err) {
    console.warn("Could not play victory fanfare:", err);
  }
}

/**
 * Minus penalty buzzer: Low abrasive double-tone buzzer
 */
export function playMinusPenaltyBuzzer() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const pulses = [0, 0.25];

    pulses.forEach((offset) => {
      const startTime = now + offset;
      const duration = 0.18;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.7, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (err) {
    console.warn("Could not play penalty buzzer:", err);
  }
}

/**
 * Round bell: Crisp resonant bell sound (880Hz / 1760Hz harmonics with long decay)
 */
export function playRoundBell() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const harmonics = [880, 1760, 2640];

    harmonics.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      const amp = 0.5 / (idx + 1);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.8);
    });
  } catch (err) {
    console.warn("Could not play round bell:", err);
  }
}

export function playAudioEffect(effect: "VICTORY" | "MINUS_PENALTY" | "ROUND_BELL" | "BUZZER") {
  switch (effect) {
    case "VICTORY":
      playVictoryFanfare();
      break;
    case "MINUS_PENALTY":
      playMinusPenaltyBuzzer();
      break;
    case "ROUND_BELL":
      playRoundBell();
      break;
    case "BUZZER":
      playTournamentBuzzer();
      break;
  }
}
