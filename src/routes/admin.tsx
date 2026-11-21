import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, LayoutDashboard, Images, Users, ShieldCheck } from "lucide-react";

type Hero = { id: string; sort_order: number; eyebrow: string; title: string; description: string; image_url: string; image_alt: string; button_label: string; button_href: string; published: boolean; updated_at: string };
type Approval = { user_id: string; requested_role: string; status: string; note: string; created_at: string };
type Profile = { id: string; display_name: string | null; full_name: string | null };
type AdminRow = { user_id: string; role: "super_admin" | "admin" };
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type AdminDb = {
  public: {
    Tables: {
      admin_roles: Table<AdminRow>;
      hero_slides: Table<Hero>;
      partner_approvals: Table<Approval>;
      profiles: Table<Profile>;
      admin_audit_log: Table<{ actor_id: string; action: string; target: string; id: number; created_at: string }>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
};
const db = supabase as unknown as SupabaseClient<AdminDb>;
const slideFields = "id,sort_order,eyebrow,title,description,image_url,image_alt,button_label,button_href,published,updated_at";
export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin Control Center — POMAH Living" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { session, ready } = useSession();
  const id = session?.user.id;
  const role = useQuery({
    queryKey: ["admin-role", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await db.from("admin_roles").select("role").eq("user_id", id!).maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
    retry: false,
  });
  if (!ready) return <main className="page-container py-12">Memeriksa sesi…</main>;
  if (!id) return <main className="page-container py-12"><h1 className="section-title">Admin Control Center</h1><p className="mt-3">Masuk dahulu untuk membuka halaman admin.</p><Button asChild className="mt-4"><Link to="/auth">Masuk</Link></Button></main>;
  if (role.isPending) return <main className="page-container py-12">Memeriksa akses admin…</main>;
  if (role.isError) return <main className="page-container py-12" role="alert">Hak akses gagal diperiksa. Pastikan migrasi database admin sudah diterapkan.</main>;
  if (!role.data) return <main className="page-container py-12"><h1 className="section-title">Akses ditolak</h1><p className="mt-3">Akun ini tidak memiliki hak akses administrator.</p><Button asChild className="mt-5" variant="outline"><Link to="/">Kembali ke beranda</Link></Button></main>;
  return <AdminWorkspace key={id} userId={id} role={role.data} />;
}

function AdminWorkspace({ userId, role }: { userId: string; role: string }) {
  const client = useQueryClient();
  const [tab, setTab] = useState<"overview" | "slides" | "users">("overview");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const slides = useQuery({
    queryKey: ["admin-slides"],
    queryFn: async () => {
      const { data, error } = await db.from("hero_slides").select(slideFields).order("sort_order");
      if (error) throw error;
      return data as Hero[];
    },
  });
  const approvals = useQuery({
    queryKey: ["admin-approvals"],
    queryFn: async () => {
      const { data, error } = await db.from("partner_approvals").select("user_id,requested_role,status,note,created_at").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as Approval[];
    },
  });
  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await db.from("profiles").select("id,display_name,full_name").limit(200);
      if (error) throw error;
      return data as Profile[];
    },
  });

  async function writeAudit(action: string, target: string) {
    const { error } = await db.from("admin_audit_log").insert({ actor_id: userId, action, target });
    if (error) throw error;
  }
  async function saveSlide(slide: Partial<Hero>, originalId?: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const payload = { ...slide, updated_at: new Date().toISOString() };
      const result = originalId
        ? await db.from("hero_slides").update(payload).eq("id", originalId).select("id").single()
        : await db.from("hero_slides").insert(payload).select("id").single();
      if (result.error) throw result.error;
      await writeAudit(originalId ? "slide.update" : "slide.create", result.data.id);
      await client.invalidateQueries({ queryKey: ["admin-slides"] });
      await client.invalidateQueries({ queryKey: ["public-hero-slides"] });
      setMessage("Slide berhasil disimpan.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan slide."); }
    finally { setBusy(false); }
  }
  async function removeSlide(id: string) {
    if (!window.confirm("Hapus slide ini?")) return;
    setBusy(true);
    try {
      const result = await db.from("hero_slides").delete().eq("id", id);
      if (result.error) throw result.error;
      await writeAudit("slide.delete", id);
      await client.invalidateQueries({ queryKey: ["admin-slides"] });
      await client.invalidateQueries({ queryKey: ["public-hero-slides"] });
      setMessage("Slide dihapus.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menghapus slide."); }
    finally { setBusy(false); }
  }
  async function review(userId: string, status: "approved" | "rejected" | "revision") {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const result = await db.from("partner_approvals").update({ status }).eq("user_id", userId).eq("status", "pending");
      if (result.error) throw result.error;
      await writeAudit(`approval.${status}`, userId);
      await client.invalidateQueries({ queryKey: ["admin-approvals"] });
      setMessage("Keputusan persetujuan tercatat.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal memproses persetujuan."); }
    finally { setBusy(false); }
  }
  const pending = approvals.data?.filter((item) => item.status === "pending") ?? [];
  return (
    <main className="page-container py-8 sm:py-12">
      <Link to="/" className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:underline"><ArrowLeft className="size-4"/> Beranda</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="eyebrow text-brand">POMAH Living · {role}</p><h1 className="section-title mt-2">Admin Control Center</h1></div>
        <span className="rounded-md border bg-card px-3 py-2 text-xs">Akses terverifikasi</span>
      </div>
      <div className="mt-7 flex flex-wrap gap-2 border-b border-border pb-3" role="tablist" aria-label="Modul admin">
        {([{ value: "overview", label: "Dashboard", icon: LayoutDashboard }, { value: "slides", label: "Hero Slider", icon: Images }, { value: "users", label: "Pengguna & Approval", icon: Users }] as const).map(({ value, label, icon: Icon }) => (
          <Button key={value} type="button" size="sm" variant={tab === value ? "default" : "outline"} onClick={() => setTab(value)} aria-selected={tab === value} role="tab"><Icon className="size-4"/> {label}</Button>
        ))}
      </div>
      {message && <p className="mt-4 rounded-md bg-muted p-3 text-sm" role="status">{message}</p>}
      {(slides.isError || approvals.isError || profiles.isError) && <p className="mt-4 text-sm text-destructive" role="alert">Sebagian data gagal dimuat. Pastikan SQL admin sudah dijalankan.</p>}
      {tab === "overview" && <section className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Akun terdaftar (maks. 200 ditampilkan)", count: profiles.data?.length, icon: Users },
          { label: "Permohonan menunggu", count: pending.length, icon: ShieldCheck },
          { label: "Slide terpublikasi", count: slides.data?.filter((item) => item.published).length, icon: Images },
        ].map(({ label, count, icon: Icon }) => <div key={label} className="rounded-xl border bg-card p-5"><Icon className="size-5 text-brand"/><p className="mt-3 text-2xl font-semibold">{count ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
        <p className="text-xs leading-6 text-muted-foreground sm:col-span-3">Dashboard tahap awal: statistik berdasarkan data yang tersedia. Pengguna tidak dapat memperoleh role admin melalui formulir ini.</p>
      </section>}
      {tab === "slides" && <section className="mt-7 space-y-5">
        <div><h2 className="text-xl font-semibold">Manajemen Hero Slider</h2><p className="mt-2 text-sm text-muted-foreground">Konten tersimpan di database. Slide yang dipublikasikan menggantikan slide contoh di halaman depan.</p></div>
        {slides.data?.map((slide) => <SlideForm key={slide.id} slide={slide} busy={busy} save={saveSlide} remove={removeSlide}/>)}
        <SlideForm key="new" busy={busy} save={saveSlide} remove={removeSlide}/>
      </section>}
      {tab === "users" && <section className="mt-7 space-y-5">
        <div><h2 className="text-xl font-semibold">Pengguna & Approval Mitra</h2><p className="mt-2 text-sm text-muted-foreground">Pendaftaran pengguna biasa tetap aktif. Approval khusus untuk peran mitra.</p></div>
        {approvals.isPending ? <p>Memuat permohonan…</p> : pending.length === 0 ? <p className="rounded-md border p-4 text-sm">Belum ada permohonan mitra yang menunggu.</p> : pending.map((item) => {
          const profile = profiles.data?.find((p) => p.id === item.user_id);
          return <article key={item.user_id} className="rounded-lg border p-4"><p className="font-semibold">{profile?.full_name || profile?.display_name || "Pengguna"}</p><p className="mt-1 text-xs text-muted-foreground">Peran: {item.requested_role} · {item.user_id}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={() => review(item.user_id, "approved")}>Setujui</Button><Button size="sm" disabled={busy} variant="outline" onClick={() => review(item.user_id, "revision")}>Minta revisi</Button><Button size="sm" disabled={busy} variant="destructive" onClick={() => review(item.user_id, "rejected")}>Tolak</Button></div></article>;
        })}
        <h3 className="pt-4 text-base font-semibold">Daftar akun</h3>
        <div className="grid gap-2 sm:grid-cols-2">{profiles.data?.map(p=><div key={p.id} className="rounded-md border px-3 py-2 text-sm">{p.full_name || p.display_name || "Nama belum diisi"}<p className="mt-1 break-all text-xs text-muted-foreground">{p.id}</p></div>)}</div>
      </section>}
    </main>
  );
}
function SlideForm({ slide, busy, save, remove }: { slide?: Hero; busy: boolean; save: (value: Partial<Hero>, id?: string) => Promise<void>; remove: (id: string) => Promise<void> }) {
  const [published, setPublished] = useState(slide?.published ?? false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const val = (key: string) => String(form.get(key) ?? "").trim();
    void save({
      eyebrow: val("eyebrow"), title: val("title"), description: val("description"), image_url: val("image_url"),
      image_alt: val("image_alt"), button_label: val("button_label"), button_href: val("button_href"),
      sort_order: Number(val("sort_order")), published,
    }, slide?.id);
  }
  return <form onSubmit={submit} className="rounded-xl border bg-card p-4 sm:p-5">
    <h3 className="mb-4 font-semibold">{slide ? `Edit slide #${slide.sort_order}` : "Tambah slide baru"}</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      {([{ key:"eyebrow",label:"Label atas",max:100 },{key:"title",label:"Judul",max:160 },{key:"button_label",label:"Teks tombol",max:80 },{key:"image_alt",label:"Deskripsi gambar",max:180 },{key:"image_url",label:"URL gambar HTTPS",max:1000 }] as const).map(({key,label,max})=><label key={key} className="text-xs">{label}<Input className="mt-1" name={key} maxLength={max} defaultValue={slide?.[key] ?? ""} required={key === "title" || key === "image_url"}/></label>)}
      <label className="text-xs">Urutan<Input className="mt-1" name="sort_order" type="number" min="0" max="999" defaultValue={slide?.sort_order ?? 0}/></label>
      <label className="text-xs">Tujuan tombol<select name="button_href" defaultValue={slide?.button_href ?? "/pilih-aset"} className="mt-1 block h-9 w-full rounded-md border bg-background px-3"><option value="/pilih-aset">Pilih aset</option><option value="/proyek/demo">Proyek demo</option></select></label>
      <label className="text-xs sm:col-span-2">Deskripsi<Textarea className="mt-1" name="description" maxLength={350} defaultValue={slide?.description ?? ""}/></label>
    </div>
    <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(e)=>setPublished(e.target.checked)}/> Publikasikan ke halaman depan</label>
    <div className="mt-4 flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{slide ? "Simpan perubahan" : "Tambah slide"}</Button>{slide && <Button type="button" disabled={busy} variant="destructive" onClick={()=>void remove(slide.id)}>Hapus</Button>}</div>
  </form>;
}
