import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, House, TrendingUp } from "lucide-react";
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
    description: "Jelajahi aset contoh dan mulai evaluasi harga, kondisi, serta risikonya sebelum mengambil keputusan.",
    action: "Jelajahi aset",
    href: "/pilih-aset" as const,
    alt: "Ilustrasi rumah untuk simulasi pencarian aset",
  },
  {
    image: secondHouse.url,
    eyebrow: "POMAH Living · Analisis investasi",
    title: "Hitung modal.\nKendalikan risiko.",
    description: "Perkirakan biaya akuisisi, renovasi, holding, hingga potensi laba rumah flipping dalam satu alur.",
    action: "Coba kalkulator flipping",
    href: "/proyek/$id" as const,
    alt: "Ilustrasi rumah untuk analisis investasi properti",
  },
  {
    image: thirdHouse.url,
    eyebrow: "POMAH Living · Rencanakan renovasi",
    title: "Dari RAB hingga\nsiap dipasarkan.",
    description: "Susun rencana renovasi, uji skenario harga jual, pantau risiko, dan kelola tahapan proyek.",
    action: "Lihat proyek demo",
    href: "/proyek/$id" as const,
    alt: "Ilustrasi rumah untuk perencanaan proyek flipping",
  },
];

type PublishedSlide = {
  id: string;
  sort_order: number;
  eyebrow: string;
  title: string;
  description: string;
  image_url: string;
  image_alt: string;
  button_label: string;
  button_href: string;
};
type SliderDatabase = {
  public: {
    Tables: {
      hero_slides: {
        Row: PublishedSlide & { published: boolean };
        Insert: Partial<PublishedSlide>;
        Update: Partial<PublishedSlide>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
};
const sliderClient = supabase as unknown as SupabaseClient<SliderDatabase>;

function Index() {
  const publicSlides = useQuery({
    queryKey: ["public-hero-slides"],
    queryFn: async () => {
      const { data, error } = await sliderClient
        .from("hero_slides")
        .select("id,sort_order,eyebrow,title,description,image_url,image_alt,button_label,button_href")
        .eq("published", true)
        .order("sort_order");
      // Prior to running the migration, retain the static demo slides.
      if (error) return [];
      return (data ?? []).filter((item) => item.image_url.startsWith("https://")).map((item) => ({
        image: item.image_url, eyebrow: item.eyebrow, title: item.title,
        description: item.description, action: item.button_label,
        href: item.button_href, alt: item.image_alt,
      }));
    },
    staleTime: 60_000,
  });
  const slides = publicSlides.data?.length ? publicSlides.data : heroSlides;
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, activeSlide, slides.length]);
  const slide = slides[activeSlide % slides.length];
  return (
    <main>
      <section
        className="hero-scene"
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
            key={item.alt}
            className={`hero-photo transition-opacity duration-700 ${activeSlide === index ? "opacity-100" : "opacity-0"}`}
            src={item.image}
            alt={activeSlide === index ? item.alt : ""}
            aria-hidden={activeSlide !== index}
            fetchPriority={index === 0 ? "high" : undefined}
            loading={index === 0 ? "eager" : "lazy"}
          />
        ))}
        <div className="hero-shade" />
        <div className="page-container hero-content reveal w-full">
          <div className="mb-6 flex items-center gap-2.5 text-xs font-medium text-hero-muted">
            <span className="h-px w-7 bg-brand" />
            {slide.eyebrow}
          </div>
          <h1 className="hero-title whitespace-pre-line">{slide.title}</h1>
          <p className="mt-6 max-w-md text-[15px] leading-7 text-hero-muted sm:text-base">
            {slide.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg" className="gap-3">
              {slide.href === "/pilih-aset" ? (
                <Link to="/pilih-aset">{slide.action}<ArrowRight /></Link>
              ) : (
                <Link to="/proyek/$id" params={{ id: "demo" }}>{slide.action}<ArrowRight /></Link>
              )}
            </Button>
            <Button asChild variant="hero" size="lg" className="gap-3">
              <Link to="/pilih-aset">Pilih aset <ArrowRight /></Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-hero-muted">
            <span className="flex items-center gap-2"><Check className="size-3.5 text-brand" /> Tanpa login untuk demo</span>
            <span className="flex items-center gap-2"><Check className="size-3.5 text-brand" /> Data simulasi, bukan listing BTN</span>
          </div>
        </div>
        <div className="absolute bottom-5 left-0 right-0 z-10">
          <div className="page-container flex items-center justify-between gap-4">
            <div className="flex items-center gap-2" aria-label="Pilih slide">
              {slides.map((item, index) => (
                <button
                  key={item.eyebrow}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Tampilkan slide ${index + 1} dari ${slides.length}`}
                  aria-current={index === activeSlide ? "true" : undefined}
                  className={`h-2 rounded-full transition-all ${index === activeSlide ? "w-9 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" aria-label="Slide sebelumnya" onClick={() => setActiveSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length)} className="rounded-full border border-white/50 p-2 text-white hover:bg-white/20"><ArrowLeft className="size-4" /></button>
              <button type="button" aria-label="Slide berikutnya" onClick={() => setActiveSlide((current) => (current + 1) % heroSlides.length)} className="rounded-full border border-white/50 p-2 text-white hover:bg-white/20"><ArrowRight className="size-4" /></button>
            </div>
          </div>
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
