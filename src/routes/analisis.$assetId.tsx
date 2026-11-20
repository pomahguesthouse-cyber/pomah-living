import { useRef } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  MapPin,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConditionPhotoPilot } from "@/components/condition-photo-pilot";
import { NearbyAskingPrices } from "@/components/nearby-asking-prices";
import { SimulationResults } from "@/components/simulation-results";
import { getProperty } from "@/lib/properties";
import {
  baseScenario,
  checkItems,
  formatInput,
  formatRupiah,
  parseInputs,
  simulationFields,
  stressedScenario,
  validateAmount,
} from "@/lib/simulation";
import { useSimulationStore } from "@/stores/simulation-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analisis/$assetId")({
  loader: ({ params }) => {
    const property = getProperty(params.assetId);
    if (!property) throw notFound();
    return { property };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Analisis ${loaderData.property.name} — Pomah Living`
          : "Aset tidak tersedia — Pomah Living",
      },
      {
        name: "description",
        content: loaderData
          ? `Simulasi biaya renovasi, laba jual kembali, dan batas tawar ${loaderData.property.name} di ${loaderData.property.location}.`
          : "Aset simulasi tidak tersedia.",
      },
      {
        property: "og:title",
        content: loaderData
          ? `Analisis ${loaderData.property.name} — Pomah Living`
          : "Aset tidak tersedia — Pomah Living",
      },
      {
        property: "og:description",
        content:
          "Periksa kondisi aset dan hitung batas tawar berdasarkan harga jual, seluruh biaya proyek, dan target laba.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.property.image.startsWith("https://")
        ? [
            { property: "og:image", content: loaderData.property.image },
            { name: "twitter:image", content: loaderData.property.image },
          ]
        : []),
      ...(!loaderData ? [{ name: "robots", content: "noindex" }] : []),
    ],
  }),
  component: AnalyzeAsset,
  errorComponent: () => (
    <main className="page-container py-12">
      <h1 className="text-xl font-semibold">Analisis belum bisa dimuat</h1>
      <Button asChild className="mt-5">
        <Link to="/pilih-aset">Kembali ke aset</Link>
      </Button>
    </main>
  ),
  notFoundComponent: () => (
    <main className="page-container py-12">
      <h1 className="text-xl font-semibold">Aset tidak ditemukan</h1>
      <Button asChild className="mt-5">
        <Link to="/pilih-aset">Kembali ke aset</Link>
      </Button>
    </main>
  ),
});

function AnalyzeAsset() {
  const { property } = Route.useLoaderData();
  const simulation = useSimulationStore((state) => state.simulations[property.id]);
  const setField = useSimulationStore((state) => state.setField);
  const setCheck = useSimulationStore((state) => state.setCheck);
  const setScenario = useSimulationStore((state) => state.setScenario);
  const salePriceInput = useRef<HTMLInputElement>(null);
  const values = parseInputs(simulation.inputs);
  const verifiedCount = Object.values(simulation.verification).filter(Boolean).length;
  return (
    <main className="page-container reveal py-8 sm:py-10">
      <div className="mb-7 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-brand-deep">
          Beranda
        </Link>
        <ArrowRight className="size-3" />
        <Link to="/pilih-aset" className="hover:text-brand-deep">
          Pilih aset
        </Link>
        <ArrowRight className="size-3" />
        <span className="text-foreground">Analisis aset</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-brand">Analisis aset</p>
          <h1 className="section-title mt-2">{property.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {property.location}
            <span className="ml-3 flex items-center gap-1.5 border-l border-border pl-3">
              <FlaskConical className="size-3" />
              Data simulasi
            </span>
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/pilih-aset">
            <ArrowLeft />
            Ganti aset
          </Link>
        </Button>
      </div>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div>
          <div className="flex items-center gap-5 border-y border-border py-5">
            <img
              className="h-24 w-32 rounded-md object-cover sm:w-36"
              src={property.image}
              alt={`Ilustrasi ${property.name}`}
            />
            <div>
              <p className="text-xs text-muted-foreground">Nilai limit lelang</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatRupiah(property.auctionLimit)}
              </p>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                Harga minimum penawaran lelang
              </p>
            </div>
          </div>
          <section className="py-7" aria-labelledby="checklist-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="checklist-title" className="flex items-center gap-2 text-base font-semibold">
                <ClipboardCheck className="size-5 text-brand" />
                Pemeriksaan awal
              </h2>
              <span
                className={cn("text-xs", verifiedCount === 3 ? "text-success" : "text-warning")}
              >
                {verifiedCount}/3 terverifikasi
              </span>
            </div>
            <div className="mt-4 divide-y divide-border">
              {checkItems.map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between gap-3 py-4">
                  <div>
                    <label htmlFor={`check-${key}`} className="cursor-pointer text-sm font-medium">
                      {label}
                    </label>
                    <p className="mt-1 hidden text-[11px] text-muted-foreground sm:block">
                      {description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-right text-[10px] sm:text-xs",
                        simulation.verification[key] ? "text-success" : "text-warning",
                      )}
                    >
                      {simulation.verification[key] ? "Terverifikasi" : "Belum terverifikasi"}
                    </span>
                    <Switch
                      id={`check-${key}`}
                      aria-label={label}
                      className="verification-switch"
                      checked={simulation.verification[key]}
                      onCheckedChange={(checked) => setCheck(property.id, key, checked)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
          {property.id === "cibinong" && <ConditionPhotoPilot />}
          {property.id === "cibinong" && (
            <NearbyAskingPrices
              onUseMedian={(askingPrice) => {
                setField(property.id, "salePrice", String(askingPrice));
                salePriceInput.current?.focus();
              }}
            />
          )}
          <section className="border-t border-border py-7" aria-labelledby="form-title">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 id="form-title" className="flex items-center gap-2 text-base font-semibold">
                <SlidersHorizontal className="size-5 text-brand" />
                Simulasi keuangan
              </h2>
              {property.id === "cibinong" && (
                <div className="flex gap-2" aria-label="Skenario Cibinong">
                  <Button
                    variant="scenario"
                    size="sm"
                    data-active={simulation.scenario === "base"}
                    aria-pressed={simulation.scenario === "base"}
                    onClick={() => setScenario(property.id, "base", baseScenario)}
                  >
                    {simulation.scenario === "base" && <CheckCircle2 />}Dasar
                  </Button>
                  <Button
                    variant="scenario"
                    size="sm"
                    data-active={simulation.scenario === "stressed"}
                    aria-pressed={simulation.scenario === "stressed"}
                    onClick={() => setScenario(property.id, "stressed", stressedScenario)}
                  >
                    {simulation.scenario === "stressed" && <CheckCircle2 />}Tertekan
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-2">
              {simulationFields.map(({ key, label }) => {
                const input = simulation.inputs[key];
                const error = validateAmount(input);
                const belowLimit =
                  key === "winningPrice" && !error && Number(input) < property.auctionLimit;
                const displayedValue = input === "" || error ? input : formatInput(input);
                return (
                  <div key={key}>
                    <label
                      htmlFor={key}
                      className="mb-2 block min-h-10 text-xs font-medium leading-5"
                    >
                      {label}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        id={key}
                        ref={key === "salePrice" ? salePriceInput : null}
                        className="sim-field"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={displayedValue}
                        aria-invalid={Boolean(error) || belowLimit}
                        aria-describedby={error || belowLimit ? `${key}-error` : undefined}
                        onChange={(event) =>
                          setField(property.id, key, event.target.value.replace(/\./g, "").trim())
                        }
                      />
                    </div>
                    {(error || belowLimit) && (
                      <p
                        id={`${key}-error`}
                        role="alert"
                        className="mt-1.5 text-[11px] leading-5 text-destructive"
                      >
                        {error ??
                          `Harga menang tidak boleh di bawah nilai limit ${formatRupiah(property.auctionLimit)}.`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <SimulationResults
          values={values}
          auctionLimit={property.auctionLimit}
          verification={simulation.verification}
        />
      </div>
    </main>
  );
}
