import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ClipboardCheck, House, MapPin, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import houseImage from "@/assets/rumah-banyumanik.webp.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pomah Living — Hitung batas tawar rumah lelang" },
      {
        name: "description",
        content:
          "Perkirakan biaya renovasi dan laba jual kembali rumah lelang dalam satu simulasi. Coba tiga rumah contoh di Semarang tanpa login.",
      },
      { property: "og:title", content: "Pomah Living — Hitung batas tawar sebelum ikut lelang" },
      {
        property: "og:description",
        content:
          "Nilai rumah lelang, biaya renovasi, dan potensi laba sebelum mengajukan penawaran.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <section className="hero-scene">
        <img
          className="hero-photo"
          src={houseImage.url}
          alt="Rumah contoh Banyumanik dengan teras dan taman hijau"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="page-container hero-content reveal">
          <div className="mb-6 flex items-center gap-2.5 text-xs font-medium text-hero-muted">
            <span className="h-px w-7 bg-brand" />
            Pomah Living · Simulasi rumah lelang
          </div>
          <h1 className="hero-title">
            Hitung batas tawar
            <br className="hidden sm:block" /> sebelum ikut lelang.
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-7 text-hero-muted sm:text-base">
            Perkirakan biaya renovasi dan laba jual kembali rumah lelang dalam satu simulasi.
          </p>
          <Button asChild variant="hero" size="lg" className="mt-8 gap-5">
            <Link to="/pilih-aset">
              Coba simulasi lelang
              <ArrowRight />
            </Link>
          </Button>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-hero-muted">
            <span className="flex items-center gap-2">
              <Check className="size-3.5 text-brand" />
              Tanpa login
            </span>
            <span className="flex items-center gap-2">
              <Check className="size-3.5 text-brand" />
              Data simulasi
            </span>
          </div>
        </div>
        <div className="absolute bottom-6 right-8 hidden items-center gap-2 text-[11px] text-hero-foreground md:flex">
          <MapPin className="size-3.5" />
          Banyumanik, Semarang
          <span className="mx-2 h-3 border-l border-hero-line" />
          Ilustrasi aset
        </div>
      </section>
      <section className="page-container py-14 sm:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-brand">Satu aset, keputusan lebih terukur</p>
            <h2 className="section-title mt-3">Mulai dari angka. Bukan asumsi.</h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            Rumah yang menarik belum tentu
            <br className="hidden sm:block" /> menjadi investasi yang tepat.
          </p>
        </div>
        <div className="mt-9 grid gap-7 sm:grid-cols-3 sm:gap-9">
          {[
            {
              number: "01",
              icon: House,
              title: "Pilih aset",
              description: "Rumah contoh di Semarang dengan nilai limit lelang.",
            },
            {
              number: "02",
              icon: ClipboardCheck,
              title: "Cek kondisi",
              description: "Status penghunian, akses fisik, dan kelengkapan dokumen.",
            },
            {
              number: "03",
              icon: TrendingUp,
              title: "Hitung batas tawar",
              description: "Biaya renovasi, potensi laba, dan batas penawaran Anda.",
            },
          ].map(({ number, icon: Icon, title, description }) => (
            <div key={number} className="border-t border-border pt-6">
              <div className="mb-5 flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-md bg-brand-soft text-brand-deep">
                  <Icon className="size-5" />
                </span>
                <span className="step-number">{number}</span>
              </div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
