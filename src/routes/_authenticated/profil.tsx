import { createFileRoute } from "@tanstack/react-router";
import { ProjectWorkspace } from "@/components/project-workspace";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Akun Saya — Pomah Living" },
      {
        name: "description",
        content: "Kelola proyek rumah dan akses rincian investasi pribadi di Pomah Living.",
      },
      { property: "og:title", content: "Akun Saya — Pomah Living" },
      {
        property: "og:description",
        content: "Kelola proyek rumah dan rincian investasi pribadi Anda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { session } = useSession();
  const userId = session?.user.id;

  return (
    <main className="page-container py-8 sm:py-12">
      <h1 className="section-title mb-6">Akun Saya</h1>
      {userId && <ProjectWorkspace key={userId} userId={userId} />}
    </main>
  );
}
