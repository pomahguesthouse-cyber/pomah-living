import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  FlaskConical,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { matchesPreferredRegions } from "@/lib/indonesia-regions";
import { fetchPreferredRegions, preferredRegionsKey } from "@/services/account-details";
import { properties } from "@/lib/properties";
import { calculateSimulation, formatRupiah } from "@/lib/simulation";
import { cn } from "@/lib/utils";

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
  const visibleProperties = isFiltering
    ? properties.filter((property) => matchesPreferredRegions(property.regionCode, preferences))
    : properties;
  const canShowListings = ready && (!id || regions.isSuccess);

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
          <h1 className="section-title mt-3">Pilih rumah, lihat potensinya.</h1>
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
      <section className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-border py-5">
        <div>
          <h2 className="text-base font-semibold">Proyek flipping demo</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            Analisis investasi, renovasi, dokumen, dan timeline. Contoh fiktif, tersedia tanpa
            login.
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
      {!canShowListings &&
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
      <div className="mt-9 grid gap-6 md:grid-cols-3">
        {canShowListings &&
          visibleProperties.map((property) => {
            const complete = Object.values(property.verification).every(Boolean);
            const bidLimit = calculateSimulation(property.initialValues).bidLimit;
            return (
              <article className="property-card" key={property.id}>
                <div className="relative">
                  <img
                    className="property-photo"
                    src={property.image}
                    alt={`Ilustrasi ${property.name}`}
                  />
                  <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded bg-card/95 px-2.5 py-1.5 text-[10px] font-semibold text-brand-deep">
                    <FlaskConical className="size-3" />
                    Data simulasi
                  </span>
                </div>
                <div className="p-5">
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {property.location}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">{property.name}</h2>
                  <div
                    className={cn(
                      "mt-4 flex min-h-10 items-center gap-2 text-xs",
                      complete ? "text-success" : "text-warning",
                    )}
                  >
                    {complete ? (
                      <CheckCircle2 className="size-4 shrink-0" />
                    ) : (
                      <CircleAlert className="size-4 shrink-0" />
                    )}
                    <span>{property.inspection}</span>
                  </div>
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Nilai limit lelang</span>
                      <span className="text-lg font-semibold tabular-nums">
                        {formatRupiah(property.auctionLimit)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Batas tawar awal</span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          bidLimit < property.auctionLimit ? "text-destructive" : "text-brand-deep",
                        )}
                      >
                        {formatRupiah(bidLimit)}
                      </span>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="mt-6 h-11 w-full justify-between">
                    <Link to="/analisis/$assetId" params={{ assetId: property.id }}>
                      Analisis aset
                      <ArrowUpRight />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="mt-2 w-full justify-between">
                    <Link to="/proyek/$id" params={{ id: property.id }}>
                      Proyek flipping demo <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
      </div>
      <div className="mt-9 flex items-start gap-3 border-t border-border pt-6 text-xs leading-6 text-muted-foreground">
        <FlaskConical className="mt-1 size-4 shrink-0 text-brand" />
        <p>
          Seluruh rumah, foto, dan angka merupakan ilustrasi simulasi, bukan penawaran lelang yang
          sedang berlangsung.
        </p>
      </div>
    </main>
  );
}
