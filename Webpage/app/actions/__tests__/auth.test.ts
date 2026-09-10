import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { login, logout } from "@/app/actions/auth";

function formDataWith(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("login", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(redirect).mockClear();
  });

  test("valid credentials sign in and redirect home", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    await login(
      undefined,
      formDataWith({ email: "ops@example.com", password: "correct-horse" })
    );

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "ops@example.com",
      password: "correct-horse",
    });
    expect(redirect).toHaveBeenCalledWith("/");
  });

  test("invalid credentials return an error and do not redirect", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    const result = await login(
      undefined,
      formDataWith({ email: "ops@example.com", password: "wrong" })
    );

    expect(result).toEqual({ error: "Invalid email or password." });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  test("signs out and redirects to login", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.signOut.mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(redirect).mockClear();

    await logout();

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
