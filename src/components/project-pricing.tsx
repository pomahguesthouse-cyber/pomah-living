import { ArrowUpRight, Plus, Tag, Trash2, TriangleAlert } from "lucide-react";
import { DateInput } from "@/components/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/formatted-number-input";
import { cibinongComparables } from "@/lib/cibinong-comparables";
import type { FlippingProject } from "@/lib/flipping";
import {
  comparableConditions,
  defaultPricing,
  emptyComparable,
  followingScenarioSales,
  priceRange,
  withTargetSale,
  type Comparable,
  type ComparableCondition,
  type Pricing,
} from "@/lib/pricing";
import { analyzeScenario, baseScenarioIndex } from "@/lib/scenarios";
import { calculateMortgage, defaultMortgage, formatRupiah } from "@/lib/simulation";
import { formatTanggal } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type Props = {
  project: FlippingProject;
  demo: boolean;
  onChange: (project: FlippingProject) => void;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cmp-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

const juta = (value: number) =>
  `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value / 1_000_000)} jt`;

export function ProjectPricing({ project, demo, onChange }: Props) {
  const pricing = project.pricing ?? defaultPricing;
  const asset = { land: project.property.land, building: project.property.building };
  const { estimates, range } = priceRange(asset, pricing);
  const target = project.finance.sale;
  const base = analyzeScenario(project, baseScenarioIndex);
  const mortgage = target > 0 ? calculateMortgage(target) : null;
  const following = followingScenarioSales(target);
  const canUseCibinong =
    demo &&
    pricing.comparables.length === 0 &&
    project.property.address.toLowerCase().includes("cibinong");

  const setPricing = (next: Pricing) => onChange({ ...project, pricing: next });
  const setComparable = (id: string, patch: Partial<Comparable>) =>
    setPricing({
      ...pricing,
      comparables: pricing.comparables.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  const setTarget = (sale: number) => onChange(withTargetSale(project, Math.max(0, sale)));

  // Posisi penanda target di garis rentang (0–100%).
  const span = range ? Math.max(range.high - range.low, 1) : 1;
  const scaleLow = range ? range.low - span * 0.5 : 0;
  const scaleHigh = range ? range.high + span * 0.5 : 1;
  const position = (value: number) =>
    Math.min(100, Math.max(0, ((value - scaleLow) / (scaleHigh - scaleLow)) * 100));

  return (
    <section aria-labelledby="pricing-title" className="space-y-6">
      <div>
        <h2 id="pricing-title" className="flex items-center gap-2 text-lg font-semibold">
          <Tag className="size-5 text-brand" aria-hidden="true" /> Penetapan harga jual
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Harga jual ditetapkan sebelum menawar, karena batas tawar dihitung darinya. Isi rumah
          pembanding yang sudah siap huni di sekitar aset ({asset.land || "–"} m² tanah,{" "}
          {asset.building || "–"} m² bangunan); platform menyesuaikannya ke luas aset.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-semibold">
            Rumah pembanding ({pricing.comparables.length}/12)
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="negotiation" className="mb-1 block text-[11px] text-muted-foreground">
                Diskon iklan → transaksi
              </label>
              <div className="relative w-28">
                <FormattedNumberInput
                  id="negotiation"
                  className="pr-8"
                  value={pricing.negotiationPercent}
                  onValueChange={(value) =>
                    setPricing({ ...pricing, negotiationPercent: Math.min(50, value) })
                  }
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>
            {canUseCibinong && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPricing({
                    ...pricing,
                    comparables: cibinongComparables.map((item) => ({
                      id: newId(),
                      source: `${item.source} · ${item.area}`,
                      url: item.url,
                      landArea: item.landArea,
                      buildingArea: item.buildingArea,
                      condition: item.condition.startsWith("Baru") ? "Baru" : "Siap huni",
                      askingPrice: item.askingPrice,
                      date: "",
                    })),
                  })
                }
              >
                Pakai 3 pembanding contoh Cibinong
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pricing.comparables.length >= 12}
              onClick={() =>
                setPricing({
                  ...pricing,
                  comparables: [...pricing.comparables, emptyComparable(newId())],
                })
              }
            >
              <Plus className="size-4" /> Tambah pembanding
            </Button>
          </div>
        </div>

        {pricing.comparables.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
            Belum ada pembanding. Tambahkan minimal 3 rumah serupa yang sedang dijual atau baru
            terjual di sekitar lokasi, misalnya dari situs iklan properti atau agen setempat.
          </p>
        )}

        <ul className="space-y-3">
          {pricing.comparables.map((item, index) => {
            const estimate = estimates.find((entry) => entry.id === item.id);
            return (
              <li key={item.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">Pembanding {index + 1}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    aria-label={`Hapus pembanding ${index + 1}`}
                    onClick={() =>
                      setPricing({
                        ...pricing,
                        comparables: pricing.comparables.filter((entry) => entry.id !== item.id),
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Sumber / lokasi" id={`${item.id}-source`} wide>
                    <Input
                      id={`${item.id}-source`}
                      value={item.source}
                      maxLength={200}
                      placeholder="Rumah123 · Perum Griya Asri"
                      onChange={(event) => setComparable(item.id, { source: event.target.value })}
                    />
                  </Field>
                  <Field label="Tautan iklan (opsional)" id={`${item.id}-url`} wide>
                    <Input
                      id={`${item.id}-url`}
                      value={item.url}
                      maxLength={500}
                      inputMode="url"
                      placeholder="https://"
                      onChange={(event) => setComparable(item.id, { url: event.target.value })}
                    />
                  </Field>
                  <Field label="Luas tanah (m²)" id={`${item.id}-land`}>
                    <FormattedNumberInput
                      id={`${item.id}-land`}
                      value={item.landArea}
                      onValueChange={(landArea) => setComparable(item.id, { landArea })}
                    />
                  </Field>
                  <Field label="Luas bangunan (m²)" id={`${item.id}-building`}>
                    <FormattedNumberInput
                      id={`${item.id}-building`}
                      value={item.buildingArea}
                      onValueChange={(buildingArea) => setComparable(item.id, { buildingArea })}
                    />
                  </Field>
                  <Field label="Kondisi" id={`${item.id}-condition`}>
                    <select
                      id={`${item.id}-condition`}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={item.condition}
                      onChange={(event) =>
                        setComparable(item.id, {
                          condition: event.target.value as ComparableCondition,
                        })
                      }
                    >
                      {comparableConditions.map((condition) => (
                        <option key={condition}>{condition}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Harga iklan" id={`${item.id}-price`}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp
                      </span>
                      <FormattedNumberInput
                        id={`${item.id}-price`}
                        className="pl-10"
                        value={item.askingPrice}
                        onValueChange={(askingPrice) => setComparable(item.id, { askingPrice })}
                      />
                    </div>
                  </Field>
                  <Field label="Tanggal dilihat" id={`${item.id}-date`}>
                    <DateInput
                      id={`${item.id}-date`}
                      value={item.date}
                      onChange={(date) => setComparable(item.id, { date })}
                    />
                  </Field>
                </div>
                {estimate && (
                  <p
                    className={cn(
                      "mt-3 border-t border-border pt-3 text-xs leading-5",
                      estimate.strong ? "text-muted-foreground" : "text-warning",
                    )}
                  >
                    Perkiraan untuk aset: <strong>{formatRupiah(estimate.estimate)}</strong>
                    {estimate.pricePerBuildingM2 !== null &&
                      ` · ${juta(estimate.pricePerBuildingM2)}/m² bangunan`}
                    {estimate.pricePerLandM2 !== null &&
                      ` · ${juta(estimate.pricePerLandM2)}/m² tanah`}
                    {!estimate.strong && ` · pembanding lemah: ${estimate.reasons.join(", ")}`}
                    {item.date && ` · dilihat ${formatTanggal(item.date)}`}
                    {/^https:\/\//.test(item.url) && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-0.5 text-brand underline"
                      >
                        Buka iklan <ArrowUpRight className="size-3" />
                      </a>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Rentang harga wajar</h3>
          {range ? (
            <>
              <div className="relative mt-8 h-2 rounded-full bg-muted" aria-hidden="true">
                <div
                  className="absolute h-2 rounded-full bg-brand/40"
                  style={{
                    left: `${position(range.low)}%`,
                    width: `${position(range.high) - position(range.low)}%`,
                  }}
                />
                {target > 0 && (
                  <div
                    className="absolute -top-6 -translate-x-1/2 text-[10px] font-semibold text-brand-deep"
                    style={{ left: `${position(target)}%` }}
                  >
                    Target
                    <div className="mx-auto mt-0.5 h-5 w-0.5 bg-brand-deep" />
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(
                  [
                    ["Batas bawah", range.low],
                    ["Tengah", range.mid],
                    ["Batas atas", range.high],
                  ] as const
                ).map(([label, value]) => (
                  <Button
                    key={label}
                    type="button"
                    variant={target === value ? "brand" : "outline"}
                    className="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left"
                    aria-pressed={target === value}
                    onClick={() => setTarget(value)}
                  >
                    <span className="text-[10px] font-normal opacity-80">{label}</span>
                    <span className="text-xs font-semibold tabular-nums sm:text-sm">
                      {juta(value)}
                    </span>
                  </Button>
                ))}
              </div>
              <p
                className={cn(
                  "mt-3 text-[11px] leading-5",
                  range.weak ? "text-warning" : "text-muted-foreground",
                )}
              >
                {range.weak
                  ? `Baru ${range.strongCount} pembanding kuat (minimal 3); rentang memakai semua ${range.used} pembanding dan belum andal.`
                  : `Dari ${range.used} pembanding kuat, setelah diskon ${pricing.negotiationPercent}% dan penyesuaian luas.`}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Rentang muncul setelah pembanding dengan harga diisi.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-brand/40 bg-brand-soft/30 p-5">
          <label htmlFor="target-sale" className="text-sm font-semibold">
            Target harga jual
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              Rp
            </span>
            <FormattedNumberInput
              id="target-sale"
              className="h-11 pl-10 text-base font-semibold"
              value={target}
              onValueChange={setTarget}
            />
          </div>
          <dl className="mt-4 space-y-2 text-xs">
            <Row label="Estimasi laba (skenario Moderat)">
              <span className={base.result.profit < 0 ? "text-destructive" : "text-brand-deep"}>
                {formatRupiah(base.result.profit)}
              </span>
            </Row>
            <Row label="Harga jual minimal agar tidak rugi">
              {base.minSale === null ? "–" : formatRupiah(Math.round(base.minSale))}
            </Row>
            <Row label="Skenario Pesimis / Optimis">
              {juta(project.scenarios[0]?.sale ?? following.pessimistic)} /{" "}
              {juta(project.scenarios[2]?.sale ?? following.optimistic)}
            </Row>
            {mortgage && (
              <>
                <Row label="Cicilan KPR BTN pembeli">
                  {formatRupiah(mortgage.monthlyPayment)}/bulan
                </Row>
                <Row label="Perkiraan penghasilan pembeli">
                  ≥ {formatRupiah(mortgage.minimumIncome)}/bulan
                </Row>
              </>
            )}
          </dl>
          {mortgage && (
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
              Uang muka {Math.round(defaultMortgage.downPaymentRate * 100)}%, tenor{" "}
              {defaultMortgage.years} tahun, bunga{" "}
              {defaultMortgage.annualRatePercent.toLocaleString("id-ID")}% per tahun, cicilan ≤ 30%
              penghasilan. Ilustrasi, bukan penawaran KPR.
            </p>
          )}
          {range && target > range.high && (
            <Warning>Target di atas batas atas pembanding; siapkan alasan nilai tambah.</Warning>
          )}
          {base.minSale !== null && target > 0 && target < base.minSale && (
            <Warning>Target di bawah harga minimal agar tidak rugi.</Warning>
          )}
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            Target ini adalah skenario Moderat. Harga Pesimis dan Optimis ikut ±10% selama belum
            Anda ubah di tab Skenario & laba.
          </p>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  id,
  wide,
  children,
}: {
  label: string;
  id: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1 block text-[11px] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 flex gap-2 rounded-md bg-warning-soft p-2 text-[11px] leading-5 text-warning">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
