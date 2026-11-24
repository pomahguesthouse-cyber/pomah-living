import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronUp,
  CircleAlert,
  ClipboardCheck,
  ExternalLink,
  FlaskConical,
  ImageOff,
  LogIn,
  MapPin,
  Pencil,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConditionPhotoPilot } from "@/components/condition-photo-pilot";
import { NearbyAskingPrices } from "@/components/nearby-asking-prices";
import { SimulationResults } from "@/components/simulation-results";
import {
  LandSizeSection,
  LandSplitOffer,
  LandStrategyComparison,
} from "@/components/land-strategy-comparison";
import { useLandAnalysis } from "@/hooks/use-land-analysis";
import {
  defaultAnalysisDefaults,
  followStandards,
  quickRenovation,
  renovationLevelLabels,
  renovationLevels,
} from "@/lib/analysis-defaults";
import { analysisDefaultsQueryKey, fetchAnalysisDefaults } from "@/services/settings-service";
import { getProperty } from "@/lib/properties";
import { listingToAsset, sampleToAsset, type AnalysisAsset } from "@/lib/listings";
import { fetchListingBySlug, fetchListingPhotoUrls, listingKey } from "@/services/listing-service";
import {
  baseScenario,
  checkItems,
  formatInput,
  formatRupiah,
  parseInputs,
  simulationFields,
  stressedScenario,
  validateAmount,
  type SimulationField,
  type SimulationValues,
} from "@/lib/simulation";
import { seedSimulation, useSimulationStore } from "@/stores/simulation-store";
import { useSession } from "@/hooks/use-session";
import {
  createProjectFromAnalysis,
  findProjectsForListing,
  projectsForListingKey,
} from "@/services/flipping-service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analisis/$assetId")({
  loader: ({ params }) => {
    const sample = getProperty(params.assetId);
    return { property: sample ? sampleToAsset(sample) : null, slug: params.assetId };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.property
          ? `Analisis ${loaderData.property.name} — Pomah Living`
          : "Analisis properti — Pomah Living",
      },
      {
        name: "description",
        content: loaderData?.property
          ? `Simulasi biaya renovasi, laba jual kembali, dan batas tawar ${loaderData.property.name} di ${loaderData.property.location}.`
          : "Analisis batas tawar, biaya renovasi, dan laba properti dari katalog Pomah Living.",
      },
      {
        property: "og:title",
        content: loaderData?.property
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
      ...(loaderData?.property?.image.startsWith("https://")
        ? [
            { property: "og:image", content: loaderData.property.image },
            { name: "twitter:image", content: loaderData.property.image },
          ]
        : []),
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
  const { property, slug } = Route.useLoaderData();
  if (property) return <AssetAnalysisView key={property.id} property={property} />;
  return <ListingAnalysis slug={slug} />;
}

function ListingAnalysis({ slug }: { slug: string }) {
  const defaults = useQuery({
    queryKey: analysisDefaultsQueryKey,
    queryFn: fetchAnalysisDefaults,
    staleTime: 5 * 60_000,
  });
  const listing = useQuery({
    queryKey: [...listingKey(slug), "analysis-defaults", defaults.data?.settings],
    enabled: defaults.isSuccess,
    queryFn: async () => {
      const row = await fetchListingBySlug(slug);
      if (!row) return null;
      const cover = row.cover_photo_path;
      const urls = cover ? await fetchListingPhotoUrls([cover]).catch(() => ({})) : {};
      return listingToAsset(
        row,
        cover ? (urls as Record<string, string>)[cover] : undefined,
        defaults.data?.settings,
      );
    },
    retry: false,
  });
  if (listing.isPending)
    return (
      <main className="page-container py-12">
        <p role="status" className="text-sm text-muted-foreground">
          Memuat data properti…
        </p>
      </main>
    );
  if (listing.isError || !listing.data)
    return (
      <main className="page-container py-12">
        <h1 className="text-xl font-semibold">
          {listing.isError ? "Analisis belum bisa dimuat" : "Aset tidak ditemukan"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {listing.isError
            ? "Periksa koneksi lalu coba lagi."
            : "Properti ini tidak ada di katalog atau belum dipublikasikan."}
        </p>
        <Button asChild className="mt-5">
          <Link to="/pilih-aset">Kembali ke aset</Link>
        </Button>
      </main>
    );
  return <AssetAnalysisView key={listing.data.id} property={listing.data} />;
}

function AssetAnalysisView({ property }: { property: AnalysisAsset }) {
  const stored = useSimulationStore((state) => state.simulations[property.id]);
  const register = useSimulationStore((state) => state.register);
  const seed = useMemo(
    () =>
      seedSimulation(
        property.initialValues,
        property.verification,
        property.id === "jatiasih" ? "stressed" : "base",
      ),
    [property],
  );
  useEffect(() => register(property.id, seed), [register, property.id, seed]);
  const simulation = stored ?? seed;
  const setField = useSimulationStore((state) => state.setField);
  const setCheck = useSimulationStore((state) => state.setCheck);
  const setScenario = useSimulationStore((state) => state.setScenario);
  const salePriceInput = useRef<HTMLInputElement>(null);
  const values = parseInputs(simulation.inputs);
  const defaultsQuery = useQuery({
    queryKey: analysisDefaultsQueryKey,
    queryFn: fetchAnalysisDefaults,
    staleTime: 5 * 60_000,
  });
  const analysisDefaults = defaultsQuery.data?.settings ?? defaultAnalysisDefaults;
  /** Aset katalog: biaya yang belum diubah flipper ikut standar platform. */
  const followsStandards = !property.isSample;
  const updateField = (key: SimulationField, raw: string) => {
    const previous = parseInputs(simulation.inputs);
    const next = parseInputs({ ...simulation.inputs, [key]: raw });
    setField(property.id, key, raw);
    if (!followsStandards || !previous || !next) return;
    const followed = followStandards(previous, next, analysisDefaults);
    for (const field of ["purchaseCosts", "holdingAndSaleCosts", "targetProfit"] as const)
      if (field !== key && followed[field] !== next[field])
        setField(property.id, field, String(followed[field]));
  };
  const buildingArea = property.details?.buildingArea ?? null;
  const [assumptionsOpen, setAssumptionsOpen] = useState(
    !property.isSample && property.initialValues.salePrice <= 0,
  );
  const fillSalePrice = () => {
    setAssumptionsOpen(true);
    window.requestAnimationFrame(() => {
      salePriceInput.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      salePriceInput.current?.focus();
    });
  };
  const hasInputError = simulationFields.some(({ key }) => validateAmount(simulation.inputs[key]));
  const showAssumptionForm = assumptionsOpen || hasInputError;
  const verifiedCount = Object.values(simulation.verification).filter(Boolean).length;
  const land = useLandAnalysis({
    values,
    initialLandArea: property.details?.landArea ?? null,
    initialWidth: property.details?.landWidth ?? null,
    initialLength: property.details?.landLength ?? null,
    isSample: property.isSample,
  });
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
              {property.isSample ? "Data simulasi" : property.sourceLabel}
            </span>
            {property.sourceUrl && (
              <a
                href={property.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-3 inline-flex items-center gap-1 border-l border-border pl-3 text-brand hover:underline"
              >
                Lihat sumber <ExternalLink className="size-3" />
              </a>
            )}
          </p>
          {property.status === "draft" || property.status === "archived" ? (
            <p className="mt-3 inline-block rounded-md bg-warning-soft px-3 py-1.5 text-xs text-warning">
              {property.status === "draft" ? "Draf" : "Diarsipkan"} · hanya terlihat oleh admin
            </p>
          ) : null}
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
            {property.image ? (
              <img
                className="h-24 w-32 rounded-md object-cover sm:w-36"
                src={property.image}
                alt={property.isSample ? `Ilustrasi ${property.name}` : `Foto ${property.name}`}
              />
            ) : (
              <div className="flex h-24 w-32 items-center justify-center rounded-md bg-muted text-muted-foreground sm:w-36">
                <ImageOff className="size-6" aria-hidden="true" />
              </div>
            )}
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
          <LandSplitOffer land={land} />
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
          <LandSizeSection land={land} />
          {property.id === "cibinong" && (
            <ConditionPhotoPilot
              currentRenovation={values?.renovationCosts}
              onApply={(total) => updateField("renovationCosts", String(total))}
            />
          )}
          {property.id === "cibinong" && (
            <NearbyAskingPrices
              onUseMedian={(askingPrice) => {
                updateField("salePrice", String(askingPrice));
                setAssumptionsOpen(true);
                window.requestAnimationFrame(() => salePriceInput.current?.focus());
              }}
            />
          )}
          <section className="border-t border-border py-7" aria-labelledby="form-title">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 id="form-title" className="flex items-center gap-2 text-base font-semibold">
                <SlidersHorizontal className="size-5 text-brand" />
                Asumsi perhitungan
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
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Hasil di samping dihitung dari angka berikut. Ubah bila survei, RAB, atau harga
              pembanding memberi angka yang lebih tepat.
            </p>
            {!showAssumptionForm && (
              <dl
                data-testid="assumption-summary"
                className="mt-5 grid gap-x-5 gap-y-3 rounded-md border border-border p-4 text-sm sm:grid-cols-2"
              >
                {simulationFields.map(({ key, label }) => (
                  <div key={key} className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-semibold tabular-nums">
                      {formatRupiah(Number(simulation.inputs[key]))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-10"
              aria-expanded={showAssumptionForm}
              aria-controls="assumption-form"
              disabled={hasInputError}
              onClick={() => setAssumptionsOpen((open) => !open)}
            >
              {showAssumptionForm ? (
                <>
                  <ChevronUp className="size-4" aria-hidden="true" /> Tutup asumsi
                </>
              ) : (
                <>
                  <Pencil className="size-4" aria-hidden="true" /> Ubah asumsi
                </>
              )}
            </Button>
            {showAssumptionForm && (
              <div id="assumption-form" className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-2">
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
                            updateField(key, event.target.value.replace(/\./g, "").trim())
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
            )}
            {followsStandards && (
              <div className="mt-6 rounded-md border border-border p-4">
                <p className="text-xs font-semibold">Perkiraan cepat renovasi</p>
                {buildingArea ? (
                  <>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      Luas bangunan {buildingArea} m² × tarif per tingkat kerusakan. Ganti dengan
                      RAB bila sudah survei.
                    </p>
                    <div
                      className="mt-3 flex flex-wrap gap-2"
                      role="group"
                      aria-label="Tingkat kerusakan"
                    >
                      {renovationLevels.map((level) => {
                        const total = quickRenovation(buildingArea, level, analysisDefaults);
                        const active = values?.renovationCosts === total;
                        return (
                          <Button
                            key={level}
                            type="button"
                            size="sm"
                            variant={active ? "brand" : "outline"}
                            aria-pressed={active}
                            onClick={() => updateField("renovationCosts", String(total))}
                          >
                            {renovationLevelLabels[level]} · {formatRupiah(total)}
                          </Button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    Luas bangunan belum tercatat di katalog. Isi biaya renovasi dari RAB atau
                    survei.
                  </p>
                )}
                <p className="mt-3 border-t border-border pt-3 text-[11px] leading-5 text-muted-foreground">
                  Angka awal mengikuti standar platform: harga menang = limit, biaya perolehan{" "}
                  {analysisDefaults.purchaseCostPercent}% dari harga menang, kepemilikan dan jual{" "}
                  {analysisDefaults.holdingSalePercent}% dari harga jual, target laba{" "}
                  {analysisDefaults.targetProfitPercent}% dari modal. Biaya yang belum Anda ubah
                  ikut menyesuaikan.
                </p>
              </div>
            )}
          </section>
          <LandStrategyComparison land={land} auctionLimit={property.auctionLimit} />
          {property.notes && (
            <section className="border-t border-border py-7" aria-labelledby="notes-title">
              <h2 id="notes-title" className="text-base font-semibold">
                Catatan aset
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {property.notes}
              </p>
            </section>
          )}
          {property.isSample && (
            <section
              className="border-t border-border py-7"
              aria-labelledby="next-step-title"
              data-testid="next-step"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                Langkah berikutnya
              </p>
              <h2 id="next-step-title" className="mt-1 text-base font-semibold">
                Rencanakan proyek setelah menang lelang
              </h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Angka di halaman ini adalah estimasi cepat untuk menentukan batas tawar. Halaman
                proyek memakai harga beli, harga jual, dan RAB yang sama sebagai titik awal, lalu
                merinci pajak, bunga pendanaan, biaya jual, timeline, dan risiko.
              </p>
              <Button asChild className="mt-4 h-11">
                <Link to="/proyek/$id" params={{ id: property.id }}>
                  Lanjut ke perencanaan proyek <ArrowRight className="size-4" />
                </Link>
              </Button>
            </section>
          )}
          {!property.isSample && <CreateProjectFromAsset property={property} values={values} />}
        </div>
        <SimulationResults
          values={values}
          auctionLimit={property.auctionLimit}
          verification={simulation.verification}
          onFillSalePrice={fillSalePrice}
        />
      </div>
    </main>
  );
}

function CreateProjectFromAsset({
  property,
  values,
}: {
  property: AnalysisAsset;
  values: SimulationValues | null;
}) {
  const { session, ready } = useSession();
  const userId = session?.user.id;
  const navigate = useNavigate();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const existing = useQuery({
    queryKey: projectsForListingKey(userId ?? "signed-out", property.id),
    queryFn: () => findProjectsForListing(userId ?? "", property.id),
    enabled: Boolean(userId),
    retry: false,
  });
  const projects = existing.data ?? [];
  const hasDuplicate = projects.length > 0;

  async function create() {
    if (!values || !userId) return;
    setBusy(true);
    setError("");
    try {
      if (!confirmDuplicate) {
        const latest = await findProjectsForListing(userId, property.id);
        if (latest.length) {
          client.setQueryData(projectsForListingKey(userId, property.id), latest);
          setBusy(false);
          return;
        }
      }
      const id = await createProjectFromAnalysis({
        listingSlug: property.id,
        name: property.name,
        location: property.location,
        auctionLimit: property.auctionLimit,
        auctionDate: property.details?.auctionDate ?? null,
        landArea: property.details?.landArea ?? null,
        buildingArea: property.details?.buildingArea ?? null,
        legal: property.details?.legal ?? "",
        source: [property.sourceLabel, property.sourceUrl].filter(Boolean).join(" · "),
        verification: property.verification,
        values,
      });
      void client.invalidateQueries({ queryKey: projectsForListingKey(userId, property.id) });
      await navigate({ to: "/proyek/$id", params: { id } });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Proyek gagal dibuat. Coba lagi.");
      setBusy(false);
    }
  }
  return (
    <section
      className="border-t border-border py-7"
      aria-labelledby="create-project-title"
      data-testid="create-project"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
        Langkah berikutnya
      </p>
      <h2 id="create-project-title" className="mt-1 text-base font-semibold">
        Jadikan proyek flipping Anda
      </h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Proyek baru tersimpan di akun Anda dengan harga menang, harga jual, dan anggaran renovasi
        dari asumsi di atas. Di halaman proyek Anda bisa merinci pajak, bunga pendanaan, biaya jual,
        RAB, timeline, dan risiko.
      </p>
      {!ready ? null : !session ? (
        <Button asChild className="mt-4 h-11">
          <Link to="/auth" search={{ redirect: `/analisis/${property.id}` }}>
            <LogIn className="size-4" aria-hidden="true" /> Masuk untuk membuat proyek
          </Link>
        </Button>
      ) : existing.isPending ? (
        <p role="status" className="mt-4 text-xs text-muted-foreground">
          Memeriksa proyek Anda…
        </p>
      ) : hasDuplicate ? (
        <div
          className="mt-4 rounded-md bg-warning-soft p-4 text-sm text-warning"
          data-testid="duplicate-warning"
        >
          <p className="flex items-center gap-2 font-semibold">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            Kamu sudah punya proyek untuk aset ini
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  to="/proyek/$id"
                  params={{ id: project.id }}
                  className="font-medium underline underline-offset-2"
                >
                  {project.name}
                </Link>{" "}
                · diperbarui {new Date(project.updated_at).toLocaleDateString("id-ID")}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild className="h-10">
              <Link to="/proyek/$id" params={{ id: projects[0]!.id }}>
                Buka proyek <ArrowRight className="size-4" />
              </Link>
            </Button>
            {confirmDuplicate ? (
              <Button
                variant="outline"
                className="h-10"
                disabled={busy || !values}
                onClick={() => void create()}
              >
                {busy ? "Membuat proyek…" : "Ya, buat proyek baru"}
              </Button>
            ) : (
              <Button variant="ghost" className="h-10" onClick={() => setConfirmDuplicate(true)}>
                Tetap buat proyek baru
              </Button>
            )}
          </div>
          {confirmDuplicate && (
            <p className="mt-2 text-xs">
              Proyek kedua akan dibuat terpisah dari angka analisis saat ini.
            </p>
          )}
        </div>
      ) : (
        <Button className="mt-4 h-11" disabled={busy || !values} onClick={() => void create()}>
          <HouseFlipIcon />
          {busy ? "Membuat proyek…" : "Flip aset ini"}
        </Button>
      )}
      {!values && (
        <p className="mt-2 text-xs text-warning">Lengkapi asumsi perhitungan terlebih dahulu.</p>
      )}
      {existing.isError && (
        <p role="alert" className="mt-2 text-xs text-warning">
          Proyek yang sudah ada belum bisa diperiksa. Pastikan Anda belum membuat proyek untuk aset
          ini sebelum melanjutkan.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

/** Ikon tangan memegang rumah (putih), untuk tombol oranye "Flip aset ini". */
function HouseFlipIcon() {
  return (
    <img
      src="/icons/house-flip.png"
      alt=""
      aria-hidden="true"
      width={33}
      height={24}
      className="h-6 w-auto shrink-0"
    />
  );
}
