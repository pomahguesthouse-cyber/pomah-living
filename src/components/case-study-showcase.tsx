import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { caseStudyResult, type CaseStudy } from "@/lib/case-studies";

const juta = (value: number) =>
  `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value / 1_000_000)} jt`;

const stageTone: Record<string, string> = {
  Sebelum: "bg-orange-100 text-orange-900",
  Proses: "bg-white text-foreground",
  Sesudah: "bg-brand-deep text-primary-foreground",
};

export function CaseStudyShowcase({ study }: { study: CaseStudy }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    const sync = () => {
      setCurrent(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
    };
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  const result = caseStudyResult(study.figures);
  const stats = [
    { label: "Harga beli", value: juta(study.figures.purchase) },
    { label: "Biaya renovasi", value: juta(study.figures.renovation) },
    { label: "Harga jual", value: juta(study.figures.sale) },
    {
      label: "Laba kotor",
      value: `${juta(result.grossProfit)} (${Math.round(result.margin * 100)}%)`,
      highlight: true,
    },
  ];
  const photoCount = study.photos.length;
  return (
    <section
      id={`proyek-${study.id}`}
      className="page-container py-14 sm:py-16"
      aria-labelledby={`judul-${study.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-brand">Contoh proyek flipping</p>
          <h2 id={`judul-${study.id}`} className="section-title mt-3">
            {study.title}
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {study.summary} <span className="whitespace-nowrap">{study.location}.</span>
        </p>
      </div>

      <Carousel
        setApi={setApi}
        opts={{ align: "start" }}
        className="mt-9"
        aria-label={`Foto ${study.title}`}
      >
        <CarouselContent>
          {study.photos.map((photo, index) => (
            <CarouselItem
              key={photo.src}
              className="basis-[85%] sm:basis-1/2 lg:basis-1/3"
              aria-label={`Foto ${index + 1} dari ${photoCount}`}
            >
              <figure className="relative overflow-hidden rounded-2xl bg-muted">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  loading={index < 3 ? "eager" : "lazy"}
                  decoding="async"
                  style={photo.focus ? { objectPosition: photo.focus } : undefined}
                  className="h-80 w-full object-cover sm:h-96"
                />
                <figcaption className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 bg-gradient-to-t from-black/75 to-transparent p-4 pt-12">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${stageTone[photo.label]}`}
                  >
                    {photo.label}
                  </span>
                  <span className="text-sm font-medium text-white">{photo.caption}</span>
                </figcaption>
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1" aria-label="Pilih foto">
            {Array.from({ length: snapCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => api?.scrollTo(index)}
                aria-label={`Tampilkan foto ${index + 1}`}
                aria-current={index === current ? "true" : undefined}
                className="flex size-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-hidden="true"
                  className={`block h-2 rounded-full transition-all ${index === current ? "w-6 bg-brand-deep" : "w-2 bg-border"}`}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <CarouselPrevious className="static translate-y-0" aria-label="Foto sebelumnya" />
            <CarouselNext className="static translate-y-0" aria-label="Foto berikutnya" />
          </div>
        </div>
      </Carousel>

      <dl className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-border pt-6 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd
              className={`mt-1 text-xl font-semibold tracking-tight sm:text-2xl ${stat.highlight ? "text-brand-deep" : ""}`}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Laba kotor = harga jual − (harga beli + renovasi), sebelum pajak dan biaya transaksi.
      </p>

      <ul className="mt-6 flex flex-wrap gap-2" aria-label="Pekerjaan renovasi">
        {study.works.map((work) => (
          <li
            key={work}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {work}
          </li>
        ))}
      </ul>
    </section>
  );
}
