// Matches the project's PostgREST max_rows: a bigger request is silently cut to this.
export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Loads every row of a query by paging through it, since a single
 * request stops at PAGE_SIZE rows without an error. `page` must build
 * the query with a unique order (e.g. `.order("id")`) so pages don't
 * overlap.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<PageResult<T> & { data: T[] }> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows, error };

    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
