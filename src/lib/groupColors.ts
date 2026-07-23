export const GROUP_COLOR_PALETTE = [
  "#2E9E3A",
  "#1565C0",
  "#E65100",
  "#6A1B9A",
  "#B71C1C",
  "#00838F",
];

export function nextGroupColor(existingCount: number): string {
  return GROUP_COLOR_PALETTE[existingCount % GROUP_COLOR_PALETTE.length];
}
