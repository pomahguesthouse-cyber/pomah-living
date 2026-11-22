import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Save, Send, RefreshCw } from "lucide-react";
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
  publishedDemoKey,
} from "@/services/flipping-demo-service";
import { adminError } from "@/services/admin-service";

export function AdminFlippingDemos({ userId }: { userId: string }) {
  const query = useQuery({
    queryKey: ["admin", userId, "flipping-demos"],
    queryFn: fetchAdminDemos,
  });
  const [selected, setSelected] = useState("demo");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
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
  return (
    <section className="mt-8 space-y-6" aria-label="Flipping Demo">
      <h2 className="text-xl font-semibold">Flipping Demo</h2>
      {message && (
        <p role="status" className="text-sm text-success">
          {message}
        </p>
      )}
      <label className="block text-sm">
        Proyek contoh
        <select
          className="mt-2 block h-10 w-full rounded-md border border-input bg-background px-3 sm:max-w-md"
          value={selected}
          disabled={busy}
          onChange={(event) => setSelected(event.target.value)}
        >
          {query.data.map(({ sample }) => (
            <option key={sample.id} value={sample.id}>
              {sample.project.property.name} · {sample.id}
            </option>
          ))}
        </select>
      </label>
      {entry && (
        <DemoEditor
          key={`${selected}:${entry.sample.revision}:${entry.publishedRevision}`}
          initial={entry.sample}
          publishedRevision={entry.publishedRevision}
          userId={userId}
          onSaved={setMessage}
          busy={busy}
          setBusy={setBusy}
        />
      )}
    </section>
  );
}
function DemoEditor({
  initial,
  publishedRevision,
  userId,
  onSaved,
  busy,
  setBusy,
}: {
  initial: DemoSample;
  publishedRevision: number;
  userId: string;
  onSaved: (message: string) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}) {
  const [sample, setSample] = useState(initial);
  const [view, setView] = useState("finance");
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
