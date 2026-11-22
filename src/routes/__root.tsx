import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, FlaskConical } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useSession, useSessionSync } from "@/hooks/use-session";
import logo from "@/assets/pomah-logo-original.svg.asset.json";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Halaman belum bisa dimuat
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Terjadi kendala. Silakan coba lagi atau kembali ke beranda.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Coba lagi
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pomah Living — Simulasi rumah lelang" },
      {
        name: "description",
        content: "Penilaian rumah lelang dan simulasi renovasi untuk renovator dan investor lokal.",
      },
      { name: "author", content: "Pomah Living" },
      { property: "og:title", content: "Pomah Living — Simulasi rumah lelang" },
      {
        property: "og:description",
        content:
          "Pertimbangkan biaya renovasi, batas tawar, dan laba jual kembali sebelum menawar rumah lelang.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;450;500;550;600;650;700;750;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useSessionSync();
  const { session, ready } = useSession();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-card">
          <div className="page-container flex h-20 items-center justify-between gap-3">
            <Link to="/" aria-label="Pomah Living — Beranda">
              <img className="brand-logo" src={logo.url} alt="Pomah Living" />
            </Link>
            <nav aria-label="Navigasi utama" className="flex items-center gap-1 sm:gap-3">
              <Button
                asChild
                variant="nav"
                data-active={pathname === "/"}
                className="px-2 text-xs sm:px-4 sm:text-sm"
              >
                <Link to="/">Beranda</Link>
              </Button>
              <Button
                asChild
                variant="nav"
                data-active={pathname.startsWith("/pilih-aset") || pathname.startsWith("/analisis")}
                className="px-2 text-xs sm:px-4 sm:text-sm"
              >
                <Link to="/pilih-aset">
                  Pilih aset
                  <ArrowUpRight className="hidden sm:block" />
                </Link>
              </Button>
              {ready && (session ? (
                <AccountMenu
                  key={session.user.id}
                  active={pathname === "/profil" || pathname === "/akun/edit"}
                />
              ) : (
                <Button
                  asChild
                  variant="nav"
                  data-active={pathname === "/auth"}
                  className="px-2 text-xs sm:px-4 sm:text-sm"
                >
                  <Link to="/auth">Masuk</Link>
                </Button>
              ))}
            </nav>
            <span className="hidden items-center gap-2 border-l border-border pl-6 text-xs text-muted-foreground md:flex">
              <FlaskConical className="size-4 text-brand" />
              Versi demo
            </span>
          </div>
        </header>
        <div className="flex-1">
          <Outlet />
        </div>
        <footer className="border-t border-border bg-card py-7">
          <div className="page-container flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-brand-deep">© 2026 Pomah Living</p>
            <p className="max-w-lg text-[11px] leading-5 text-muted-foreground sm:text-right">
              Pomah Living adalah prototipe independen. Data aset dalam demo adalah simulasi.
            </p>
          </div>
        </footer>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
