import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Pencil, RefreshCw, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { AdminDemoPhotos } from "@/components/admin-demo-photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FinanceEditor,
  NumberField,
  RabEditor,
  ScenarioEditor,
} from "@/components/flipping-editors";
import { calculateFlipping, rabTotal } from "@/lib/flipping";
import { formatRupiah } from "@/lib/simulation";
import { demoSampleSchema, type DemoSample } from "@/lib/flipping-demos";
import {
  fetchAdminDemos,
  saveDemoSample,
  setDemoHidden,
  publishedDemoKey,
} from "@/services/flipping-demo-service";
import { adminError } from "@/services/admin-service";

export function AdminFlippingDemos({ userId }: { userId: string }) {
  const query = useQuery({
    queryKey: ["admin", userId, "flipping-demos"],
    queryFn: fetchAdminDemos,
  });
  const [selected, setSelected] = useState("demo");
  const [view, setView] = useState("finance");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const client = useQueryClient();
  if (query.isPending)
    return (
      <p className="mt-8" role="status">
        Memuat demo flipping…
      </p>
    );
  if (query.isError)
    return (
      <div className="mt-8">
        <p role="alert">{adminError(query.error)}</p>
        <Button className="mt-3" onClick={() => void query.refetch()}>
          <RefreshCw /> Coba lagi
        </Button>
      </div>
    );
  const entry = query.data.find((item) => item.sample.id === selected);
  async function toggleHidden(item: AdminDemo, hidden: boolean) {
    const name = item.sample.project.property.name;
    if (
      hidden &&
      !window.confirm(
        `Hapus demo "${name}" dari halaman publik? Demo bisa dipulihkan kembali dari halaman ini.`,
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      await setDemoHidden(item.sample, hidden, item.publishedRevision);
      await client.invalidateQueries({ queryKey: publishedDemoKey });
      await client.invalidateQueries({ queryKey: ["admin", userId, "flipping-demos"] });
      await client.invalidateQueries({ queryKey: ["admin", userId, "audit"] });
      setMessage(hidden ? `Demo "${name}" dihapus dari publik.` : `Demo "${name}" dipulihkan.`);
    } catch (cause) {
      setMessage(adminError(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8 space-y-6" aria-label="Flipping Demo">
      <div>
        <h2 className="text-xl font-semibold">Flipping Demo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Proyek contoh yang tampil di halaman Pilih aset dan bisa dibuka tanpa login.
        </p>
      </div>
      {message && (
        <p role="status" className="text-sm text-success">
          {message}
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {query.data.map((item) => (
          <DemoCard
            key={item.sample.id}
            item={item}
            active={item.sample.id === selected}
            busy={busy}
            onEdit={() => setSelected(item.sample.id)}
            onToggle={(hidden) => void toggleHidden(item, hidden)}
          />
        ))}
      </ul>
      {entry && (
        <h3 className="border-t border-border pt-6 text-lg font-semibold">
          Edit demo: {entry.sample.project.property.name}
        </h3>
      )}
      {entry && (
        <DemoEditor
          key={`${selected}:${entry.sample.revision}:${entry.publishedRevision}`}
          initial={entry.sample}
          publishedRevision={entry.publishedRevision}
          userId={userId}
          onSaved={setMessage}
          busy={busy}
          setBusy={setBusy}
          view={view}
          setView={setView}
        />
      )}
    </section>
  );
}
type AdminDemo = Awaited<ReturnType<typeof fetchAdminDemos>>[number];
function DemoCard({
  item,
  active,
  busy,
  onEdit,
  onToggle,
}: {
  item: AdminDemo;
  active: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggle: (hidden: boolean) => void;
}) {
  const { sample, publishedRevision, publicHidden } = item;
  const totals = calculateFlipping(sample.project.finance, sample.project.rab);
  const status = publicHidden
    ? { label: "Dihapus dari publik", tone: "bg-muted text-muted-foreground" }
    : publishedRevision > 0
      ? { label: "Dipublikasikan", tone: "bg-brand-soft text-brand-deep" }
      : { label: "Contoh bawaan", tone: "bg-warning-soft text-foreground" };
  return (
    <li
      className={`flex flex-col rounded-xl border p-4 ${
        active ? "border-brand ring-1 ring-brand" : "border-border"
      } ${publicHidden ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.tone}`}>
          {status.label}
        </span>
        <span className="text-[11px] text-muted-foreground">{sample.id}</span>
      </div>
      <h3 className="mt-3 font-semibold leading-snug">{sample.project.property.name}</h3>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{sample.description}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Harga jual</dt>
          <dd className="font-medium">{formatRupiah(sample.project.finance.sale)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Laba</dt>
          <dd className={`font-medium ${totals.profit < 0 ? "text-destructive" : ""}`}>
            {formatRupiah(totals.profit)}
          </dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button size="sm" variant={active ? "default" : "outline"} disabled={busy} onClick={onEdit}>
          <Pencil /> Edit
        </Button>
        {!publicHidden && (
          <Button size="sm" variant="outline" asChild>
            <Link to="/proyek/$id" params={{ id: sample.id }} target="_blank">
              <Eye /> Lihat
            </Link>
          </Button>
        )}
        {publicHidden ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onToggle(false)}>
            <RotateCcw /> Pulihkan
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() => onToggle(true)}
            aria-label={`Hapus demo ${sample.project.property.name}`}
          >
            <Trash2 /> Hapus
          </Button>
        )}
      </div>
      {publicHidden && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <EyeOff className="size-3" aria-hidden="true" /> Tidak tampil di halaman publik.
        </p>
      )}
    </li>
  );
}
function DemoEditor({
  initial,
  publishedRevision,
  userId,
  onSaved,
  busy,
  setBusy,
  view,
  setView,
}: {
  initial: DemoSample;
  publishedRevision: number;
  userId: string;
  onSaved: (message: string) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  view: string;
  setView: (view: string) => void;
}) {
  const [sample, setSample] = useState(initial);
  const [error, setError] = useState("");
  const client = useQueryClient();
  const totals = calculateFlipping(sample.project.finance, sample.project.rab);
  async function save(publish: boolean) {
    if (busy) return;
    const valid = demoSampleSchema.safeParse(sample);
    if (!valid.success || !sample.project.property.name.trim()) {
      setError("Periksa judul, angka asumsi, dan rincian RAB.");
      return;
    }
    setBusy(true);
    setError("");
    onSaved("");
    let draftSaved = false;
    const adminKey = ["admin", userId, "flipping-demos"];
    try {
      const saved = await saveDemoSample(valid.data, false, sample.revision);
      draftSaved = true;
      setSample(saved);
      if (publish) {
        await saveDemoSample(saved, true, publishedRevision);
        await client.invalidateQueries({ queryKey: publishedDemoKey });
      }
      onSaved(
        publish
          ? "Demo dipublikasikan. Simulasi lokal versi lama tidak menggantikan versi baru."
          : "Draf tersimpan. Demo publik belum berubah.",
      );
      await client.invalidateQueries({ queryKey: adminKey });
      await client.invalidateQueries({ queryKey: ["admin", userId, "audit"] });
    } catch (cause) {
      const detail = adminError(cause);
      setError(draftSaved ? `Draf tersimpan. Publikasi gagal. ${detail}` : detail);
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset disabled={busy} className="min-w-0 space-y-6">
      <p className="text-xs text-muted-foreground">
        Data fiktif · Draf {sample.revision} · Versi publik {publishedRevision || "fixture awal"}
      </p>
      <label className="block text-sm font-medium">
        Judul demo
        <Input
          className="mt-2"
          value={sample.project.property.name}
          maxLength={500}
          onChange={(e) =>
            setSample({
              ...sample,
              project: {
                ...sample.project,
                property: { ...sample.project.property, name: e.target.value },
              },
            })
          }
        />
      </label>
      <label className="block text-sm font-medium">
        Deskripsi demo
        <Textarea
          aria-label="Deskripsi demo"
          className="mt-2"
          value={sample.description}
          maxLength={2000}
          onChange={(e) => setSample({ ...sample, description: e.target.value })}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium">
          Alamat contoh
          <Input
            value={sample.project.property.address}
            maxLength={500}
            onChange={(event) => {
              const address = event.target.value;
              setSample((current) => ({
                ...current,
                project: { ...current.project, property: { ...current.project.property, address } },
              }));
            }}
          />
        </label>
        <NumberField
          label="Nilai limit lelang"
          value={sample.project.property.limit}
          onChange={(limit) =>
            setSample((current) => ({
              ...current,
              project: { ...current.project, property: { ...current.project.property, limit } },
            }))
          }
        />
      </div>
      <dl className="grid grid-cols-1 gap-4 border-y border-border py-5 sm:grid-cols-3">
        {[
          ["Total RAB", rabTotal(sample.project.rab)],
          ["Biaya all-in", totals.allIn],
          ["Proyeksi laba bersih", totals.profit],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-2 break-words font-semibold tabular-nums">
              {formatRupiah(Number(value))}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={view === "finance" ? "brand" : "outline"}
          onClick={() => setView("finance")}
        >
          Biaya & pendanaan
        </Button>
        <Button variant={view === "rab" ? "brand" : "outline"} onClick={() => setView("rab")}>
          RAB rinci
        </Button>
        <Button
          variant={view === "scenarios" ? "brand" : "outline"}
          onClick={() => setView("scenarios")}
        >
          Skenario
        </Button>
        <Button variant={view === "photos" ? "brand" : "outline"} onClick={() => setView("photos")}>
          Foto
        </Button>
      </div>
      {view === "finance" ? (
        <FinanceEditor
          project={sample.project}
          onChange={(project) => setSample({ ...sample, project })}
        />
      ) : view === "rab" ? (
        <RabEditor
          project={sample.project}
          onChange={(project) => setSample({ ...sample, project })}
        />
      ) : null}
      {view === "scenarios" && (
        <ScenarioEditor
          project={sample.project}
          onChange={(project) => setSample({ ...sample, project })}
        />
      )}
      {view === "photos" && (
        <AdminDemoPhotos
          sample={sample}
          userId={userId}
          onChange={(photos) => setSample((current) => ({ ...current, photos }))}
          setBusy={setBusy}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3 border-t border-border pt-5">
        <Button disabled={busy} variant="outline" onClick={() => void save(false)}>
          <Save /> Simpan draf
        </Button>
        <Button disabled={busy} onClick={() => void save(true)}>
          <Send /> {busy ? "Menyimpan…" : "Publikasikan demo"}
        </Button>
        <Button asChild variant="ghost">
          <Link to="/proyek/$id" params={{ id: sample.id }}>
            Buka demo publik
          </Link>
        </Button>
      </div>
    </fieldset>
  );
}
