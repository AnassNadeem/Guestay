export type DatePreset = "7" | "15" | "30" | "90" | "custom" | "all";

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Inclusive range from preset (or custom from/to). `all` = unbounded. */
export function rangeFromPreset(
  preset: DatePreset,
  customFrom: string,
  customTo: string,
): { from: string; to: string } | null {
  if (preset === "all") return null;
  if (preset === "custom") {
    return {
      from: customFrom || daysAgoIso(7),
      to: customTo || todayIso(),
    };
  }
  const days = Number(preset);
  return { from: daysAgoIso(days), to: todayIso() };
}

export function inDateRange(
  dateStr: string | undefined | null,
  from: string,
  to: string,
): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}

export function truncateName(name: string, max = 28): string {
  if (!name) return "";
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}
