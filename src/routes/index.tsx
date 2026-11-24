import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedSlides } from "@/services/admin-service";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CaseStudyShowcase } from "@/components/case-study-showcase";
import { caseStudies } from "@/lib/case-studies";
import houseImage from "@/assets/rumah-banyumanik.webp.asset.json";
import secondHouse from "@/assets/rumah-tembalang.webp.asset.json";
import thirdHouse from "@/assets/rumah-ngaliyan.webp.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pomah Living — Hitung batas tawar rumah lelang" },
      {
        name: "description",
        content:
          "Perkirakan biaya renovasi dan laba jual kembali rumah lelang dalam satu simulasi. Coba tiga rumah contoh di Bodetabek tanpa login.",
      },
      { property: "og:title", content: "Pomah Living — Hitung batas tawar sebelum ikut lelang" },
      {
        property: "og:description",
        content:
          "Nilai rumah lelang, biaya renovasi, dan potensi laba sebelum mengajukan penawaran.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(houseImage.url.startsWith("https://")
        ? [
            { property: "og:image", content: houseImage.url },
            { name: "twitter:image", content: houseImage.url },
          ]
        : []),
    ],
  }),
  component: Index,
});

type StageCard = {
  image: string;
  still?: string;
  width: number;
  height: number;
  title: string;
  description: string;
};

const heroSlides = [
  {
    image: houseImage.url,
    eyebrow: "POMAH Living · Temukan peluang",
    title: "Temukan aset.\nUkur potensinya.",
    description:
      "Jelajahi aset contoh dan mulai evaluasi harga, kondisi, serta risikonya sebelum mengambil keputusan.",
    action: "Jelajahi aset",
    href: "/pilih-aset" as const,
    alt: "Ilustrasi rumah untuk simulasi pencarian aset",
  },
  {
    image: secondHouse.url,
    eyebrow: "POMAH Living · Analisis investasi",
    title: "Hitung modal.\nKendalikan risiko.",
    description:
      "Perkirakan biaya akuisisi, renovasi, holding, hingga potensi laba rumah flipping dalam satu alur.",
    action: "Coba kalkulator flipping",
    href: "/proyek/$id" as const,
    alt: "Ilustrasi rumah untuk analisis investasi properti",
  },
  {
    image: thirdHouse.url,
    eyebrow: "POMAH Living · Rencanakan renovasi",
    title: "Dari RAB hingga\nsiap dipasarkan.",
    description:
      "Susun rencana renovasi, uji skenario harga jual, pantau risiko, dan kelola tahapan proyek.",
    action: "Lihat proyek demo",
    href: "/proyek/$id" as const,
    alt: "Ilustrasi rumah untuk perencanaan proyek flipping",
  },
];

const heroSlideCacheKey = "pomah-hero-slides-v1";
type HeroSlide =
  | (typeof heroSlides)[number]
  | {
      image: string;
      eyebrow: string;
      title: string;
      description: string;
      action: string;
      href: string;
      alt: string;
    };
function readCachedSlides(): HeroSlide[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(heroSlideCacheKey);
    const parsed: unknown = raw ? JSON.parse(raw) : undefined;
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as HeroSlide[]) : undefined;
  } catch {
    return undefined;
  }
}
function writeCachedSlides(slides: HeroSlide[]) {
  try {
    window.localStorage.setItem(heroSlideCacheKey, JSON.stringify(slides));
  } catch {
    // Penyimpanan browser tidak tersedia; banner tetap dimuat dari server.
  }
}

function Index() {
  const publicSlides = useQuery({
    queryKey: ["public-hero-slides"],
    placeholderData: readCachedSlides,
    queryFn: async () => {
      const fresh = (await fetchPublishedSlides()).map((item) => ({
        image: item.image_url,
        eyebrow: item.eyebrow,
        title: item.title,
        description: item.description,
        action: item.button_label,
        href: item.button_href,
        alt: item.image_alt,
      }));
      if (fresh.length) writeCachedSlides(fresh);
      return fresh;
    },
    retry: false,
    staleTime: 60_000,
    refetchInterval: 240_000,
  });
  const slides = publicSlides.data?.length ? publicSlides.data : heroSlides;
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imageStates, setImageStates] = useState<Record<string, "ready" | "error">>({});
  const currentSlide = activeSlide % slides.length;
  const slide = slides[currentSlide] ?? heroSlides[0];
  const imageState = slide ? imageStates[slide.image] : undefined;
  const heroLoading = (publicSlides.isPending && !publicSlides.data) || !imageState;

  function settleImage(source: string, state: "ready" | "error") {
    setImageStates((current) =>
      current[source] === state ? current : { ...current, [source]: state },
    );
  }
  useEffect(() => {
    if (paused || heroLoading || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, heroLoading, activeSlide, slides.length]);
  if (!slide) return null;
  return (
    <main>
      <section
        className="hero-scene"
        data-loading={heroLoading || imageState === "error"}
        aria-busy={heroLoading}
        aria-label="Sorotan POMAH Living"
        aria-roledescription="carousel"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
        }}
      >
        {slides.map((item, index) => (
          <img
            key={item.image}
            className={`hero-photo transition-opacity duration-700 motion-reduce:transition-none ${!heroLoading && currentSlide === index && imageState === "ready" ? "opacity-100" : "opacity-0"}`}
            src={item.image}
            ref={(image) => {
              if (image?.complete) {
                settleImage(item.image, image.naturalWidth > 0 ? "ready" : "error");
              }
            }}
            onLoad={() => settleImage(item.image, "ready")}
            onError={() => settleImage(item.image, "error")}
            alt={currentSlide === index ? item.alt : ""}
            aria-hidden={currentSlide !== index}
            fetchPriority={index === 0 ? "high" : undefined}
            loading={index === 0 ? "eager" : "lazy"}
          />
        ))}
        {heroLoading && (
          <div className="hero-loading">
            <div className="w-56 max-w-full text-center">
              <p className="sr-only" role="status">
                Memuat banner…
              </p>
              <div
                className="hero-loading-track"
                role="progressbar"
                aria-label="Memuat hero slider"
              >
                <span />
              </div>
            </div>
          </div>
        )}
        {!heroLoading && imageState === "error" && (
          <div className="hero-loading" role="status">
            Banner belum dapat dimuat.
          </div>
        )}
        <h1 className="sr-only">{slide.title}</h1>
        <div className="hero-start-action">
          <Button
            asChild
            className="min-h-12 rounded-full bg-white px-6 py-3 text-sm font-semibold tracking-tight text-slate-950 shadow-xl ring-2 ring-white/80 transition-colors hover:bg-emerald-50 hover:shadow-emerald-900/30 focus-visible:ring-4 focus-visible:ring-emerald-300 sm:min-h-14 sm:px-8 sm:text-base"
          >
            <Link to="/pilih-aset">
              Start Flipping
              <ArrowRight className="ml-3 size-6" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        {!heroLoading && slides.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 z-10 sm:bottom-5">
            <div className="page-container flex items-center justify-between gap-4">
              <div className="flex items-center gap-2" aria-label="Pilih slide">
                {slides.map((item, index) => (
                  <Button
                    key={item.eyebrow}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Tampilkan slide ${index + 1} dari ${slides.length}`}
                    aria-current={index === currentSlide ? "true" : undefined}
                    className="size-11 rounded-full bg-transparent p-0 shadow-none hover:bg-white/10"
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-2 rounded-full transition-all ${index === currentSlide ? "w-9 bg-white" : "w-2 bg-white/50"}`}
                    />
                    <span className="sr-only">{index + 1}</span>
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  aria-label="Slide sebelumnya"
                  onClick={() =>
                    setActiveSlide((current) => (current - 1 + slides.length) % slides.length)
                  }
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-hero-line text-hero-foreground hover:bg-hero-line hover:text-hero-foreground"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  aria-label="Slide berikutnya"
                  onClick={() => setActiveSlide((current) => (current + 1) % slides.length)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-hero-line text-hero-foreground hover:bg-hero-line hover:text-hero-foreground"
                >
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
      <div className="hero-actions page-container flex flex-wrap items-center justify-between gap-4 py-5">
        <p className="text-xs text-muted-foreground">
          Tanpa login untuk demo · Data simulasi, bukan listing BTN
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          Mulai dengan tautan lelang BTN/DJKN atau masukkan data aset sendiri.
        </p>
      </div>
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
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:mt-9 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-4 lg:gap-x-9">
          {[
            {
              image: "analisis-aset-animasi.webp",
              // Versi diam untuk pengunjung yang mematikan animasi di perangkatnya.
              still: "analisis-aset-statis.webp",
              width: 512,
              height: 288,
              title: "Analisis Aset Properti",
              description: "Periksa kondisi rumah, legalitas, dan nilai limit lelang.",
            },
            {
              image: "akuisisi.png",
              width: 1484,
              height: 1060,
              title: "Akuisisi",
              description: "Hitung batas tawar dan total biaya perolehan aset.",
            },
            {
              image: "renovasi.png",
              width: 1484,
              height: 1060,
              title: "Simulasi Renovasi",
              description: "Susun RAB dan perkirakan biaya perbaikan rumah.",
            },
            {
              image: "penjualan.png",
              width: 1484,
              height: 1060,
              title: "Penjualan",
              description: "Uji target harga jual, titik impas, dan potensi laba.",
            },
          ].map(({ image, still, width, height, title, description }: StageCard) => (
            <div key={image} className="border-t border-border pt-4 sm:pt-5">
              <picture>
                {still && (
                  <source
                    srcSet={`/images/flipping-stages/${still}`}
                    media="(prefers-reduced-motion: reduce)"
                  />
                )}
                <img
                  src={`/images/flipping-stages/${image}`}
                  alt=""
                  width={width}
                  height={height}
                  loading="lazy"
                  decoding="async"
                  className="mb-3 h-20 w-full object-contain object-left sm:mb-4 sm:h-36"
                />
              </picture>
              <h3 className="text-sm font-semibold sm:text-base">{title}</h3>
              <p className="mt-1.5 max-w-xs text-xs leading-5 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-6">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
      {caseStudies.map((study) => (
        <CaseStudyShowcase key={study.id} study={study} />
      ))}
    </main>
  );
}
