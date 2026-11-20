import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { useSession } from "@/hooks/use-session";
import { signInWithEmail, signInWithProvider, signUpWithEmail } from "@/services/auth-service";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk atau daftar — Pomah Living" },
      { name: "description", content: "Masuk atau buat akun Pomah Living untuk menyimpan profil Anda." },
      { property: "og:title", content: "Masuk atau daftar — Pomah Living" },
      { property: "og:description", content: "Masuk atau buat akun Pomah Living untuk menyimpan profil Anda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kendala. Silakan coba lagi.";
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: "/profil", replace: true });
  }, [session, navigate]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await signInWithEmail(String(form.get("email")), String(form.get("password")));
      toast.success("Selamat datang kembali!");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await signUpWithEmail(
        String(form.get("email")),
        String(form.get("password")),
        String(form.get("name")),
      );
      if (result.needsConfirmation) setConfirmSent(true);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleProvider(provider: "google" | "lovable") {
    try {
      await signInWithProvider(provider);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <main className="page-container flex justify-center py-14">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-foreground">Akun Pomah Living</h1>
        <p className="mt-1 text-sm text-muted-foreground">Masuk atau buat akun baru untuk menyimpan profil Anda.</p>

        {confirmSent ? (
          <p role="status" className="mt-6 rounded-lg bg-brand-soft p-4 text-sm text-brand-deep">
            Cek email Anda dan klik tautan konfirmasi untuk mengaktifkan akun.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#747775] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F2F2F2]"
                onClick={() => void handleProvider("google")}
              >
                <GoogleLogo />
                Lanjutkan dengan Google
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleProvider("lovable")}>
                <LovableMark className="size-[18px]" />
                Lanjutkan dengan Lovable
              </Button>
            </div>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              atau dengan email
              <span className="h-px flex-1 bg-border" />
            </div>
            <Tabs defaultValue="masuk">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="masuk">Masuk</TabsTrigger>
                <TabsTrigger value="daftar">Daftar</TabsTrigger>
              </TabsList>
              <TabsContent value="masuk">
                <form className="mt-4 grid gap-4" onSubmit={(e) => void handleSignIn(e)}>
                  <div className="grid gap-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signin-password">Kata sandi</Label>
                    <Input id="signin-password" name="password" type="password" required autoComplete="current-password" />
                  </div>
                  <Button type="submit" disabled={busy}>Masuk</Button>
                </form>
              </TabsContent>
              <TabsContent value="daftar">
                <form className="mt-4 grid gap-4" onSubmit={(e) => void handleSignUp(e)}>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-name">Nama tampilan</Label>
                    <Input id="signup-name" name="name" required autoComplete="name" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-password">Kata sandi</Label>
                    <Input id="signup-password" name="password" type="password" required minLength={6} autoComplete="new-password" />
                  </div>
                  <Button type="submit" disabled={busy}>Buat akun</Button>
                </form>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </main>
  );
}
