import { caseStudyResult, type CaseStudy } from "@/lib/case-studies";

const juta = (value: number) =>
  `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value / 1_000_000)} jt`;

const stageTone: Record<string, string> = {
  Sebelum: "bg-orange-100 text-orange-900",
  Proses: "bg-muted text-foreground",
  Sesudah: "bg-brand-deep text-primary-foreground",
};

export function CaseStudyShowcase({ study }: { study: CaseStudy }) {
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

      <div className="mt-9 grid gap-5 md:grid-cols-[2fr_3fr_4fr]">
        {study.stages.map((stage) => (
          <figure key={stage.label} className="flex flex-col gap-3">
            <figcaption>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${stageTone[stage.label]}`}
              >
                {stage.label}
              </span>
            </figcaption>
            <img
              src={stage.src}
              alt={stage.alt}
              width={stage.width}
              height={stage.height}
              loading="lazy"
              decoding="async"
              style={stage.focus ? { objectPosition: stage.focus } : undefined}
              className="aspect-[4/3] w-full rounded-2xl object-cover md:aspect-auto md:h-80 lg:h-96"
            />
          </figure>
        ))}
      </div>

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

      <h3 className="mt-12 text-base font-semibold">Interior sesudah renovasi</h3>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {study.interior.map((photo) => (
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] w-full rounded-2xl object-cover"
          />
        ))}
      </div>
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
