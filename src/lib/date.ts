export function parseDateOnly(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(value: Date | string): string {
  if (typeof value === "string") {
    return value.includes("T") ? value.slice(0, 10) : value;
  }
  return value.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const value = parseDateOnly(date);
  value.setUTCDate(value.getUTCDate() + days);
  return formatDateOnly(value);
}

export function currentDateOnly(timeZone = "Asia/Tokyo"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export const mealTypeOrder = ["breakfast", "lunch", "dinner"] as const;

export function compareMealTypes(a?: string, b?: string): number {
  const aIndex = mealTypeOrder.indexOf(a as (typeof mealTypeOrder)[number]);
  const bIndex = mealTypeOrder.indexOf(b as (typeof mealTypeOrder)[number]);
  return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
}
