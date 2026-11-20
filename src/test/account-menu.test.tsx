import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu } from "@/components/account-menu";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, hash, ...props }: { children: ReactNode; to: string; hash: string }) => (
    <a href={hash ? `${to}#${hash}` : to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/services/auth-service", () => ({
  signOut: vi.fn(),
}));

describe("Akun Saya", () => {
  it("links to the account editor and projects from the dropdown", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AccountMenu active={false} />
      </QueryClientProvider>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Akun Saya" }), { key: "ArrowDown" });

    const projects = await screen.findByRole("menuitem", { name: "Proyek Saya" });
    expect(projects).toHaveAttribute("href", "/profil#proyek-saya");
    expect(screen.getByRole("menuitem", { name: "Keluar" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Edit akun" })).toHaveAttribute(
      "href",
      "/akun/edit",
    );
  });
});
