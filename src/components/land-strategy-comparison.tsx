import { useId, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Layers,
  Pencil,
  Ruler,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/formatted-number-input";
import type { LandInputMode, LandSize } from "@/lib/land-settings";
import type { NewBuildAssumptions, StrategyResult } from "@/lib/land-strategy";
import { cn } from "@/lib/utils";
import { strategySectionId, type LandAnalysis, type RuleKey } from "@/hooks/use-land-analysis";

type Unit = "Rp" | "m²" | "m" | "%" | "lantai" | "bulan";
type FieldDef<K extends string> = { key: K; label: string; unit: Unit };

const ruleFields: FieldDef<RuleKey>[] = [
  { key: "minLotArea", label: "Luas kavling minimum", unit: "m²" },
  { key: "minFrontage", label: "Lebar muka minimum per kavling", unit: "m" },
  { key: "kdbPercent", label: "KDB", unit: "%" },
  { key: "maxFloors", label: "Jumlah lantai maksimal", unit: "lantai" },
];

const buildFields: FieldDef<keyof NewBuildAssumptions>[] = [
  { key: "salePerUnit", label: "Harga jual per rumah baru (dari pembanding)", unit: "Rp" },
  { key: "targetBuildingArea", label: "Luas bangunan per rumah", unit: "m²" },
  { key: "buildCostPerM2", label: "Biaya bangun per m²", unit: "Rp" },
  { key: "demolition", label: "Bongkar rumah lama", unit: "Rp" },
  { key: "sharedSiteWorks", label: "Pagar, saluran, akses jalan", unit: "Rp" },
  { key: "permitsPerUnit", label: "Pecah sertifikat + PBG per rumah", unit: "Rp" },
  { key: "monthlyHolding", label: "Biaya kepemilikan per bulan", unit: "Rp" },
  { key: "sellingRatePercent", label: "Pajak penjual + komisi", unit: "%" },
  { key: "months", label: "Lama proyek pecah kavling", unit: "bulan" },
];

const juta = (value: number) =>
  `${value < 0 ? "−" : ""}Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(Math.abs(value) / 1_000_000)} jt`;

const angka = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);

/* ------------------------------------------------------------- controls */

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
}: {
  id: string;
  label: string;
  unit: Unit;
  value: number;
  onChange: (value: number) => void;
}) {
  const prefix = unit === "Rp";
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block min-h-8 text-xs font-medium leading-4">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            Rp
          </span>
        )}
        <FormattedNumberInput
          id={id}
          autoComplete="off"
          className={cn("tabular-nums", prefix ? "pl-10" : "pr-14")}
          value={value}
          onValueChange={onChange}
        />
        {!prefix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- ukuran tanah */

export function LandSizeSection({ land }: { land: LandAnalysis }) {
  const baseId = useId();
  const [rulesOpen, setRulesOpen] = useState(false);
  const { size, setSize, rules, settings, comparison } = land;
  const setMode = (mode: LandInputMode) => setSize((current) => ({ ...current, mode }));
  const update = (key: keyof Omit<LandSize, "mode">, value: number) =>
    setSize((current) => ({ ...current, [key]: value }));
  const customized = Object.keys(land.ruleOverrides).length > 0;
  const capacity = comparison?.capacity;

  return (
    <section className="border-t border-border py-7" aria-labelledby={`${baseId}-title`}>
      <h2 id={`${baseId}-title`} className="flex items-center gap-2 text-base font-semibold">
        <Ruler className="size-5 text-brand" />
        Ukuran tanah
      </h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Platform menghitung apakah tanah ini bisa dipecah menjadi lebih dari satu rumah. Lebar
        adalah sisi yang menghadap jalan.
      </p>

      <div className="mt-4 inline-flex rounded-md border border-border p-1" role="group">
        {(
          [
            ["dimensions", "Panjang × lebar"],
            ["area", "Luas saja"],
          ] as const
        ).map(([mode, label]) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={size.mode === mode ? "brand" : "ghost"}
            aria-pressed={size.mode === mode}
            onClick={() => setMode(mode)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-3">
        {size.mode === "dimensions" ? (
          <>
            <NumberField
              id={`${baseId}-width`}
              label="Lebar muka (menghadap jalan)"
              unit="m"
              value={size.width}
              onChange={(value) => update("width", value)}
            />
            <NumberField
              id={`${baseId}-length`}
              label="Panjang (ke belakang)"
              unit="m"
              value={size.length}
              onChange={(value) => update("length", value)}
            />
            <div className="flex flex-col justify-end">
              <p className="mb-1.5 min-h-8 text-xs font-medium leading-4">Luas tanah</p>
              <p className="flex h-10 items-center rounded-md bg-muted px-3 text-sm font-semibold tabular-nums">
                {rules.landArea > 0 ? `${angka(rules.landArea)} m²` : "–"}
              </p>
            </div>
          </>
        ) : (
          <>
            <NumberField
              id={`${baseId}-area`}
              label="Luas tanah (sertifikat)"
              unit="m²"
              value={size.area}
              onChange={(value) => update("area", value)}
            />
            <NumberField
              id={`${baseId}-frontage`}
              label="Lebar muka, bila tahu"
              unit="m"
              value={size.frontage}
              onChange={(value) => update("frontage", value)}
            />
          </>
        )}
      </div>

      {capacity && (
        <div className="mt-5 rounded-md border border-border p-4">
          <p className="text-sm">
            {capacity.maxUnits >= 2 ? (
              <>
                Tanah {angka(rules.landArea)} m² muat <strong>{capacity.maxUnits} kavling</strong>{" "}
                (±{angka(rules.landArea / capacity.maxUnits)} m² per rumah).
              </>
            ) : (
              <>Tanah {angka(rules.landArea)} m² cocok untuk satu rumah.</>
            )}
          </p>
          {capacity.warnings.length > 0 && (
            <ul className="mt-2 space-y-1">
              {capacity.warnings.map((warning) => (
                <li
                  key={warning}
                  className="flex gap-2 text-[11px] leading-5 text-muted-foreground"
                >
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                  {warning}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        {customized ? "Aturan disesuaikan untuk aset ini" : "Standar platform"}: kavling minimum{" "}
        {angka(rules.minLotArea)} m², lebar muka minimum {angka(rules.minFrontage)} m, KDB{" "}
        {angka(rules.kdbPercent)}%, maksimal {rules.maxFloors} lantai.
        {land.settingsSource === "default" && " (standar bawaan)"}{" "}
        <button
          type="button"
          className="font-medium text-brand underline-offset-2 hover:underline"
          aria-expanded={rulesOpen}
          aria-controls={`${baseId}-rules`}
          onClick={() => setRulesOpen((open) => !open)}
        >
          {rulesOpen ? "Tutup" : "Sesuaikan dengan KRK setempat"}
          {rulesOpen ? (
            <ChevronUp className="ml-0.5 inline size-3" />
          ) : (
            <ChevronDown className="ml-0.5 inline size-3" />
          )}
        </button>
      </p>
      {rulesOpen && (
        <div id={`${baseId}-rules`} className="mt-4">
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
            {ruleFields.map((field) => (
              <NumberField
                key={field.key}
                id={`${baseId}-${field.key}`}
                label={field.label}
                unit={field.unit}
                value={rules[field.key]}
                onChange={(value) => land.setRule(field.key, value)}
              />
            ))}
          </div>
          {customized && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={land.resetRules}
            >
              Kembalikan ke standar platform ({angka(settings.minLotArea)} m² /{" "}
              {angka(settings.minFrontage)} m)
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- tawaran */

export function LandSplitOffer({ land }: { land: LandAnalysis }) {
  const { offer } = land;
  if (offer.tier === "none") return null;
  const recommended = offer.tier === "recommended";
  return (
    <aside
      className={cn(
        "mt-5 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between",
        recommended ? "border-brand bg-brand-soft" : "border-border bg-muted/40",
      )}
      aria-label="Potensi pecah kavling"
    >
      <div className="flex gap-3">
        <Sparkles
          className={cn(
            "mt-0.5 size-5 shrink-0",
            recommended ? "text-brand" : "text-muted-foreground",
          )}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold">
            {recommended
              ? `Tanah ini berpotensi jadi ${offer.best.units} rumah`
              : `Tanah ini muat ${offer.maxUnits} kavling`}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {recommended
              ? `Estimasi laba ${juta(offer.best.profit)} dengan ${offer.best.title.toLowerCase()}, dibanding ${juta(offer.renovation.profit)} bila direnovasi. Proyeknya lebih lama (${offer.best.months} vs ${offer.renovation.months} bulan).`
              : `Dengan asumsi saat ini renovasi lebih menguntungkan (${juta(offer.renovation.profit)} vs ${juta(offer.best.profit)}).`}
          </p>
        </div>
      </div>
      <Button asChild size="sm" variant={recommended ? "brand" : "outline"} className="shrink-0">
        <a href={`#${strategySectionId}`}>
          Lihat perbandingan <ArrowDown className="size-4" />
        </a>
      </Button>
    </aside>
  );
}

/* ----------------------------------------------------------- perbandingan */

function StrategyCard({
  strategy,
  highestProfit,
  highestAnnualRoi,
  auctionLimit,
}: {
  strategy: StrategyResult;
  highestProfit: boolean;
  highestAnnualRoi: boolean;
  auctionLimit: number;
}) {
  const loss = strategy.profit < 0;
  const belowLimit = strategy.bidLimit < auctionLimit;
  return (
    <article
      className={cn(
        "flex flex-col rounded-lg border p-4",
        highestProfit || highestAnnualRoi ? "border-brand bg-brand-soft/40" : "border-border",
      )}
      aria-labelledby={`strategi-${strategy.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={`strategi-${strategy.id}`} className="text-sm font-semibold">
          {strategy.title}
        </h3>
        <div className="flex flex-wrap gap-1">
          {highestProfit && (
            <span className="rounded-full bg-brand-deep px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              Laba tertinggi
            </span>
          )}
          {highestAnnualRoi && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              ROI/tahun tertinggi
            </span>
          )}
        </div>
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-semibold tabular-nums",
          loss ? "text-destructive" : "text-brand-deep",
        )}
      >
        {juta(strategy.profit)}
      </p>
      <p className="text-[11px] text-muted-foreground">Estimasi laba</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <dt className="text-muted-foreground">ROI per tahun</dt>
        <dd className="text-right font-medium tabular-nums">
          {strategy.annualRoi === null ? "–" : `${Math.round(strategy.annualRoi)}%`}
        </dd>
        <dt className="text-muted-foreground">Lama proyek</dt>
        <dd className="text-right font-medium tabular-nums">{strategy.months} bulan</dd>
        <dt className="text-muted-foreground">Pendapatan</dt>
        <dd className="text-right font-medium tabular-nums">{juta(strategy.revenue)}</dd>
        <dt className="text-muted-foreground">Modal total</dt>
        <dd className="text-right font-medium tabular-nums">{juta(strategy.totalCost)}</dd>
        <dt className="text-muted-foreground">Batas tawar</dt>
        <dd
          className={cn("text-right font-semibold tabular-nums", belowLimit && "text-destructive")}
        >
          {juta(strategy.bidLimit)}
        </dd>
      </dl>
      {strategy.detail && (
        <p className="mt-3 border-t border-border pt-3 text-[11px] leading-5 text-muted-foreground">
          Kavling ±{Math.round(strategy.detail.lotArea)} m², bangunan{" "}
          {Math.round(strategy.detail.buildingArea)} m² per rumah
          {strategy.detail.buildingCapped &&
            ` (dibatasi KDB dan jumlah lantai, maks. ${Math.floor(strategy.detail.maxBuildingArea)} m²)`}
          .
        </p>
      )}
      {belowLimit && (
        <p className="mt-2 text-[11px] leading-5 text-destructive">
          Batas tawar di bawah nilai limit lelang.
        </p>
      )}
    </article>
  );
}

export function LandStrategyComparison({
  land,
  auctionLimit,
}: {
  land: LandAnalysis;
  auctionLimit: number;
}) {
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const { comparison, offer, build } = land;
  if (!comparison || offer.tier === "none") return null;

  return (
    <section
      id={strategySectionId}
      className="scroll-mt-24 border-t border-border py-7"
      aria-labelledby={`${baseId}-title`}
    >
      <h2 id={`${baseId}-title`} className="flex items-center gap-2 text-base font-semibold">
        <Layers className="size-5 text-brand" />
        Bandingkan strategi: renovasi atau pecah kavling
      </h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Membongkar dan membangun beberapa rumah baru bisa lebih menguntungkan, tetapi modalnya lebih
        besar dan proyeknya lebih lama.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {comparison.strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            auctionLimit={auctionLimit}
            highestProfit={comparison.highestProfitId === strategy.id}
            highestAnnualRoi={comparison.highestAnnualRoiId === strategy.id}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        Renovasi memakai asumsi perhitungan di atas. Pecah kavling memakai harga menang dan biaya
        pembelian yang sama, ditambah biaya bangun baru di bawah. Pecah sertifikat dan PBG per rumah
        harus selesai sebelum pembeli bisa memakai KPR.
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-4 h-10"
        aria-expanded={open}
        aria-controls={`${baseId}-form`}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <>
            <ChevronUp className="size-4" aria-hidden="true" /> Tutup asumsi bangun baru
          </>
        ) : (
          <>
            <Pencil className="size-4" aria-hidden="true" /> Ubah asumsi bangun baru
          </>
        )}
      </Button>
      {open && (
        <div id={`${baseId}-form`} className="mt-5">
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {buildFields.map((field) => (
              <NumberField
                key={field.key}
                id={`${baseId}-${field.key}`}
                label={field.label}
                unit={field.unit}
                value={build[field.key]}
                onChange={(value) => land.setBuild(field.key, value)}
              />
            ))}
            <NumberField
              id={`${baseId}-renovationMonths`}
              label="Lama proyek renovasi (pembanding)"
              unit="bulan"
              value={land.renovationMonths}
              onChange={land.setRenovationMonths}
            />
          </div>
          <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
            Angka bawaan adalah contoh, bukan harga pasar. Biaya bangun per m², harga jual rumah
            baru, dan biaya perizinan sebaiknya diisi dari penawaran kontraktor, pembanding
            setempat, dan notaris/PPAT.
          </p>
        </div>
      )}
    </section>
  );
}
