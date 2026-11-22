import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Images,
  LayoutDashboard,
  Users,
  ShieldCheck,
  RefreshCw,
  History,
  Search,
  Building2,
  FolderKanban,
  Database,
  Activity,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminSlideForm } from "@/components/admin-slide-form";
import { AdminFlippingDemos } from "@/components/admin-flipping-demos";
import { canReviewApproval, statusLabels, type SlideInput } from "@/lib/admin";
import { formatProjectDate } from "@/lib/flipping";
import {
  adminError,
  fetchAdminRole,
  fetchAdminSlides,
  fetchAdminDirectory,
  fetchAdminAudit,
  fetchAdminMetrics,
  saveAdminSlide,
  deleteAdminSlide,
  reviewPartner,
} from "@/services/admin-service";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Control Center — POMAH Living" },
      {
        name: "description",
        content:
          "Kelola konten beranda, akun, persetujuan mitra, dan riwayat perubahan POMAH Living.",
      },
      { property: "og:title", content: "Admin Control Center — POMAH Living" },
      {
        property: "og:description",
        content: "Pusat pengelolaan konten dan persetujuan mitra POMAH Living.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});
function AdminPage() {
  const { session, ready } = useSession();
  const id = session?.user.id;
  const role = useQuery({
    queryKey: ["admin-role", id],
    enabled: Boolean(id),
    queryFn: () => (id ? fetchAdminRole(id) : Promise.resolve(null)),
    retry: false,
  });
  if (!ready || (id && role.isPending))
    return (
      <main className="page-container py-12" role="status">
        Memeriksa akses…
      </main>
    );
  if (!id)
    return (
      <main className="page-container py-12">
        <ShieldCheck className="size-8 text-brand" />
        <h1 className="section-title mt-4">Admin Control Center</h1>
        <p className="mt-3 text-muted-foreground">
          Masuk dengan akun administrator untuk melanjutkan.
        </p>
        <Button asChild className="mt-5">
          <Link to="/auth">Masuk</Link>
        </Button>
      </main>
    );
  if (role.isError)
    return (
      <main className="page-container py-12">
        <p role="alert" className="text-destructive">
          Pemeriksaan akses gagal: {adminError(role.error)}
        </p>
        <Button className="mt-4" onClick={() => void role.refetch()}>
          <RefreshCw /> Coba lagi
        </Button>
      </main>
    );
  if (!role.data)
    return (
      <main className="page-container py-12">
        <ShieldCheck className="size-8 text-brand" />
        <h1 className="section-title mt-4">Akses ditolak</h1>
        <p className="mt-3 text-muted-foreground">
          Akun ini belum memiliki hak administrator. Penetapan administrator dilakukan oleh pemilik.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/">Kembali ke beranda</Link>
        </Button>
      </main>
    );
  return <AdminWorkspace key={id} userId={id} role={role.data} />;
}
function AdminWorkspace({ userId, role }: { userId: string; role: string }) {
  const client = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [partnerRole, setPartnerRole] = useState("");
  const [page, setPage] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [newSlideKey, setNewSlideKey] = useState(0);
  const slides = useQuery({ queryKey: ["admin", userId, "slides"], queryFn: fetchAdminSlides });
  const directory = useQuery({
    queryKey: ["admin", userId, "directory", search, status, partnerRole, page],
    queryFn: () => fetchAdminDirectory(search, status, partnerRole, page),
  });
  const metrics = useQuery({
    queryKey: ["admin", userId, "metrics"],
    queryFn: fetchAdminMetrics,
    enabled: tab === "overview",
  });
  const audit = useQuery({
    queryKey: ["admin", userId, "audit", auditPage],
    queryFn: () => fetchAdminAudit(auditPage),
    enabled: tab === "audit",
  });
  async function perform(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    setFailure("");
    setMessage("");
    try {
      await action();
      await client.invalidateQueries({ queryKey: ["admin", userId] });
      await client.invalidateQueries({ queryKey: ["public-hero-slides"] });
      setMessage(success);
    } catch (error) {
      setFailure(adminError(error));
    } finally {
      setBusy(false);
    }
  }
  async function save(value: SlideInput, id?: string) {
    await perform(async () => {
      await saveAdminSlide(value, id);
      if (!id) setNewSlideKey((key) => key + 1);
    }, "Slide tersimpan dan perubahan tercatat.");
  }
  async function remove(id: string) {
    if (!window.confirm("Hapus slide ini? Perubahan tidak dapat dibatalkan.")) return;
    await perform(() => deleteAdminSlide(id), "Slide dihapus dan perubahan tercatat.");
  }
  const data = directory.data;
  const failedQuery = slides.error ?? directory.error ?? (tab === "audit" ? audit.error : null);
  const nav = [
    { value: "overview", label: "Dashboard", icon: LayoutDashboard },
    { value: "slides", label: "Slide beranda", icon: Images },
    { value: "flipping", label: "Flipping Demo", icon: Building2 },
    { value: "users", label: "Pengguna & mitra", icon: Users },
    { value: "audit", label: "Riwayat audit", icon: History },
  ];
  return (
    <main className="page-container py-8 sm:py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowLeft className="size-4" /> Beranda
      </Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-brand">POMAH Living</p>
          <h1 className="section-title mt-2">Admin Control Center</h1>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-brand-soft px-3 py-2 text-xs text-brand-deep">
          <ShieldCheck className="size-4" />{" "}
          {role === "super_admin" ? "Super admin" : "Administrator"}
        </div>
      </div>
      <div
        className="mt-7 flex flex-wrap gap-2 border-b border-border pb-4"
        role="tablist"
        aria-label="Modul admin"
      >
        {nav.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={tab === value ? "brand" : "ghost"}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
          >
            <Icon /> {label}
          </Button>
        ))}
      </div>
      {message && (
        <p role="status" className="mt-5 rounded-md bg-success-soft p-3 text-sm text-success">
          {message}
        </p>
      )}
      {(failure || failedQuery) && (
        <div role="alert" className="mt-5 rounded-md bg-danger-soft p-4 text-sm text-destructive">
          <p>{failure || adminError(failedQuery)}</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => void client.invalidateQueries({ queryKey: ["admin", userId] })}
          >
            <RefreshCw /> Muat ulang
          </Button>
        </div>
      )}
      {tab === "overview" && (
        <section className="mt-8" aria-label="Dashboard admin">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Ringkasan platform</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Statistik seluruh pengguna, bukan hanya akun yang sedang login.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                void metrics.refetch();
                void directory.refetch();
              }}
            >
              <RefreshCw /> Perbarui statistik
            </Button>
          </div>
          {metrics.isError && (
            <p role="alert" className="mb-4 text-sm text-destructive">
              Statistik belum tersedia: {adminError(metrics.error)}. Jalankan migrasi SQL dashboard
              terlebih dahulu.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: "Total pengguna",
                value: metrics.data?.users,
                icon: Users,
                tone: "border-sky-200 bg-sky-50/50 text-sky-700",
                detail: "Semua akun terdaftar",
                target: "users",
              },
              {
                label: "Total proyek flipping",
                value: metrics.data?.projects,
                icon: FolderKanban,
                tone: "border-emerald-200 bg-emerald-50/50 text-emerald-700",
                detail: "Proyek seluruh pengguna",
                target: "",
              },
              {
                label: "Aset properti unik",
                value: metrics.data?.assets,
                icon: Building2,
                tone: "border-amber-200 bg-amber-50/50 text-amber-700",
                detail: "Menunggu integrasi katalog aset",
                target: "",
              },
              {
                label: "Approval menunggu",
                value: metrics.data?.pending,
                icon: ShieldCheck,
                tone: "border-violet-200 bg-violet-50/50 text-violet-700",
                detail: "Permohonan mitra",
                target: "users",
              },
              {
                label: "Slide terpublikasi",
                value: metrics.data?.published,
                icon: Images,
                tone: "border-rose-200 bg-rose-50/50 text-rose-700",
                detail: "Konten beranda aktif",
                target: "slides",
              },
              {
                label: "Proyek terjual",
                value: metrics.data?.sold,
                icon: Activity,
                tone: "border-cyan-200 bg-cyan-50/50 text-cyan-700",
                detail: "Status proyek selesai terjual",
                target: "",
              },
            ].map(({ label, value, icon: Icon, tone, detail, target }) => (
              <article key={label} className={`rounded-xl border p-5 ${tone}`}>
                <Icon className="size-6" aria-hidden="true" />
                <p className="mt-4 text-3xl font-bold tabular-nums text-foreground">
                  {metrics.isPending ? "…" : value == null ? "—" : value.toLocaleString("id-ID")}
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                {target && (
                  <button
                    type="button"
                    className="mt-3 text-xs font-semibold underline underline-offset-4"
                    onClick={() => {
                      setTab(target);
                      if (label === "Approval menunggu") {
                        setStatus("pending");
                        setPage(0);
                      }
                    }}
                  >
                    Lihat detail
                  </button>
                )}
              </article>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Database className="size-5 text-brand" />
              <h3 className="font-semibold">Katalog aset BTN</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Statistik scraping belum dihubungkan ke tabel katalog. Angka ditampilkan sebagai tanda
              —, bukan nol, sampai konektor dan penyimpanan aset tersedia. Nantinya pisahkan total
              hasil impor, aset unik, aset aktif, dan aset gagal sinkron.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setTab("users");
                setStatus("pending");
                setPage(0);
              }}
            >
              Tinjau permohonan <ArrowRight />
            </Button>
            <Button variant="outline" onClick={() => setTab("slides")}>
              Kelola beranda <ArrowRight />
            </Button>
          </div>
        </section>
      )}
      {tab === "flipping" && <AdminFlippingDemos userId={userId} />}
      {tab === "slides" && (
        <section className="mt-8 space-y-5" aria-label="Manajemen slide">
          <h2 className="text-xl font-semibold">Slide beranda</h2>
          {slides.isPending ? (
            <p role="status">Memuat slide…</p>
          ) : (
            slides.data?.map((slide) => (
              <AdminSlideForm
                key={`${slide.id}-${slide.updated_at}`}
                slide={slide}
                busy={busy}
                save={save}
                remove={remove}
              />
            ))
          )}
          <AdminSlideForm key={`new-${newSlideKey}`} busy={busy} save={save} remove={remove} />
        </section>
      )}
      {tab === "users" && (
        <section className="mt-8" aria-label="Daftar pengguna">
          <h2 className="text-xl font-semibold">Pengguna & persetujuan mitra</h2>
          <form
            className="mt-5 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
              setPage(0);
            }}
          >
            <label className="min-w-0 flex-1 text-xs font-medium">
              Nama atau email
              <Input
                className="mt-2"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                maxLength={100}
              />
            </label>
            <Button type="submit" variant="outline" aria-label="Cari pengguna">
              <Search /> Cari
            </Button>
            <label className="text-xs font-medium">
              Status
              <select
                className="mt-2 block h-9 rounded-md border border-input bg-background px-3"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Semua status</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Peran mitra
              <select
                className="mt-2 block h-9 rounded-md border border-input bg-background px-3"
                value={partnerRole}
                onChange={(e) => {
                  setPartnerRole(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Semua peran</option>
                {["flipper", "investor", "kontraktor", "mitra_aset"].map((value) => (
                  <option key={value} value={value}>
                    {value.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </form>
          {directory.isPending ? (
            <p className="mt-5" role="status">
              Memuat akun…
            </p>
          ) : (
            <>
              <p className="mt-5 text-xs text-muted-foreground">
                {data?.total.toLocaleString("id-ID") ?? 0} akun sesuai filter
              </p>
              <div className="mt-4 space-y-3">
                {data?.rows.map((user) => (
                  <article key={user.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold">{user.name}</h3>
                        <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Daftar {formatProjectDate(user.created_at.slice(0, 10))} ·{" "}
                          {user.requested_role?.replace("_", " ") ?? "Pengguna biasa"}
                        </p>
                      </div>
                      <span
                        className={`rounded-md px-2 py-1 text-xs ${user.status === "approved" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}
                      >
                        {statusLabels[user.status] ?? user.status}
                      </span>
                    </div>
                    {user.note && (
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm">{user.note}</p>
                    )}
                    {canReviewApproval(user.status) && (
                      <ApprovalActions
                        busy={busy}
                        review={(decision, note) =>
                          perform(
                            () => reviewPartner(user.id, decision, note),
                            "Keputusan tersimpan dan tercatat dalam audit.",
                          )
                        }
                      />
                    )}
                  </article>
                ))}
              </div>
              {data?.rows.length === 0 && (
                <p className="mt-5 text-sm text-muted-foreground">Tidak ada akun sesuai filter.</p>
              )}
              <Pagination page={page} total={data?.total ?? 0} change={setPage} />
            </>
          )}
        </section>
      )}
      {tab === "audit" && (
        <section className="mt-8" aria-label="Riwayat audit">
          <h2 className="text-xl font-semibold">Riwayat perubahan</h2>
          {audit.isPending ? (
            <p className="mt-5" role="status">
              Memuat audit…
            </p>
          ) : (
            <>
              <div className="mt-5 divide-y divide-border">
                {audit.data?.rows.map((entry) => (
                  <article key={entry.id} className="py-4">
                    <p className="text-sm font-semibold">{entry.action}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {formatProjectDate(entry.created_at.slice(0, 10))} · Pelaku {entry.actor_id} ·
                      Target {entry.target}
                    </p>
                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer">Rincian sebelum / sesudah</summary>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <pre className="overflow-auto rounded-md bg-muted p-3">
                          {JSON.stringify(entry.before_data, null, 2)}
                        </pre>
                        <pre className="overflow-auto rounded-md bg-muted p-3">
                          {JSON.stringify(entry.after_data, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </article>
                ))}
              </div>
              {audit.data?.rows.length === 0 && (
                <p className="mt-5 text-sm text-muted-foreground">Belum ada perubahan tercatat.</p>
              )}
              <Pagination page={auditPage} total={audit.data?.total ?? 0} change={setAuditPage} />
            </>
          )}
        </section>
      )}
    </main>
  );
}
function ApprovalActions({
  busy,
  review,
}: {
  busy: boolean;
  review: (status: "approved" | "rejected" | "revision", note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="mt-4 border-t border-border pt-4">
      <label className="text-xs font-medium">
        Catatan keputusan
        <Textarea
          className="mt-2"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => void review("approved", note)}>
          Setujui
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || !note.trim()}
          onClick={() => void review("revision", note)}
        >
          Minta revisi
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={busy || !note.trim()}
          onClick={() => void review("rejected", note)}
        >
          Tolak
        </Button>
      </div>
    </div>
  );
}
function Pagination({
  page,
  total,
  change,
}: {
  page: number;
  total: number;
  change: (page: number) => void;
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <Button
        variant="outline"
        size="icon"
        aria-label="Halaman sebelumnya"
        disabled={page === 0}
        onClick={() => change(page - 1)}
      >
        <ArrowLeft />
      </Button>
      <p className="text-xs text-muted-foreground">
        Halaman {page + 1} dari {Math.max(1, Math.ceil(total / 25))}
      </p>
      <Button
        variant="outline"
        size="icon"
        aria-label="Halaman berikutnya"
        disabled={(page + 1) * 25 >= total}
        onClick={() => change(page + 1)}
      >
        <ArrowRight />
      </Button>
    </div>
  );
}
