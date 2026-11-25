import { CircleAlert, CheckCircle2 } from "lucide-react";
import { DateInput } from "@/components/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RabSpreadsheet } from "@/components/rab-spreadsheet";
import { FormattedNumberInput } from "@/components/formatted-number-input";
import { financeFields, rabTotal, type FlippingProject } from "@/lib/flipping";
import { analyzeScenario, baseScenarioIndex } from "@/lib/scenarios";
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
  const maximum =
    unit === "%" ? 100 : unit === "bulan" ? 120 : unit === "× RAB" ? 10 : 1_000_000_000_000;
  return (
    <label className="block min-w-0 space-y-2 text-xs font-medium">
      <span className="block leading-5">
        {label} <span className="text-muted-foreground">({unit})</span>
      </span>
      <FormattedNumberInput
        value={value}
        maximum={maximum}
        required
        aria-label={label}
        onValueChange={onChange}
      />
      <span className="print-value">
        {unit === "Rp" ? formatRupiah(value) : value.toLocaleString("id-ID")}
      </span>
    </label>
  );
}
const financeGroups = ["Akuisisi", "Holding", "Penjualan & cadangan"] as const;
export function FinanceEditor({
  project,
  onChange,
  groups = financeGroups,
}: EditorProps & { groups?: readonly (typeof financeGroups)[number][] }) {
  const showsAcquisition = groups.includes("Akuisisi");
  return (
    <div className="space-y-8">
      <p className="text-sm leading-6 text-muted-foreground">
        Semua tarif adalah asumsi yang dapat diubah, bukan ketetapan pajak. BPHTB bergantung pada
        peraturan daerah, dasar pengenaan, NPOPTKP, ketentuan lelang, dan pihak yang wajib membayar.
        Konfirmasikan dengan pemerintah daerah dan PPAT.
      </p>
      {groups.map((group) => (
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
      {showsAcquisition && (
        <div className="flex flex-wrap justify-between gap-2 border-y border-border py-4">
          <span>Renovasi dari RAB (termasuk contingency)</span>
          <strong>{formatRupiah(rabTotal(project.rab))}</strong>
        </div>
      )}
      <p className="text-xs leading-6 text-muted-foreground">
        Renovasi hanya dihitung dari RAB. Cadangan di luar RAB bersifat tambahan dan tidak boleh
        mengulang contingency. Pokok pinjaman bukan biaya tambahan; hanya bunga sederhana prorata
        durasi yang ditambahkan. Pemasaran, utilitas, dan bunga tidak termasuk carrying cost
        bulanan.
      </p>
    </div>
  );
}
export function RabEditor(props: EditorProps) {
  return <RabSpreadsheet {...props} />;
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
              <DateInput
                className="mt-2"
                aria-label={`Tanggal ${stage.name}`}
                value={stage.date}
                onChange={(date) =>
                  onChange({
                    ...project,
                    timeline: project.timeline.map((s) => (s.id === stage.id ? { ...s, date } : s)),
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
const percentFormat = (value: number | null) =>
  value === null ? "—" : `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

function ResultRow({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | undefined;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="min-w-0 text-muted-foreground">
        {label}
        {hint && <span className="block text-[10px] leading-4">{hint}</span>}
      </dt>
      <dd
        className={`shrink-0 whitespace-nowrap text-right font-semibold tabular-nums ${tone === "bad" ? "text-destructive" : tone === "good" ? "text-brand-deep" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function ScenarioEditor({ project, onChange }: EditorProps) {
  const analyses = project.scenarios.map((_, index) => analyzeScenario(project, index));
  const base = analyses[baseScenarioIndex];
  return (
    <section>
      <h2 className="text-lg font-semibold">Skenario investasi</h2>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        Bandingkan kemungkinan terburuk, normal, dan terbaik. Skenario Moderat memakai angka dasar
        proyek (target harga jual dan lama proyek di tab Biaya jual dan Biaya perolehan). Hasil
        perhitungan bukan jaminan laba.
      </p>
      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        {project.scenarios.map((scenario, index) => {
          const analysis = analyses[index]!;
          const { result } = analysis;
          const isBase = index === baseScenarioIndex;
          const loss = result.profit < 0;
          const change = (fields: Partial<typeof scenario>) =>
            onChange({
              ...project,
              scenarios: project.scenarios.map((s, i) => (i === index ? { ...s, ...fields } : s)),
            });
          const diff = base && !isBase ? result.profit - base.result.profit : null;
          return (
            <article
              key={scenario.name}
              className={`min-w-0 rounded-md border p-4 ${isBase ? "border-brand" : "border-border"}`}
              data-testid={`scenario-${index}`}
            >
              <div className="mb-5 flex items-center justify-between gap-2">
                <h3 className="font-semibold">{scenario.name}</h3>
                {isBase && (
                  <span className="rounded bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-deep">
                    Angka dasar
                  </span>
                )}
              </div>
              {isBase ? (
                <dl className="space-y-3 text-sm">
                  <ResultRow label="Harga jual" value={formatRupiah(analysis.inputs.sale)} />
                  <ResultRow label="Lama proyek" value={`${analysis.inputs.months} bulan`} />
                  <ResultRow
                    label="Biaya renovasi"
                    value={formatRupiah(analysis.renovationCost)}
                    hint="100% dari RAB"
                  />
                </dl>
              ) : (
                <div className="space-y-4">
                  <NumberField
                    label="Harga jual"
                    value={scenario.sale}
                    onChange={(sale) => change({ sale })}
                  />
                  <NumberField
                    label="Lama proyek"
                    unit="bulan"
                    value={scenario.months}
                    onChange={(months) => change({ months })}
                  />
                  <div>
                    <NumberField
                      label="Biaya renovasi"
                      unit="% dari RAB"
                      value={Math.round(scenario.renovationFactor * 1000) / 10}
                      onChange={(percent) =>
                        change({ renovationFactor: Math.min(percent, 1000) / 100 })
                      }
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      = {formatRupiah(analysis.renovationCost)}
                    </p>
                  </div>
                </div>
              )}
              <dl className="mt-5 space-y-2 border-t border-border pt-4 text-xs">
                <ResultRow label="Total modal" value={formatRupiah(result.allIn)} />
                <ResultRow
                  label={loss ? "Rugi bersih" : "Laba bersih"}
                  value={formatRupiah(result.profit)}
                  tone={loss ? "bad" : "good"}
                  {...(diff !== null
                    ? {
                        hint: `${diff >= 0 ? "+" : "−"}${formatRupiah(Math.abs(diff))} dari Moderat`,
                      }
                    : {})}
                />
                <ResultRow
                  label="ROI"
                  value={percentFormat(result.roi)}
                  tone={result.roi !== null && result.roi < 0 ? "bad" : undefined}
                />
                <ResultRow
                  label="ROI per tahun"
                  value={percentFormat(analysis.annualRoi)}
                  tone={analysis.annualRoi !== null && analysis.annualRoi < 0 ? "bad" : undefined}
                  hint="disetahunkan sesuai lama proyek"
                />
                <ResultRow
                  label="Laba per bulan"
                  value={
                    analysis.profitPerMonth === null ? "—" : formatRupiah(analysis.profitPerMonth)
                  }
                  tone={
                    analysis.profitPerMonth !== null && analysis.profitPerMonth < 0
                      ? "bad"
                      : undefined
                  }
                />
                <ResultRow
                  label="Titik impas harga jual"
                  value={analysis.minSale === null ? "—" : formatRupiah(analysis.minSale)}
                  {...(analysis.safetyMargin !== null && !loss
                    ? { hint: `harga jual boleh turun ${percentFormat(analysis.safetyMargin)}` }
                    : {})}
                />
              </dl>
              {loss && (
                <div
                  className="mt-4 rounded-md bg-danger-soft p-3 text-xs leading-5 text-destructive"
                  data-testid={`scenario-advice-${index}`}
                >
                  <p className="font-semibold">Agar skenario ini tidak rugi:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    <li>
                      Harga beli maksimal <strong>{formatRupiah(analysis.maxPurchase)}</strong>
                      {analysis.maxPurchase < project.property.limit &&
                        " (di bawah nilai limit lelang, sulit dicapai)"}
                    </li>
                    {analysis.minSale !== null && (
                      <li>
                        atau harga jual minimal <strong>{formatRupiah(analysis.minSale)}</strong>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
