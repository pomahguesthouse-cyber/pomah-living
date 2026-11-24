import { useId, useState } from "react";
import { AlertTriangle, ChevronUp, Layers, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  compareStrategies,
  defaultLandRules,
  defaultNewBuild,
  defaultRenovationMonths,
  type LandRules,
  type NewBuildAssumptions,
  type StrategyResult,
} from "@/lib/land-strategy";
import { formatInput, type SimulationValues } from "@/lib/simulation";
import { cn } from "@/lib/utils";

type FieldDef<K extends string> = {
  key: K;
  label: string;
  unit: "Rp" | "m²" | "m" | "%" | "lantai" | "bulan";
};

const landFields: FieldDef<keyof LandRules>[] = [
  { key: "landArea", label: "Luas tanah (sertifikat)", unit: "m²" },
  { key: "frontage", label: "Lebar muka ke jalan (0 = belum tahu)", unit: "m" },
  { key: "minLotArea", label: "Luas kavling minimum (KRK/RDTR)", unit: "m²" },
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

function parseNumber(raw: string) {
  const cleaned = raw.replace(/\./g, "").replace(",", ".").trim();
  const value = Number(cleaned);
  return cleaned === "" || !Number.isFinite(value) || value < 0 ? 0 : value;
}

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
}: {
  id: string;
  label: string;
  unit: FieldDef<string>["unit"];
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
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={cn("tabular-nums", prefix ? "pl-10" : "pr-14")}
          value={value === 0 ? "" : prefix ? formatInput(value) : String(value)}
          placeholder="0"
          onChange={(event) => onChange(parseNumber(event.target.value))}
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

const juta = (value: number) =>
  `${value < 0 ? "−" : ""}Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(Math.abs(value) / 1_000_000)} jt`;

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
  values,
  auctionLimit,
  initialLandArea,
}: {
  values: SimulationValues | null;
  auctionLimit: number;
  initialLandArea: number | null;
}) {
  const baseId = useId();
  const [rules, setRules] = useState<LandRules>({
    landArea: initialLandArea ?? 0,
    frontage: 0,
    ...defaultLandRules,
  });
  const [build, setBuild] = useState<NewBuildAssumptions>(() => ({
    ...defaultNewBuild,
    salePerUnit: values ? Math.round((values.salePrice * 0.8) / 5_000_000) * 5_000_000 : 0,
  }));
  const [renovationMonths, setRenovationMonths] = useState(defaultRenovationMonths);
  const [open, setOpen] = useState(rules.landArea === 0);
  const needsLand = rules.landArea <= 0;
  const showForm = open || needsLand;
  const comparison = values ? compareStrategies(values, rules, build, renovationMonths) : null;

  return (
    <section className="border-t border-border py-7" aria-labelledby={`${baseId}-title`}>
      <h2 id={`${baseId}-title`} className="flex items-center gap-2 text-base font-semibold">
        <Layers className="size-5 text-brand" />
        Bandingkan strategi: renovasi atau pecah kavling
      </h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Bila tanahnya cukup luas, membongkar dan membangun beberapa rumah baru bisa lebih
        menguntungkan, tetapi modalnya lebih besar dan proyeknya lebih lama. Aturan kavling, KDB,
        dan jumlah lantai berbeda di tiap daerah; ambil angkanya dari KRK/RDTR setempat.
      </p>

      {comparison && !needsLand && (
        <>
          <p className="mt-4 text-sm">
            Tanah {formatInput(rules.landArea)} m² muat{" "}
            <strong>{comparison.capacity.maxUnits} kavling</strong> sesuai aturan yang diisi.
          </p>
          {comparison.capacity.warnings.length > 0 && (
            <ul className="mt-2 space-y-1">
              {comparison.capacity.warnings.map((warning) => (
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
            Renovasi memakai asumsi perhitungan di atas. Pecah kavling memakai harga menang dan
            biaya pembelian yang sama, ditambah biaya bangun baru di bawah. Pecah sertifikat dan PBG
            per rumah harus selesai sebelum pembeli bisa memakai KPR.
          </p>
        </>
      )}
      {!values && (
        <p className="mt-4 text-xs text-destructive">
          Perbaiki asumsi perhitungan di atas untuk melihat perbandingan.
        </p>
      )}

      {!needsLand && (
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-10"
          aria-expanded={showForm}
          aria-controls={`${baseId}-form`}
          onClick={() => setOpen((value) => !value)}
        >
          {showForm ? (
            <>
              <ChevronUp className="size-4" aria-hidden="true" /> Tutup asumsi tanah
            </>
          ) : (
            <>
              <Pencil className="size-4" aria-hidden="true" /> Ubah asumsi tanah & bangun baru
            </>
          )}
        </Button>
      )}

      {showForm && (
        <div id={`${baseId}-form`} className="mt-5 space-y-6">
          {needsLand && (
            <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
              Isi luas tanah untuk menghitung berapa rumah yang muat.
            </p>
          )}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider text-brand">
              Tanah dan aturan setempat
            </legend>
            <div className="mt-3 grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {landFields.map((field) => (
                <NumberField
                  key={field.key}
                  id={`${baseId}-${field.key}`}
                  label={field.label}
                  unit={field.unit}
                  value={rules[field.key]}
                  onChange={(value) => setRules((current) => ({ ...current, [field.key]: value }))}
                />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider text-brand">
              Asumsi bangun baru
            </legend>
            <div className="mt-3 grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {buildFields.map((field) => (
                <NumberField
                  key={field.key}
                  id={`${baseId}-${field.key}`}
                  label={field.label}
                  unit={field.unit}
                  value={build[field.key]}
                  onChange={(value) => setBuild((current) => ({ ...current, [field.key]: value }))}
                />
              ))}
              <NumberField
                id={`${baseId}-renovationMonths`}
                label="Lama proyek renovasi (pembanding)"
                unit="bulan"
                value={renovationMonths}
                onChange={setRenovationMonths}
              />
            </div>
          </fieldset>
          <p className="text-[11px] leading-5 text-muted-foreground">
            Semua angka bawaan adalah contoh, bukan harga pasar. Biaya bangun per m², harga jual
            rumah baru, dan biaya perizinan sebaiknya diisi dari penawaran kontraktor, pembanding
            setempat, dan notaris/PPAT.
          </p>
        </div>
      )}
    </section>
  );
}
