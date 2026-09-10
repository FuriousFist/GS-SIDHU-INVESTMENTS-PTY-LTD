import { vi } from "vitest";

/**
 * Test doubles for the Supabase JS client.
 *
 * Unlike the Python client (which needs a terminal `.execute()`), the
 * supabase-js query builder is itself "thenable" - `await` works
 * directly on the chain, with or without a terminal call like
 * `.range()` or `.single()`. So each chain method here just returns
 * the same builder, and the builder resolves to whatever result you
 * hand it when awaited - however long the chain the code under test
 * happens to call.
 */

type QueryResult = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};

export function makeQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};

  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "gte",
    "lte",
    "gt",
    "lt",
    "in",
    "ilike",
    "or",
    "order",
    "range",
    "limit",
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }

  // .single() narrows the result shape in real supabase-js, but for a
  // test double returning the same configured result is enough.
  builder.single = vi.fn(() => builder);

  builder.then = (
    onFulfilled?: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(onFulfilled, onRejected);

  return builder;
}

export function makeSupabaseMock() {
  return {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(),
    },
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  };
}

export type SupabaseMock = ReturnType<typeof makeSupabaseMock>;
