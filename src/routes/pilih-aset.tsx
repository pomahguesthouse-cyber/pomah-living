import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Building2,
  FlaskConical,
  FilePlus,
  ImageOff,
  MapPin,
  ClipboardCheck,
  Calculator,
  TrendingUp,
  Layers,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { matchesPreferredRegions } from "@/lib/indonesia-regions";
import { fetchPreferredRegions, preferredRegionsKey } from "@/services/account-details";
import { properties } from "@/lib/properties";
import { listingToAsset, sampleToAsset, type AnalysisAsset } from "@/lib/listings";
import {
  fetchListingPhotoUrls,
  fetchPublishedListings,
  publishedListingsKey,
} from "@/services/listing-service";
import { formatArea, formatLandArea } from "@/lib/area-format";
import { catalogSummary, daysUntilAuction } from "@/lib/catalog-summary";
import { defaultLandSettings } from "@/lib/land-settings";
import { formatRupiah } from "@/lib/simulation";
import { fetchLandSettings, landSettingsQueryKey } from "@/services/settings-service";
import { cn } from "@/lib/utils";
import { fetchPublishedDemos, publishedDemoKey } from "@/services/flipping-demo-service";

export const Route = createFileRoute("/pilih-aset")({
  head: () => ({
    meta: [
      { title: "Pilih aset simulasi — Pomah Living" },
      {
        name: "description",
        content:
          "Pilih rumah contoh Cibinong, Sawangan, atau Jatiasih di Bodetabek untuk menghitung batas tawar lelang dan biaya renovasi.",
      },
      { property: "og:title", content: "Pilih aset simulasi — Pomah Living" },
      {
        property: "og:description",
        content:
          "Tiga rumah contoh di Bodetabek dengan nilai limit dan status pemeriksaan untuk simulasi lelang.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SelectAsset,
});

function SelectAsset() {
  const landSettingsQuery = useQuery({
    queryKey: landSettingsQueryKey,
    queryFn: fetchLandSettings,
    staleTime: 5 * 60_000,
  });
  const landSettings = landSettingsQuery.data?.settings ?? defaultLandSettings;
  const demos = useQuery({
    queryKey: publishedDemoKey,
    queryFn: fetchPublishedDemos,
    retry: false,
  });
  const featuredDemo = demos.data?.find((item) => item.id === "demo");
  const { session, ready } = useSession();
  const id = session?.user.id;
  const regions = useQuery({
    queryKey: preferredRegionsKey(id),
    queryFn: ({ signal }) => (id ? fetchPreferredRegions(id, signal) : Promise.resolve([])),
    enabled: Boolean(id),
    gcTime: 0,
  });
  const [unfilteredUser, setUnfilteredUser] = useState<string | null>(null);
  const preferences = regions.data ?? [];
  const isFiltering = Boolean(id && preferences.length && unfilteredUser !== id);
  const listings = useQuery({
    queryKey: publishedListingsKey,
    queryFn: async () => {
      const rows = await fetchPublishedListings();
      const covers = rows.flatMap((row) => (row.cover_photo_path ? [row.cover_photo_path] : []));
      const urls = await fetchListingPhotoUrls(covers).catch(() => ({}) as Record<string, string>);
      return rows.map((row) =>
        listingToAsset(row, row.cover_photo_path ? urls[row.cover_photo_path] : undefined),
      );
    },
    retry: false,
    staleTime: 60_000,
  });
  const catalog: AnalysisAsset[] = [...(listings.data ?? []), ...properties.map(sampleToAsset)];
  const visibleProperties = isFiltering
    ? catalog.filter((property) => matchesPreferredRegions(property.regionCode, preferences))
    : catalog;
  const canShowListings =
    ready && (!id || regions.isSuccess) && demos.isSuccess && !listings.isPending;

  return (
    <main className="page-container reveal py-10 sm:py-14">
      <div className="mb-8 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-brand-deep">
          Beranda
        </Link>
        <ArrowRight className="size-3" />
        <span className="text-foreground">Pilih aset</span>
      </div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-brand">Mulai simulasi Anda</p>
          <h1 className="section-title mt-3">Mulai analisis flipping rumah.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Bandingkan rumah contoh sebelum menghitung batas tawar.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5 text-brand" />
          Bodetabek
          {canShowListings && (
            <span className="ml-2 border-l border-border pl-3">
              {visibleProperties.length} aset
            </span>
          )}
        </span>
      </div>
      <section
        aria-labelledby="wizard-step-one"
        className="mt-7 rounded-2xl border border-border bg-card p-5 sm:p-7"
      >
        <p className="eyebrow text-brand">Wizard flipping · Langkah 1</p>
        <h2 id="wizard-step-one" className="mt-2 text-2xl font-semibold">
          Pilih sumber aset properti
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Pilih rumah dari katalog aset atau masukkan aset sendiri dari tautan lelang BTN/DJKN
          maupun secara manual.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <a
            href="#daftar-aset"
            className="flex min-h-36 flex-col justify-between rounded-xl border border-border bg-background p-5 transition-colors hover:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span className="flex items-center gap-3 text-lg font-semibold">
              <FlaskConical className="size-6 text-brand" /> Katalog aset
            </span>
            <span className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              Pilih dari daftar rumah yang tersedia <ArrowRight className="size-5 text-brand" />
            </span>
          </a>
          <Link
            to="/aset-baru"
            className="flex min-h-36 flex-col justify-between rounded-xl border border-border bg-background p-5 transition-colors hover:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span className="flex items-center gap-3 text-lg font-semibold">
              <FilePlus className="size-6 text-brand" /> Input aset sendiri
            </span>
            <span className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              Tempel URL lelang atau isi data manual <ArrowRight className="size-5 text-brand" />
            </span>
          </Link>
        </div>
      </section>
      <section
        aria-labelledby="wizard-next-steps"
        className="mt-7 rounded-2xl border border-border bg-card p-5 sm:p-7"
      >
        <p className="eyebrow text-brand">Wizard flipping · Langkah berikutnya</p>
        <h2 id="wizard-next-steps" className="mt-2 text-xl font-semibold">
          Setelah memilih aset, apa selanjutnya?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pilih salah satu aset di bawah untuk melanjutkan analisis. Urutan ini membantu menilai
          kelayakan sebelum memutuskan membeli.
        </p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          <li className="rounded-xl border border-border p-4">
            <ClipboardCheck className="mb-3 size-5 text-brand" aria-hidden="true" />
            <p className="font-semibold">2. Periksa kondisi aset</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tinjau legalitas, penghunian, lokasi, dan kondisi fisik.
            </p>
          </li>
          <li className="rounded-xl border border-border p-4">
            <Calculator className="mb-3 size-5 text-brand" aria-hidden="true" />
            <p className="font-semibold">3. Hitung total modal</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Masukkan harga perolehan, pajak, biaya lelang, dan renovasi.
            </p>
          </li>
          <li className="rounded-xl border border-border p-4">
            <TrendingUp className="mb-3 size-5 text-brand" aria-hidden="true" />
            <p className="font-semibold">4. Evaluasi keuntungan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bandingkan total modal dengan estimasi harga jual dan laba.
            </p>
          </li>
        </ol>
      </section>
      <section className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-border py-5">
        <div>
          <h2 className="text-base font-semibold">
            {featuredDemo?.project.property.name ?? "Proyek flipping demo"}
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            {featuredDemo?.description ?? "Contoh fiktif, tersedia tanpa login."}
          </p>
        </div>
        <Button asChild>
          <Link to="/proyek/$id" params={{ id: "demo" }}>
            Buka proyek demo <ArrowRight />
          </Link>
        </Button>
      </section>
      {id && preferences.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <span>{isFiltering ? "Sesuai preferensi wilayah" : "Semua wilayah"}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUnfilteredUser(isFiltering ? id : null)}
          >
            {isFiltering ? "Lihat semua sementara" : "Pakai preferensi"}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/akun/edit">Ubah preferensi</Link>
          </Button>
        </div>
      )}
      <div className="mt-9">
        <h2 className="text-xl font-semibold">Katalog aset</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Properti pilihan Pomah Living tampil lebih dulu, disusul rumah contoh untuk mencoba alur
          analisis.
        </p>
      </div>
      {demos.isError && (
        <div className="mt-5">
          <p role="alert">Demo publik gagal dimuat.</p>
          <Button className="mt-2" onClick={() => void demos.refetch()}>
            Coba lagi
          </Button>
        </div>
      )}
      {!canShowListings &&
        !demos.isError &&
        (id && regions.isError ? (
          <div className="mt-8 space-y-2">
            <p role="alert" className="text-sm">
              Preferensi wilayah gagal dimuat.
            </p>
            <Button size="sm" variant="outline" onClick={() => void regions.refetch()}>
              Coba lagi
            </Button>
          </div>
        ) : (
          <p role="status" className="mt-8 text-sm text-muted-foreground">
            Memuat daftar aset…
          </p>
        ))}
      {canShowListings && visibleProperties.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">Belum ada aset di wilayah pilihanmu.</p>
      )}
      <div id="daftar-aset" className="mt-6 grid scroll-mt-8 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {canShowListings &&
          visibleProperties.map((property) => {
            const sample = property.isSample
              ? demos.data?.find((item) => item.id === property.id)
              : undefined;
            const summary = catalogSummary(
              {
                auctionLimit: property.auctionLimit,
                landArea: property.details?.landArea ?? null,
                landWidth: property.details?.landWidth ?? null,
                landLength: property.details?.landLength ?? null,
              },
              landSettings,
            );
            const days = daysUntilAuction(property.details?.auctionDate ?? null);
            return (
              <article className="property-card" key={property.id}>
                <div className="relative">
                  {property.image ? (
                    <img
                      className="property-photo"
                      src={property.image}
                      alt={
                        property.isSample ? `Ilustrasi ${property.name}` : `Foto ${property.name}`
                      }
                    />
                  ) : (
                    <div className="property-photo flex items-center justify-center bg-muted text-muted-foreground">
                      <ImageOff className="size-8" aria-hidden="true" />
                    </div>
                  )}
                  <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded bg-card/95 px-2.5 py-1.5 text-[10px] font-semibold text-brand-deep">
                    {property.isSample ? (
                      <FlaskConical className="size-3" />
                    ) : (
                      <Building2 className="size-3" />
                    )}
                    {property.sourceLabel}
                  </span>
                </div>
                <div className="p-5">
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {property.location}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {sample?.project.property.name ?? property.name}
                  </h2>
                  {sample && (
                    <p className="mt-2 text-xs text-muted-foreground">{sample.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span
                      data-testid={`card-inspection-${property.id}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium",
                        property.verification.occupancy &&
                          property.verification.access &&
                          property.verification.documents
                          ? "bg-success-soft text-success"
                          : "bg-warning-soft text-warning",
                      )}
                    >
                      {property.verification.occupancy &&
                      property.verification.access &&
                      property.verification.documents ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : (
                        <CircleAlert className="size-3.5" />
                      )}
                      {property.isSample
                        ? property.inspection
                        : `${property.inspection} (dicek admin)`}
                    </span>
                    {summary.potentialUnits >= 2 && (
                      <span className="inline-flex items-center gap-1 rounded bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand-deep">
                        <Layers className="size-3.5" />
                        Potensi {summary.potentialUnits} rumah
                      </span>
                    )}
                    {days !== null && (
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-[11px] font-medium">
                        <CalendarDays className="size-3.5" />
                        {days === 0 ? "Lelang hari ini" : `Lelang ${days} hari lagi`}
                      </span>
                    )}
                  </div>
                  <dl className="mt-4 space-y-2 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-muted-foreground">Nilai limit lelang</dt>
                      <dd className="text-lg font-semibold tabular-nums">
                        {formatRupiah(property.auctionLimit)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-muted-foreground">Luas tanah</dt>
                      <dd className="text-sm font-semibold tabular-nums">
                        {formatLandArea(
                          summary.landArea,
                          property.details?.landWidth,
                          property.details?.landLength,
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-muted-foreground">Luas bangunan</dt>
                      <dd
                        className={cn(
                          "text-sm tabular-nums",
                          property.details?.buildingArea
                            ? "font-semibold"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatArea(property.details?.buildingArea)}
                      </dd>
                    </div>
                    {summary.limitPerM2 !== null && (
                      <div className="flex items-center justify-between">
                        <dt className="text-xs text-muted-foreground">Limit per m² tanah</dt>
                        <dd className="text-sm font-semibold tabular-nums">
                          {formatRupiah(summary.limitPerM2)}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <Button asChild variant="outline" className="mt-6 h-11 w-full justify-between">
                    <Link to="/analisis/$assetId" params={{ assetId: property.id }}>
                      Analisis aset ini
                      <ArrowUpRight />
                    </Link>
                  </Button>
                  {property.isSample && (
                    <Button asChild variant="ghost" className="mt-2 w-full justify-between">
                      <Link to="/proyek/$id" params={{ id: property.id }}>
                        Proyek flipping demo <ArrowRight />
                      </Link>
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
      </div>
      <div className="mt-9 flex items-start gap-3 border-t border-border pt-6 text-xs leading-6 text-muted-foreground">
        <FlaskConical className="mt-1 size-4 shrink-0 text-brand" />
        <p>
          Rumah berlabel "Contoh" adalah ilustrasi simulasi. Katalog hanya menampilkan data aset;
          harga jual, RAB, dan batas tawar dihitung sendiri di halaman analisis. Selalu verifikasi
          data lelang dan kondisi fisik sebelum menawar.
        </p>
      </div>
    </main>
  );
}
