export type SearchParams = { [key: string]: string | string[] | undefined };

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Resolves a `from`/`to` date range from URL search params, defaulting to
 * the last `defaultDays` days when either bound is missing or invalid.
 */
export function resolveDateRange(params: SearchParams, defaultDays = 30) {
  const rawFrom = firstParam(params.from);
  const rawTo = firstParam(params.to);

  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(today.getDate() - defaultDays);

  const isValidDate = (value: string | undefined): value is string =>
    !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

  return {
    from: isValidDate(rawFrom) ? rawFrom : toDateString(defaultFrom),
    to: isValidDate(rawTo) ? rawTo : toDateString(today),
  };
}
