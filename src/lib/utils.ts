import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  if (seconds <= 0) return "00.0";
  if (seconds < 60) {
    // Format SS.s (tenths of a second) when under 60 seconds (FR-CLK-002)
    const fixed = seconds.toFixed(1);
    const [intPart, decimalPart = "0"] = fixed.split(".");
    return `${intPart.padStart(2, "0")}.${decimalPart}`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function getSportPresets(sport: string) {
  switch (sport) {
    case "basketball":
      return { maxPeriods: 4, initialPeriodSeconds: 600, foulBonusThreshold: 5, shotClockEnabled: true };
    case "futsal":
      return { maxPeriods: 2, initialPeriodSeconds: 1200, foulBonusThreshold: 5, shotClockEnabled: false };
    case "volleyball":
      return { maxPeriods: 5, initialPeriodSeconds: 0, foulBonusThreshold: 99, shotClockEnabled: false };
    case "generic":
    default:
      return { maxPeriods: 4, initialPeriodSeconds: 600, foulBonusThreshold: 5, shotClockEnabled: false };
  }
}
