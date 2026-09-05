export function formatQuantity(value: number | null, unit: "m3" | "tonnes") {
  if (value === null || value === undefined) return "-";

  if (unit === "m3") return `${value.toLocaleString()} m³`;
  return `${value.toLocaleString()} t`;
}

export function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatMinutes(value: number | null) {
  if (value === null || value === undefined) return "-";

  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

/**
 * Parses a Postgres interval string (e.g. "02:07:00" or, for spans
 * over 24h, "1 day 02:07:00") as returned by PostgREST into minutes.
 */
export function parseIntervalMinutes(value: string | null): number | null {
  if (!value) return null;

  const dayMatch = value.match(/(\d+)\s+days?/);
  const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;

  const timeMatch = value.match(/(\d{1,3}):(\d{2}):(\d{2})/);
  if (!timeMatch) return null;

  const hours = days * 24 + parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);

  return hours * 60 + minutes;
}

/**
 * Formats a Postgres interval string (e.g. "02:07:00" or, for spans
 * over 24h, "1 day 02:07:00") as returned by PostgREST.
 */
export function formatDuration(value: string | null) {
  if (!value) return "-";

  const totalMinutes = parseIntervalMinutes(value);
  if (totalMinutes === null) return value;

  return formatMinutes(totalMinutes);
}
