import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, ChevronDown, LogOut, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/services/auth-service";

export function AccountMenu({ active }: { active: boolean }) {
  const navigate = useNavigate();
  const cache = useQueryClient();
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
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="nav"
          data-active={active}
          className="gap-1.5 px-2 text-xs sm:px-4 sm:text-sm"
        >
          <UserRound className="hidden sm:block" aria-hidden="true" />
          Akun Saya
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link to="/profil" hash="proyek-saya">
            <BriefcaseBusiness aria-hidden="true" />
            Proyek Saya
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/akun/edit">
            <Pencil aria-hidden="true" />
            Edit akun
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={signingOut} onSelect={() => void handleSignOut()}>
          <LogOut aria-hidden="true" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
