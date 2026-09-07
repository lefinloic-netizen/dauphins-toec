import type { ExerciseCategory } from "../types/database";

export type RecordUnit = "kg" | "cm" | "time";

export function unitForCategory(category: ExerciseCategory): RecordUnit {
  if (category === "natation") return "time";
  if (category === "saut") return "cm";
  return "kg";
}

export function timeToSeconds(minutes: number, seconds: number, milliseconds: number): number {
  return minutes * 60 + seconds + milliseconds / 1000;
}

export function secondsToTimeParts(totalSeconds: number): { minutes: number; seconds: number; milliseconds: number } {
  const totalMs = Math.round(totalSeconds * 1000);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;
  return { minutes, seconds, milliseconds };
}

export function formatTime(totalSeconds: number): string {
  const { minutes, seconds, milliseconds } = secondsToTimeParts(totalSeconds);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

export function formatValue(value: number, unit: RecordUnit): string {
  if (unit === "time") return formatTime(value);
  if (unit === "cm") return `${value} cm`;
  return `${value} kg`;
}
