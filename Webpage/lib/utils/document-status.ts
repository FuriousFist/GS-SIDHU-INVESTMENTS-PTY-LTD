export type DocumentStatus = "missing" | "expired" | "expiring" | "verified";

export const EXPIRING_WITHIN_DAYS = 30;

const MELBOURNE_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Australia/Melbourne",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Today's calendar date in Australia/Melbourne as "YYYY-MM-DD". Expiry
 * dates are plain dates, so comparing against the local date (not UTC,
 * which lags Melbourne by 10-11 hours) keeps "expires today" correct
 * through the whole Melbourne day.
 */
export function todayInMelbourne(now: Date = new Date()) {
  return MELBOURNE_DATE.format(now);
}

function dayNumber(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function getDocumentStatus(input: {
  hasFile: boolean;
  neverExpires: boolean;
  expiryDate: string | null;
  today?: Date;
}): DocumentStatus {
  if (!input.hasFile) return "missing";
  if (input.neverExpires) return "verified";
  if (!input.expiryDate) return "missing";

  const daysLeft =
    dayNumber(input.expiryDate.slice(0, 10)) -
    dayNumber(todayInMelbourne(input.today));

  if (daysLeft < 0) return "expired";
  if (daysLeft <= EXPIRING_WITHIN_DAYS) return "expiring";
  return "verified";
}

// Lower ranks sort (and count as "worse") first.
const STATUS_RANK: Record<DocumentStatus, number> = {
  expired: 0,
  expiring: 1,
  missing: 2,
  verified: 3,
};

export function statusSortRank(status: DocumentStatus) {
  return STATUS_RANK[status];
}

export function worstStatus(statuses: DocumentStatus[]): DocumentStatus {
  let worst: DocumentStatus = "verified";
  for (const status of statuses) {
    if (STATUS_RANK[status] < STATUS_RANK[worst]) worst = status;
  }
  return worst;
}

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  missing: "Missing",
  expired: "Expired",
  expiring: "Expiring",
  verified: "Verified",
};
