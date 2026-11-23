import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedSlides } from "@/services/admin-service";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ClipboardCheck, House, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function Index() {
  const publicSlides = useQuery({
    queryKey: ["public-hero-slides"],
    queryFn: async () =>
      (await fetchPublishedSlides()).map((item) => ({
        image: item.image_url,
        eyebrow: item.eyebrow,
        title: item.title,
        description: item.description,
        action: item.button_label,
        href: item.button_href,
        alt: item.image_alt,
      })),
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
  const heroLoading = publicSlides.isPending || !imageState;

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
              <p className="mb-3 text-sm" role="status">
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
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <Button asChild className="pointer-events-auto min-h-16 rounded-xl bg-white px-9 py-5 text-lg font-bold text-slate-950 shadow-2xl ring-2 ring-white/80 transition-transform hover:scale-105 hover:bg-white sm:min-h-20 sm:px-14 sm:text-2xl">
            <Link to="/pilih-aset">
              Mulai dari Sini
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
        <div className="mt-9 grid gap-7 sm:grid-cols-3 sm:gap-9">
          {[
            {
              number: "01",
              icon: House,
              title: "Pilih aset",
              description: "Rumah contoh di Bodetabek dengan nilai limit lelang.",
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
