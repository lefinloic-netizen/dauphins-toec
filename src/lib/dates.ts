export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// "2026-07-23" -> "23/07/2026"
export function formatFRDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day; // recule jusqu'au lundi
  return addDays(d, diff);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function monthGrid(date: Date): Date[] {
  const first = startOfMonth(date);
  const gridStart = startOfWeek(first);
  const last = endOfMonth(date);
  const gridEndBase = startOfWeek(last);
  const weeksCount = Math.round((gridEndBase.getTime() - gridStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const cells: Date[] = [];
  for (let i = 0; i < weeksCount * 7; i++) {
    cells.push(addDays(gridStart, i));
  }
  return cells;
}

export function formatDayLabel(date: Date): string {
  return capitalize(
    new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
      date,
    ),
  );
}

export function formatWeekLabel(date: Date): string {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const startLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(start);
  const endLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(end);
  return `Semaine du ${startLabel} au ${endLabel}`;
}

export function formatMonthLabel(date: Date): string {
  return capitalize(new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
