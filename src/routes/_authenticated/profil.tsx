import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { fetchProfile, signOut, updateProfile } from "@/services/auth-service";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Profil saya — Pomah Living" },
      { name: "description", content: "Kelola nama tampilan dan foto profil akun Pomah Living Anda." },
      { property: "og:title", content: "Profil saya — Pomah Living" },
      { property: "og:description", content: "Kelola nama tampilan dan foto profil akun Pomah Living Anda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId ?? ""),
    enabled: Boolean(userId),
  });
  const [draft, setDraft] = useState<{ name: string; avatar: string } | null>(null);
  const name = draft?.name ?? profileQuery.data?.display_name ?? "";
  const avatar = draft?.avatar ?? profileQuery.data?.avatar_url ?? "";

  const save = useMutation({
    mutationFn: () => updateProfile(userId ?? "", { display_name: name.trim(), avatar_url: avatar.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      setDraft(null);
      toast.success("Profil berhasil disimpan.");
    },
    onError: () => toast.error("Profil belum tersimpan. Silakan coba lagi."),
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    void navigate({ to: "/auth", replace: true });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <main className="page-container flex justify-center py-14">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt="" className="size-14 rounded-full object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-xl font-bold text-brand-deep">
              {(name || session?.user.email || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Profil saya</h1>
            <p className="text-sm text-muted-foreground">{session?.user.email}</p>
          </div>
        </div>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="display-name">Nama tampilan</Label>
            <Input id="display-name" value={name} required onChange={(e) => setDraft({ name: e.target.value, avatar })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="avatar-url">Tautan foto profil (opsional)</Label>
            <Input id="avatar-url" type="url" value={avatar} placeholder="https://" onChange={(e) => setDraft({ name, avatar: e.target.value })} />
          </div>
          <Button type="submit" disabled={save.isPending || profileQuery.isLoading}>Simpan profil</Button>
        </form>
        <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => void handleSignOut()}>
          Keluar
        </Button>
      </div>
    </main>
  );
}
