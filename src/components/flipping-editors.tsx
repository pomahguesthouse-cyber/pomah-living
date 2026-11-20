import { useEffect, useState } from "react";
import { Plus, Trash2, CircleAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  calculateFlipping,
  financeFields,
  rabTotal,
  workGroups,
  type FlippingProject,
} from "@/lib/flipping";
import { formatRupiah } from "@/lib/simulation";

type EditorProps = { project: FlippingProject; onChange: (project: FlippingProject) => void };
export function NumberField({
  label,
  value,
  unit = "Rp",
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value).replace(".", ","));
  useEffect(() => setDraft(String(value).replace(".", ",")), [value]);
  const parsed = Number(draft.replace(",", "."));
  const maximum =
    unit === "%" ? 100 : unit === "bulan" ? 120 : unit === "× RAB" ? 10 : 1_000_000_000_000;
  const invalid = !/^\d+(,\d+)?$/.test(draft) || !Number.isFinite(parsed) || parsed > maximum;
  return (
    <label className="block min-w-0 space-y-2 text-xs font-medium">
      <span className="block leading-5">
        {label} <span className="text-muted-foreground">({unit})</span>
      </span>
      <Input
        value={draft}
        inputMode="decimal"
        required
        aria-invalid={invalid}
        pattern="[0-9]+(,[0-9]+)?"
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const n = Number(next.replace(",", "."));
          const valid = /^\d+(,\d+)?$/.test(next) && Number.isFinite(n) && n >= 0 && n <= maximum;
          event.target.setCustomValidity(valid ? "" : `Isi angka antara 0 dan ${maximum}.`);
          if (valid) onChange(n);
        }}
      />
      {invalid && (
        <span className="block text-destructive" role="alert">
          Isi angka antara 0 dan {maximum.toLocaleString("id-ID")}.
        </span>
      )}
      <span className="print-value">
        {unit === "Rp" ? formatRupiah(value) : value.toLocaleString("id-ID")}
      </span>
    </label>
  );
}
export function FinanceEditor({ project, onChange }: EditorProps) {
  return (
    <div className="space-y-8">
      <p className="text-sm leading-6 text-muted-foreground">
        Semua tarif adalah asumsi yang dapat diubah, bukan ketetapan pajak. BPHTB bergantung pada
        peraturan daerah, dasar pengenaan, NPOPTKP, ketentuan lelang, dan pihak yang wajib membayar.
        Konfirmasikan dengan pemerintah daerah dan PPAT.
      </p>
      {["Akuisisi", "Holding", "Penjualan & cadangan"].map((group) => (
        <section key={group}>
          <h3 className="mb-4 border-b border-border pb-3 text-base font-semibold">{group}</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            {financeFields
              .filter((field) => field.group === group)
              .map((field) => (
                <NumberField
                  key={field.key}
                  label={field.label}
                  unit={field.unit}
                  value={project.finance[field.key]}
                  onChange={(value) =>
                    onChange({ ...project, finance: { ...project.finance, [field.key]: value } })
                  }
                />
              ))}
          </div>
        </section>
      ))}
      <div className="flex flex-wrap justify-between gap-2 border-y border-border py-4">
        <span>Renovasi dari RAB (termasuk contingency)</span>
        <strong>{formatRupiah(rabTotal(project.rab))}</strong>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        Renovasi hanya dihitung dari RAB. Cadangan di luar RAB bersifat tambahan dan tidak boleh
        mengulang contingency. Pokok pinjaman bukan biaya tambahan; hanya bunga sederhana prorata
        durasi yang ditambahkan. Pemasaran, utilitas, dan bunga tidak termasuk carrying cost
        bulanan.
      </p>
    </div>
  );
}
export function RabEditor({ project, onChange }: EditorProps) {
  const update = (id: string, change: Partial<FlippingProject["rab"][number]>) =>
    onChange({
      ...project,
      rab: project.rab.map((item) => (item.id === id ? { ...item, ...change } : item)),
    });
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">RAB renovasi</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Volume × harga satuan. Contingency sudah termasuk total.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={project.rab.length >= 200}
          onClick={() =>
            onChange({
              ...project,
              rab: [
                ...project.rab,
                {
                  id: crypto.randomUUID(),
                  name: "Pekerjaan baru",
                  group: "Persiapan",
                  volume: 1,
                  unit: "ls",
                  price: 0,
                },
              ],
            })
          }
        >
          <Plus />
          Tambah item
        </Button>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="rab-table w-full min-w-[820px] text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th>Pekerjaan</th>
              <th>Kelompok</th>
              <th>Volume</th>
              <th>Satuan</th>
              <th>Harga satuan</th>
              <th>Subtotal</th>
              <th className="no-print">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {project.rab.map((item, index) => (
              <tr key={item.id} className="border-b border-border">
                <td>
                  <Input
                    aria-label={`Pekerjaan ${index + 1}`}
                    value={item.name}
                    maxLength={500}
                    onChange={(e) => update(item.id, { name: e.target.value })}
                  />
                  <span className="print-value">{item.name}</span>
                </td>
                <td>
                  <select
                    aria-label={`Kelompok ${index + 1}`}
                    className="h-9 w-full rounded-md border border-input bg-background px-2"
                    value={item.group}
                    onChange={(e) => {
                      const group = workGroups.find((g) => g === e.target.value);
                      if (group) update(item.id, { group });
                    }}
                  >
                    {workGroups.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                  <span className="print-value">{item.group}</span>
                </td>
                <td>
                  <NumberField
                    label={`Volume ${index + 1}`}
                    unit="unit"
                    value={item.volume}
                    onChange={(volume) => update(item.id, { volume })}
                  />
                </td>
                <td>
                  <Input
                    aria-label={`Satuan ${index + 1}`}
                    value={item.unit}
                    maxLength={30}
                    onChange={(e) => update(item.id, { unit: e.target.value })}
                  />
                  <span className="print-value">{item.unit}</span>
                </td>
                <td>
                  <NumberField
                    label={`Harga satuan ${index + 1}`}
                    value={item.price}
                    onChange={(price) => update(item.id, { price })}
                  />
                </td>
                <td className="whitespace-nowrap font-semibold tabular-nums">
                  {formatRupiah(item.volume * item.price)}
                </td>
                <td className="no-print">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Hapus item"
                    aria-label={`Hapus item ${index + 1}`}
                    onClick={() =>
                      onChange({ ...project, rab: project.rab.filter((row) => row.id !== item.id) })
                    }
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {project.rab.length === 0 && (
        <p className="py-8 text-sm text-muted-foreground">Belum ada pekerjaan renovasi.</p>
      )}
      <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-border pt-5 text-lg">
        <strong>Total RAB</strong>
        <strong data-testid="rab-total">{formatRupiah(rabTotal(project.rab))}</strong>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        {workGroups.map((group) => (
          <div key={group}>
            <dt className="text-muted-foreground">{group}</dt>
            <dd className="mt-1 font-semibold">
              {formatRupiah(rabTotal(project.rab.filter((r) => r.group === group)))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function RiskEditor({ project, onChange }: EditorProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold">Dokumen & risiko</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Status hanya berubah setelah pemeriksaan Anda. Tidak ada verifikasi otomatis.
      </p>
      <div className="mt-5 divide-y divide-border">
        {project.risks.map((risk) => (
          <div key={risk.id} className="space-y-3 py-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                {risk.verified ? (
                  <CheckCircle2 className="size-4 text-success" />
                ) : (
                  <CircleAlert className="size-4 text-warning" />
                )}
                {risk.name}
              </h3>
              <Switch
                aria-label={`Verifikasi ${risk.name}`}
                checked={risk.verified}
                onCheckedChange={(verified) =>
                  onChange({
                    ...project,
                    risks: project.risks.map((r) => (r.id === risk.id ? { ...r, verified } : r)),
                  })
                }
              />
            </div>
            <p className={risk.verified ? "text-xs text-success" : "text-xs text-warning"}>
              {risk.verified ? "Ditandai terverifikasi oleh pengguna" : "Belum diverifikasi"}
            </p>
            <label className="block text-xs">
              Catatan {risk.name}
              <Input
                className="mt-2"
                value={risk.note}
                maxLength={500}
                onChange={(e) =>
                  onChange({
                    ...project,
                    risks: project.risks.map((r) =>
                      r.id === risk.id ? { ...r, note: e.target.value } : r,
                    ),
                  })
                }
              />
              <span className="print-value">{risk.note}</span>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}
export function TimelineEditor({ project, onChange }: EditorProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold">Timeline proyek</h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Tanggal rencana belum ditetapkan. Durasi biaya diatur terpisah pada analisis investasi.
      </p>
      <ol className="mt-6 space-y-5">
        {project.timeline.map((stage, index) => (
          <li
            key={stage.id}
            className="grid gap-3 border-b border-border pb-5 sm:grid-cols-[1fr_170px_150px]"
          >
            <h3 className="text-sm font-medium">
              <span className="mr-3 text-brand">0{index + 1}</span>
              {stage.name}
            </h3>
            <label className="text-xs">
              Tanggal rencana
              <Input
                type="date"
                className="mt-2"
                aria-label={`Tanggal ${stage.name}`}
                value={stage.date}
                onChange={(e) =>
                  onChange({
                    ...project,
                    timeline: project.timeline.map((s) =>
                      s.id === stage.id ? { ...s, date: e.target.value } : s,
                    ),
                  })
                }
              />
            </label>
            <label className="text-xs">
              Status
              <select
                aria-label={`Status ${stage.name}`}
                className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2"
                value={stage.status}
                onChange={(e) => {
                  const status = e.target.value;
                  if (status !== "Belum mulai" && status !== "Berjalan" && status !== "Selesai")
                    return;
                  onChange({
                    ...project,
                    timeline: project.timeline.map((s) =>
                      s.id === stage.id ? { ...s, status } : s,
                    ),
                  });
                }}
              >
                <option>Belum mulai</option>
                <option>Berjalan</option>
                <option>Selesai</option>
              </select>
            </label>
          </li>
        ))}
      </ol>
    </section>
  );
}
export function ScenarioEditor({ project, onChange }: EditorProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold">Skenario investasi</h2>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        Harga jual, durasi holding, dan pengali RAB berbeda per skenario. Akuisisi serta tarif lain
        mengikuti analisis. Perbandingan bukan jaminan laba.
      </p>
      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        {project.scenarios.map((scenario, index) => {
          const result = calculateFlipping(
            { ...project.finance, sale: scenario.sale, months: scenario.months },
            project.rab,
            scenario.renovationFactor,
          );
          const change = (fields: Partial<typeof scenario>) =>
            onChange({
              ...project,
              scenarios: project.scenarios.map((s, i) => (i === index ? { ...s, ...fields } : s)),
            });
          return (
            <article key={scenario.name} className="min-w-0 rounded-md border border-border p-4">
              <h3 className="mb-5 font-semibold">{scenario.name}</h3>
              <div className="space-y-4">
                <NumberField
                  label={`Harga jual ${scenario.name}`}
                  value={scenario.sale}
                  onChange={(sale) => change({ sale })}
                />
                <NumberField
                  label={`Durasi ${scenario.name}`}
                  unit="bulan"
                  value={scenario.months}
                  onChange={(months) => change({ months })}
                />
                <NumberField
                  label={`Renovasi ${scenario.name}`}
                  unit="× RAB"
                  value={scenario.renovationFactor}
                  onChange={(renovationFactor) => change({ renovationFactor })}
                />
              </div>
              <dl className="mt-5 space-y-2 border-t border-border pt-4 text-xs">
                <div>
                  <dt>Total all-in</dt>
                  <dd className="mt-1 font-semibold">{formatRupiah(result.allIn)}</dd>
                </div>
                <div>
                  <dt>Laba / rugi bersih</dt>
                  <dd
                    className={
                      result.profit >= 0
                        ? "mt-1 font-semibold text-brand-deep"
                        : "mt-1 font-semibold text-destructive"
                    }
                  >
                    {formatRupiah(result.profit)}
                  </dd>
                </div>
                <div>
                  <dt>ROI</dt>
                  <dd>
                    {result.roi?.toLocaleString("id-ID", { maximumFractionDigits: 2 }) ?? "—"}%
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
