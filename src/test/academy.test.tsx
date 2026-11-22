import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({ session: { user: { id: "academy-test-user" } }, ready: true }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { mission_index: Number.NaN, completed: false }, error: null }),
        }),
      }),
    }),
  },
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...original, Link: ({ children }: { children: ReactNode }) => <span>{children}</span> };
});

import { Route } from "@/routes/academy";

describe("Academy question recovery", () => {
  it("recovers an unavailable mission without accessing an undefined question", async () => {
    const Academy = Route.options.component;
    if (!Academy) throw new Error("Academy component is missing");
    render(<Academy />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Mulai kembali" }));
    expect(screen.getAllByRole("button")).toHaveLength(3);
    const firstAnswer = screen.getAllByRole("button")[0];
    if (!firstAnswer) throw new Error("First mission answer is missing");
    fireEvent.click(firstAnswer);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
