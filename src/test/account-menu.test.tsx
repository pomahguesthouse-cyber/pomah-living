import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu } from "@/components/account-menu";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, hash, ...props }: { children: ReactNode; to: string; hash: string }) => (
    <a href={`${to}#${hash}`} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/services/auth-service", () => ({
  fetchProfile: async () => ({ display_name: "Akun uji", avatar_url: null }),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
}));

describe("Akun Saya", () => {
  it("opens the account editor from the dropdown and keeps the project link in Akun Saya", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AccountMenu userId="u1" email="account@example.test" active={false} />
      </QueryClientProvider>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Akun Saya" }), { key: "ArrowDown" });

    const projects = await screen.findByRole("menuitem", { name: "Proyek Saya" });
    expect(projects).toHaveAttribute("href", "/profil#proyek-saya");
    expect(screen.getByRole("menuitem", { name: "Keluar" })).toBeVisible();
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit akun" }));

    const dialog = await screen.findByRole("dialog", { name: "Edit akun" });
    const name = await within(dialog).findByRole("textbox", { name: "Nama tampilan" });
    expect(name).toHaveValue("Akun uji");
  });
});
