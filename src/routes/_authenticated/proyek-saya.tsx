import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/proyek-saya")({
  beforeLoad: () => {
    throw redirect({ to: "/profil", hash: "proyek-saya", replace: true });
  },
});
