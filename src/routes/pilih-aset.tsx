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
            Tiga rumah contoh. Tiga kondisi berbeda. Satu keputusan yang lebih terukur.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5 text-brand" />
          Bodetabek<span className="ml-2 border-l border-border pl-3">3 aset</span>
        </span>
      </div>
      <div className="mt-9 grid gap-6 md:grid-cols-3">
        {properties.map((property) => {
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
