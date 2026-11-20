import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, ChevronDown, LogOut, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchProfile, signOut, updateProfile } from "@/services/auth-service";

export function AccountMenu({
  userId,
  email,
  active,
}: {
  userId: string;
  email: string;
  active: boolean;
}) {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const trigger = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await cache.cancelQueries();
      await signOut();
      cache.clear();
      await navigate({ to: "/auth", replace: true });
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            variant="nav"
            data-active={active}
            className="gap-1.5 px-2 text-xs sm:px-4 sm:text-sm"
          >
            <UserRound className="hidden sm:block" aria-hidden="true" />
            Akun Saya
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44"
          onCloseAutoFocus={(event) => {
            if (editing) event.preventDefault();
          }}
        >
          <DropdownMenuItem asChild>
            <Link to="/profil" hash="proyek-saya">
              <BriefcaseBusiness aria-hidden="true" />
              Proyek Saya
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil aria-hidden="true" />
            Edit akun
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={signingOut} onSelect={() => void handleSignOut()}>
            <LogOut aria-hidden="true" />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent
          className="w-[calc(100%_-_2rem)] rounded-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit akun</DialogTitle>
            <DialogDescription>{email || "Ubah nama tampilan dan foto akun."}</DialogDescription>
          </DialogHeader>
          {editing && <AccountEditor userId={userId} onDone={() => setEditing(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AccountEditor({ userId, onDone }: { userId: string; onDone: () => void }) {
  const cache = useQueryClient();
  const queryKey = ["profile", userId];
  const profile = useQuery({ queryKey, queryFn: () => fetchProfile(userId) });
  const [draft, setDraft] = useState<{ name: string; avatar: string } | null>(null);
  const name = draft?.name ?? profile.data?.display_name ?? "";
  const avatar = draft?.avatar ?? profile.data?.avatar_url ?? "";
  const save = useMutation({
    mutationFn: () =>
      updateProfile(userId, { display_name: name.trim(), avatar_url: avatar.trim() }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey, exact: true });
      toast.success("Akun berhasil disimpan.");
      onDone();
    },
    onError: () => toast.error("Akun belum tersimpan. Coba lagi."),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() && !profile.isPending && !profile.isError && !save.isPending) save.mutate();
  }

  if (profile.isPending) {
    return (
      <p role="status" className="text-sm">
        Memuat akun…
      </p>
    );
  }

  if (profile.isError) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm">
          Data akun gagal dimuat.
        </p>
        <Button type="button" variant="outline" onClick={() => void profile.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      {avatar && <img src={avatar} alt="Foto akun" className="size-14 rounded-full object-cover" />}
      <div className="grid gap-2">
        <Label htmlFor="account-display-name">Nama tampilan</Label>
        <Input
          id="account-display-name"
          value={name}
          required
          onChange={(event) => setDraft({ name: event.target.value, avatar })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="account-avatar-url">Tautan foto akun (opsional)</Label>
        <Input
          id="account-avatar-url"
          type="url"
          value={avatar}
          placeholder="https://"
          onChange={(event) => setDraft({ name, avatar: event.target.value })}
        />
      </div>
      <Button type="submit" disabled={save.isPending || profile.isPending || !name.trim()}>
        Simpan akun
      </Button>
    </form>
  );
}
