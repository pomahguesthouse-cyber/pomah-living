import type { CaseStudy } from "@/lib/case-studies";

const stageTone: Record<string, string> = {
  Sebelum: "bg-orange-100 text-orange-900",
  Proses: "bg-muted text-foreground",
  Sesudah: "bg-brand-deep text-primary-foreground",
};

export function CaseStudyShowcase({ study }: { study: CaseStudy }) {
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
