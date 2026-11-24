import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  FlaskConical,
  MapPin,
  Printer,
  Save,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoPhotoGallery } from "@/components/demo-photo-gallery";
import { PropertyPhotoWorkspace } from "@/components/property-photo-workspace";
import { FlippingOverview } from "@/components/flipping-overview";
import { AssetAnalysis } from "@/components/asset-analysis";
import { ProjectMarketAnalysis } from "@/components/project-market-analysis";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FinanceEditor,
  RabEditor,
  RiskEditor,
  TimelineEditor,
  ScenarioEditor,
  NumberField,
} from "@/components/flipping-editors";
import {
  calculateFlipping,
  formatProjectDate,
  isDemoProject,
  makeFlippingProject,
  readFlippingProject,
  type FlippingProject,
} from "@/lib/flipping";
import { getProperty } from "@/lib/properties";
import { formatRupiah } from "@/lib/simulation";
import { useFlippingStore } from "@/stores/flipping-store";
import { useSession } from "@/hooks/use-session";
import { loadFlippingProject, saveFlippingProject } from "@/services/flipping-service";
import {
  canonicalDemoId,
  demoStorageKey,
  restoreDemoSample,
  serializeDemoEdit,
} from "@/lib/flipping-demos";
import { fetchPublishedDemos, publishedDemoKey } from "@/services/flipping-demo-service";

export const Route = createFileRoute("/proyek/$id")({
  loader: ({ params }) => {
    if (
      !isDemoProject(params.id) &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)
    )
      throw notFound();
    const demo = isDemoProject(params.id);
    const image = demo ? (getProperty(params.id) ?? getProperty("cibinong"))?.image : undefined;
    return { demo, ...(image?.startsWith("https://") ? { image } : {}) };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.demo
          ? "Proyek flipping demo — Pomah Living"
          : "Detail proyek flipping — Pomah Living",
      },
      {
        name: "description",
        content:
          "Analisis investasi rumah, RAB renovasi, dokumen, risiko, timeline, dan skenario dalam satu halaman proyek.",
      },
      {
        property: "og:title",
        content: loaderData?.demo
          ? "Proyek flipping demo — Pomah Living"
          : "Detail proyek flipping — Pomah Living",
      },
      {
        property: "og:description",
        content:
          "Hitung biaya all-in dan laba bersih dengan asumsi yang dapat diubah. Tidak menjanjikan keuntungan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.image
        ? [
            { property: "og:image", content: loaderData.image },
            { name: "twitter:image", content: loaderData.image },
          ]
        : [{ name: "robots", content: "noindex" }]),
    ],
  }),
  component: ProjectPage,
  errorComponent: () => (
    <div className="page-container py-12">
      <h1 className="text-xl font-semibold">Proyek belum bisa dimuat</h1>
      <Button asChild className="mt-5">
        <Link to="/pilih-aset">Kembali ke aset</Link>
      </Button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="page-container py-12">
      <h1 className="text-xl font-semibold">Proyek tidak ditemukan</h1>
      <Button asChild className="mt-5">
        <Link to="/proyek/$id" params={{ id: "demo" }}>
          Buka proyek demo
        </Link>
      </Button>
    </div>
  ),
});

function ProjectPage() {
  const { id } = Route.useParams();
  const demo = isDemoProject(id);
  const { session, ready } = useSession();
  const userId = session?.user.id;
  const published = useQuery({
    queryKey: publishedDemoKey,
    queryFn: fetchPublishedDemos,
    enabled: demo,
    retry: false,
  });
  const sample = published.data?.find((item) => item.id === canonicalDemoId(id));
  const key = demo
    ? `demo:${sample?.id ?? id}:revision:${sample?.revision ?? 0}`
    : `${userId ?? "signed-out"}:${id}`;
  const [hydratedKey, setHydratedKey] = useState("");
  const project = useFlippingStore((state) => state.projects[key]);
  const setProject = useFlippingStore((state) => state.setProject);
  const removeProject = useFlippingStore((state) => state.removeProject);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState("asset");
  const [activeWizardStep, setActiveWizardStep] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const detail = useQuery({
    queryKey: ["flipping-project", userId, id],
    queryFn: () => {
      if (!userId) throw new Error("Masuk untuk membuka proyek Anda.");
      return loadFlippingProject(id, userId);
    },
    enabled: !demo && ready && Boolean(userId),
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (!demo || !sample) return;
    try {
      const saved = localStorage.getItem(demoStorageKey(sample));
      const legacy =
        sample.revision === 0 && !saved ? localStorage.getItem(`pomah:flipping:demo:${id}`) : null;
      setProject(key, restoreDemoSample(sample, saved, legacy));
      setMessage(
        saved || legacy
          ? "Demo dipulihkan dari perangkat ini."
          : "Demo siap. Perubahan disimpan pada perangkat ini saja.",
      );
    } catch {
      setProject(key, sample.project);
      setMessage(
        "Simpanan demo tidak dapat dibaca. Contoh awal ditampilkan; simpanan lama belum dihapus.",
      );
    }
    setHydratedKey(key);
  }, [demo, id, sample, key, setProject]);
  useEffect(() => {
    if (!demo && detail.data) {
      setProject(key, detail.data.project);
      setRevision(detail.data.revision);
    }
  }, [demo, detail.data, key, setProject]);
  useEffect(() => {
    if (!demo || !project || !sample || hydratedKey !== key) return;
    try {
      localStorage.setItem(demoStorageKey(sample), serializeDemoEdit(sample, project));
    } catch {
      setMessage(
        "Penyimpanan lokal tidak tersedia. Perubahan hanya tersimpan selama halaman ini terbuka.",
      );
    }
  }, [demo, sample, project, hydratedKey, key]);
  useEffect(
    () => () => {
      if (!demo) removeProject(key);
    },
    [demo, key, removeProject],
  );
  const update = (next: FlippingProject) => {
    setProject(key, next);
    setMessage(demo ? "Demo tersimpan pada perangkat ini." : "Ada perubahan belum disimpan.");
  };
  const print = (mode: string) => {
    if (!form.current?.reportValidity()) return;
    form.current.dataset["printMode"] = mode;
    window.print();
  };
  async function save() {
    if (!project || demo || saving || !form.current?.reportValidity()) return;
    setSaving(true);
    try {
      const nextRevision = await saveFlippingProject(id, project, revision);
      setRevision(nextRevision);
      setMessage("Rincian proyek tersimpan. Data proyek lama tidak diubah.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan rincian.");
    } finally {
      setSaving(false);
    }
  }
  if (!demo && ready && !session)
    return (
      <main className="page-container py-14">
        <h1 className="section-title">Proyek pribadi</h1>
        <p className="mt-4 text-sm">Masuk untuk membuka rincian proyek milik Anda.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/auth">Masuk</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/proyek/$id" params={{ id: "demo" }}>
              Jelajahi demo
            </Link>
          </Button>
        </div>
      </main>
    );
  if (!demo && detail.isError)
    return (
      <main className="page-container py-14">
        <h1 className="section-title">Proyek tidak tersedia</h1>
        <p role="alert" className="mt-4 text-sm">
          {detail.error.message}
        </p>
        <div className="mt-5 flex gap-3">
          <Button onClick={() => void detail.refetch()}>Coba lagi</Button>
          <Button asChild variant="outline">
            <Link to="/profil">Profil</Link>
          </Button>
        </div>
      </main>
    );
  if (demo && published.isError)
    return (
      <main className="page-container py-14">
        <p role="alert">Demo publik gagal dimuat. Simulasi pribadi Anda tidak diubah.</p>
        <Button className="mt-4" onClick={() => void published.refetch()}>
          Coba lagi
        </Button>
      </main>
    );
  if (!project || (demo && (!sample || hydratedKey !== key)))
    return (
      <main className="page-container py-14" role="status">
        Memuat rincian proyek…
      </main>
    );
  const stages = [
    { id: "asset", label: "Analisis Aset" },
    { id: "market", label: "Harga Pasar" },
    { id: "risks", label: "Dokumen & Risiko" },
    { id: "rab", label: "RAB Renovasi" },
    { id: "analysis", label: "Analisis Investasi" },
    { id: "scenarios", label: "Skenario" },
    { id: "timeline", label: "Timeline" },
    { id: "photos", label: "Foto & Before-After" },
  ] as const;
  const wizardSteps = [
    { title: "1. Analisa aset", detail: "Data properti, harga pasar, dokumen dan biaya akuisisi", tabs: ["asset", "market", "risks", "analysis"] },
    { title: "2. Simulasi renovasi", detail: "RAB pekerjaan, foto kondisi dan durasi pelaksanaan", tabs: ["rab", "photos", "timeline"] },
    { title: "3. Simulasi penjualan", detail: "Harga jual, biaya penjualan, skenario dan laba bersih", tabs: ["scenarios", "analysis", "market"] },
  ] as const;
  const wizardTab = (step: number) => {
    setActiveWizardStep(step);
    setTab(step === 0 ? "asset" : step === 1 ? "rab" : "scenarios");
  };
  const reviewed = stages.filter(({ id }) => project.stageReviews?.[id]).length;
  const progressPercent = Math.round((reviewed / stages.length) * 100);
  const result = calculateFlipping(project.finance, project.rab);
  const unresolved = project.risks.filter((risk) => !risk.verified).length;
  const image = demo ? (getProperty(id) ?? getProperty("cibinong"))?.image : undefined;
  const percent = (value: number | null) =>
    value === null
      ? "Tidak tersedia"
      : `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
  return (
    <main className="page-container min-w-0 py-7 sm:py-10">
      <form
        ref={form}
        className="flipping-project"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="no-print mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link to="/">Beranda</Link>
          <ArrowRight className="size-3" />
          <Link to="/pilih-aset">Pilih aset</Link>
          <ArrowRight className="size-3" />
          <span>Detail proyek</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-brand">
              Proyek flipping rumah {demo ? "· Demo" : "· Pribadi"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">
              {project.property.name}
            </h1>
            {demo && sample && (
              <p className="mt-3 text-sm text-muted-foreground">{sample.description}</p>
            )}
            <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-muted-foreground">
              <MapPin className="mt-1 size-4 shrink-0" />
              {project.property.address || "Alamat belum diisi"}
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {!demo && (
              <Button type="submit" disabled={saving}>
                <Save />
                {saving ? "Menyimpan…" : "Simpan rincian"}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => print("summary")}>
              <Printer />
              Cetak ringkasan
            </Button>
            <Button type="button" variant="outline" onClick={() => print("rab")}>
              <Printer />
              Cetak RAB
            </Button>
          </div>
        </div>
        <p role="status" className="no-print mt-4 text-xs text-muted-foreground">
          {message}
        </p>
        {demo && (
          <div className="mt-5 flex items-start gap-3 border-l-4 border-brand bg-brand-soft p-4 text-xs leading-6">
            <FlaskConical className="mt-1 size-4 shrink-0 text-brand" />
            <p>
              DEMO — Seluruh properti, alamat, foto, tanggal lelang, sumber, dan angka contoh adalah
              fiktif. Sumber: simulasi internal Pomah Living. Tanggal contoh: 20/11/2026. Bukan
              penawaran lelang atau jaminan profit.
            </p>
          </div>
        )}
        <section className="property-summary mt-7 grid gap-6 border-y border-border py-6 sm:grid-cols-[220px_1fr]">
          <div className="relative">
            {image ? (
              <img
                src={image}
                alt="Ilustrasi rumah demo, bukan foto objek lelang nyata"
                className="aspect-[4/3] w-full rounded-md object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                Foto proyek belum tersedia
              </div>
            )}
            {demo && (
              <span className="absolute bottom-3 left-3 rounded bg-card px-2 py-1 text-xs font-semibold">
                Foto ilustrasi · Demo
              </span>
            )}
          </div>
          <div>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-xs sm:grid-cols-3">
              {[
                ["Provinsi", project.property.province || "Belum diisi"],
                ["Tipe", project.property.type || "Belum diisi"],
                ["LT / LB", `${project.property.land} / ${project.property.building} m²`],
                ["Legalitas", project.property.legal],
                ["Status hunian", project.property.occupancy],
                ["Status dokumen", project.property.documents],
                ["Sumber lelang", project.property.source],
                ["Tanggal lelang (rencana)", formatProjectDate(project.property.auctionDate)],
                ["Tanggal data / sumber", formatProjectDate(project.property.referenceDate)],
                ["Nilai limit", formatRupiah(project.property.limit)],
                ["Harga beli asumsi", formatRupiah(project.finance.purchase)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words font-medium leading-5">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
        <details className="no-print border-b border-border py-4">
          <summary className="cursor-pointer text-sm font-medium">Ubah ringkasan properti</summary>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["name", "Nama proyek"],
                ["address", "Alamat"],
                ["province", "Provinsi"],
                ["type", "Tipe rumah"],
                ["legal", "Legalitas"],
                ["occupancy", "Status hunian"],
                ["documents", "Status dokumen"],
                ["source", "Sumber lelang"],
              ] as const
            ).map(([field, label]) => (
              <label className="text-xs" key={field}>
                {label}
                <Input
                  className="mt-2"
                  value={project.property[field]}
                  maxLength={500}
                  onChange={(e) =>
                    update({
                      ...project,
                      property: { ...project.property, [field]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
            {(
              [
                ["auctionDate", "Tanggal lelang"],
                ["referenceDate", "Tanggal sumber data"],
              ] as const
            ).map(([field, label]) => (
              <label className="text-xs" key={field}>
                {label}
                <Input
                  type="date"
                  className="mt-2"
                  value={project.property[field]}
                  onChange={(e) =>
                    update({
                      ...project,
                      property: { ...project.property, [field]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
            {(
              [
                ["land", "Luas tanah", "m²"],
                ["building", "Luas bangunan", "m²"],
                ["limit", "Nilai limit lelang", "Rp"],
              ] as const
            ).map(([field, label, unit]) => (
              <NumberField
                key={field}
                label={label}
                unit={unit}
                value={project.property[field]}
                onChange={(value) =>
                  update({ ...project, property: { ...project.property, [field]: value } })
                }
              />
            ))}
          </div>
        </details>
        <FlippingOverview project={project} onNavigate={setTab} />
        <div className="risk-indicator mt-5 flex flex-wrap items-center justify-between gap-3 bg-warning-soft p-4 text-xs leading-6">
          <span className="flex items-center gap-2">
            <CircleAlert className="size-4 shrink-0 text-warning" />
            {unresolved
              ? `${unresolved} dari ${project.risks.length} risiko belum diverifikasi — jangan jadikan proyeksi sebagai keputusan final.`
              : "Semua pemeriksaan ditandai pengguna; bukan verifikasi resmi."}
          </span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="no-print"
            onClick={() => setTab("risks")}
          >
            Periksa risiko
            <ArrowRight />
          </Button>
        </div>
        {project.finance.purchase < project.property.limit && (
          <p role="alert" className="mt-3 text-xs text-destructive">
            Harga beli asumsi berada di bawah nilai limit lelang. Sesuaikan sebelum mempertimbangkan
            penawaran.
          </p>
        )}
        <section
          aria-labelledby="flipping-progress-title"
          className="no-print mt-6 rounded-lg border border-border bg-white p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="flipping-progress-title" className="text-sm font-semibold">
                Progres peninjauan tahapan
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Tandai tahap setelah Anda meninjau isinya. Bukan verifikasi resmi atau progres
                pekerjaan fisik.
              </p>
            </div>
            <strong className="text-sm tabular-nums">
              {reviewed}/{stages.length} tahap · {progressPercent}%
            </strong>
          </div>
          <div
            role="progressbar"
            aria-label="Progres peninjauan"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {stages.map((stage, index) => {
              const checked = Boolean(project.stageReviews?.[stage.id]);
              return (
                <div
                  key={stage.id}
                  className="flex items-center gap-2 rounded-md border border-border p-2"
                >
                  <button
                    type="button"
                    onClick={() => setTab(stage.id)}
                    className="min-w-0 flex-1 text-left text-xs font-medium hover:underline"
                    aria-label={`Buka tahap ${index + 1}: ${stage.label}`}
                  >
                    <span className="mr-1 text-muted-foreground">{index + 1}.</span>
                    {stage.label}
                  </button>
                  <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        update({
                          ...project,
                          stageReviews: {
                            ...project.stageReviews,
                            [stage.id]: event.target.checked,
                          },
                        })
                      }
                      className="size-4 accent-green-700"
                      aria-label={`Tandai ${stage.label} sudah ditinjau`}
                    />
                    <span>{checked ? "Ditinjau" : "Belum"}</span>
                  </label>
                </div>
              );
            })}
          </div>
        </section>
        <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-w-0">
            <section className="no-print mb-6 rounded-xl border border-border bg-card p-4 sm:p-5" aria-label="Tahapan flipping">
          <p className="text-sm font-semibold">Wizard flipping · Tiga tahap</p>
          <p className="mt-1 text-xs text-muted-foreground">Gunakan modul yang sudah tersedia. Semua perubahan tetap pada proyek yang sama.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {wizardSteps.map((step, index) => (
              <button key={step.title} type="button" onClick={() => wizardTab(index)}
                aria-current={activeWizardStep === index ? "step" : undefined}
                className={`rounded-lg border p-3 text-left transition-colors ${activeWizardStep === index ? "border-brand bg-brand-soft" : "border-border bg-background hover:border-brand"}`}>
                <span className="block text-sm font-semibold">{step.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{step.detail}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button type="button" size="sm" variant="outline" disabled={activeWizardStep === 0} onClick={() => wizardTab(activeWizardStep - 1)}>← Tahap sebelumnya</Button>
            <span className="text-xs text-muted-foreground">Tahap {activeWizardStep + 1} dari 3</span>
            <Button type="button" size="sm" disabled={activeWizardStep === 2} onClick={() => wizardTab(activeWizardStep + 1)}>Tahap berikutnya →</Button>
          </div>
        </section>
        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
              <div className="no-print max-w-full overflow-x-auto border-b border-border pb-2">
                <TabsList className="h-11 w-max justify-start gap-0 rounded-none bg-transparent p-0">
                  {[
                    [
                      "asset",
                      "Analisis Aset",
                      "bg-orange-100 text-orange-900 data-[state=active]:!bg-orange-600 data-[state=active]:!text-white dark:bg-orange-950 dark:text-orange-200",
                    ],
                    [
                      "market",
                      "Harga pasar",
                      "bg-cyan-100 text-cyan-900 data-[state=active]:!bg-cyan-700 data-[state=active]:!text-white dark:bg-cyan-950 dark:text-cyan-200",
                    ],
                    [
                      "risks",
                      "Dokumen & risiko",
                      "bg-red-100 text-red-900 data-[state=active]:!bg-red-600 data-[state=active]:!text-white dark:bg-red-950 dark:text-red-200",
                    ],
                    [
                      "rab",
                      "RAB renovasi",
                      "bg-green-100 text-green-900 data-[state=active]:!bg-green-700 data-[state=active]:!text-white dark:bg-green-950 dark:text-green-200",
                    ],
                    [
                      "analysis",
                      "Analisis investasi",
                      "bg-blue-100 text-blue-900 data-[state=active]:!bg-blue-600 data-[state=active]:!text-white dark:bg-blue-950 dark:text-blue-200",
                    ],
                    [
                      "scenarios",
                      "Skenario",
                      "bg-amber-100 text-amber-900 data-[state=active]:!bg-amber-600 data-[state=active]:!text-white dark:bg-amber-950 dark:text-amber-200",
                    ],
                    [
                      "timeline",
                      "Timeline",
                      "bg-indigo-100 text-indigo-900 data-[state=active]:!bg-indigo-600 data-[state=active]:!text-white dark:bg-indigo-950 dark:text-indigo-200",
                    ],
                    [
                      "photos",
                      "Foto & before-after",
                      "bg-purple-100 text-purple-900 data-[state=active]:!bg-purple-600 data-[state=active]:!text-white dark:bg-purple-950 dark:text-purple-200",
                    ],
                  ].filter(([value]) => (wizardSteps[activeWizardStep]?.tabs ?? []).some((item) => item === value)).map(([value = "", label, color]) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={`rounded-b-none rounded-t-lg border border-b-0 border-white/60 px-3 text-xs shadow-none first:rounded-tl-lg last:rounded-tr-lg ${color}`}
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <TabsContent forceMount value="asset" className="project-tab mt-6">
                <AssetAnalysis project={project} onChange={update} onNavigate={setTab} />
              </TabsContent>
              <TabsContent forceMount value="market" className="project-tab mt-6">
                <ProjectMarketAnalysis
                  project={project}
                  demo={demo}
                  onUseTarget={(sale) =>
                    update({ ...project, finance: { ...project.finance, sale } })
                  }
                />
              </TabsContent>
              <TabsContent forceMount value="risks" className="project-tab mt-6">
                <RiskEditor project={project} onChange={update} />
              </TabsContent>
              <TabsContent forceMount value="rab" className="project-tab mt-6">
                <RabEditor project={project} onChange={update} />
              </TabsContent>
              <TabsContent forceMount value="analysis" className="project-tab mt-6">
                <FinanceEditor project={project} onChange={update} />
              </TabsContent>
              <TabsContent forceMount value="scenarios" className="project-tab mt-6">
                <ScenarioEditor project={project} onChange={update} />
              </TabsContent>
              <TabsContent forceMount value="timeline" className="project-tab mt-6">
                <TimelineEditor project={project} onChange={update} />
              </TabsContent>
              <TabsContent forceMount value="photos" className="project-tab mt-6">
                {tab === "photos" && sample && sample.photos.length > 0 && (
                  <DemoPhotoGallery photos={sample.photos} />
                )}
                <PropertyPhotoWorkspace />
              </TabsContent>
            </Tabs>
          </div>
          <aside className="investment-summary result-panel min-w-0 p-5 lg:sticky lg:top-25">
            <p className="eyebrow text-brand">Ringkasan investasi</p>
            <h2 className="mt-4 text-xs text-muted-foreground">Proyeksi laba / rugi bersih</h2>
            <p
              data-testid="flipping-profit"
              className={`mt-2 break-words text-2xl font-semibold tabular-nums ${result.profit < 0 ? "text-destructive" : "text-brand-deep"}`}
            >
              {formatRupiah(result.profit)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-4 text-xs">
              <div>
                <p className="text-muted-foreground">ROI atas total biaya</p>
                <strong className="mt-1 block">{percent(result.roi)}</strong>
              </div>
              <div>
                <p className="text-muted-foreground">Margin penjualan</p>
                <strong className="mt-1 block">{percent(result.margin)}</strong>
              </div>
            </div>
            <dl className="mt-5 space-y-3 text-xs">
              {[
                ["Akuisisi", result.acquisition],
                ["↳ Bea lelang", result.auctionFee],
                ["↳ BPHTB asumsi", result.bphtb],
                ["Renovasi (RAB)", result.renovation],
                ["Holding", result.holding],
                ["↳ Bunga pendanaan", result.interest],
                ["↳ Carrying cost", result.carrying],
                ["Penjualan", result.selling],
                ["↳ Pajak penjual asumsi", result.sellerTax],
                ["↳ Komisi jual asumsi", result.sellerFee],
                ["Cadangan di luar RAB", project.finance.reserve],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="shrink-0 font-medium tabular-nums">
                    {formatRupiah(Number(value))}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-border pt-4 text-sm font-semibold">
                <dt>Total all-in</dt>
                <dd data-testid="flipping-all-in">{formatRupiah(result.allIn)}</dd>
              </div>
              <div className="border-t border-border pt-4">
                <dt>Break-even harga jual</dt>
                <dd className="mt-2 text-lg font-semibold">
                  {result.breakEven === null
                    ? "Tidak dapat tercapai"
                    : formatRupiah(Math.ceil(result.breakEven))}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
              Break-even memperhitungkan pajak dan komisi proporsional terhadap harga jual. Baris ↳
              adalah rincian, bukan biaya tambahan. Gabungan tarif jual ≥100% tidak memiliki
              break-even yang valid.
            </p>
          </aside>
        </div>
        <div className="mt-8 border-t border-border pt-5 text-xs leading-6 text-muted-foreground">
          <p>
            Estimasi berdasarkan input, bukan nasihat hukum, pajak, atau investasi. Tarif dan pihak
            pembayar wajib dikonfirmasi sesuai daerah serta ketentuan lelang. Keuntungan tidak
            dijamin. Angka demo fiktif; validasi harga, kondisi, dan seluruh dokumen sebelum
            membeli.
          </p>
          {!demo && (
            <p>
              Proyek pribadi: kolom yang belum diisi bukan hasil verifikasi. Rincian baru disimpan
              terpisah dan tidak mengganti total/status pada daftar proyek lama.
            </p>
          )}
        </div>
        <div className="no-print mt-6 flex flex-wrap justify-between gap-3">
          <Button asChild variant="ghost">
            <Link to="/pilih-aset">
              <ArrowLeft />
              Kembali ke aset
            </Link>
          </Button>
          {demo && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (window.confirm("Kembalikan semua perubahan demo ke contoh awal?"))
                  if (sample) update(sample.project);
              }}
            >
              <RotateCcw />
              Reset demo
            </Button>
          )}
        </div>
      </form>
    </main>
  );
}
