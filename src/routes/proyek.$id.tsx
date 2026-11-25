import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  CircleAlert,
  FlaskConical,
  MapPin,
  Printer,
  Save,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { DemoPhotoGallery } from "@/components/demo-photo-gallery";
import { PropertyPhotoWorkspace } from "@/components/property-photo-workspace";
import { FlippingOverview } from "@/components/flipping-overview";
import { PropertySummaryEditor } from "@/components/property-summary-editor";
import { AssetAnalysis } from "@/components/asset-analysis";
import { ProjectPricing } from "@/components/project-pricing";
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
import {
  evaluateWizard,
  isProjectTab,
  nextTab,
  previousTab,
  stepIndexOfTab,
  tabLabel,
  wizardSteps,
  type ProjectTab,
  type StepEvaluation,
} from "@/lib/project-wizard";
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
  // ?tab=market membuka langsung tab tertentu, misalnya dari halaman analisis aset.
  validateSearch: (search: Record<string, unknown>): { tab?: ProjectTab } =>
    typeof search["tab"] === "string" && isProjectTab(search["tab"]) ? { tab: search["tab"] } : {},
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const initialTab = Route.useSearch().tab;
  const [tab, setTab] = useState<ProjectTab>(initialTab ?? "asset");
  const wizardRef = useRef<HTMLElement>(null);
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
  const activeWizardStep = stepIndexOfTab(tab);
  const goToTab = (next: string, scroll = false) => {
    if (!isProjectTab(next)) return;
    setTab(next);
    if (scroll) wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const upcoming = nextTab(tab);
  const earlier = previousTab(tab);
  const result = calculateFlipping(project.finance, project.rab);
  const evaluations = evaluateWizard(project);
  const readySteps = evaluations.filter((item) => item.status === "done").length;
  const activeEvaluation = evaluations[activeWizardStep];
  const openChecks = activeEvaluation?.checks.filter((check) => !check.ok) ?? [];
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
            {!demo && userId && (
              <DeleteProjectDialog
                projectId={id}
                projectName={project.property.name}
                userId={userId}
                onDeleted={() => {
                  removeProject(key);
                  void queryClient.invalidateQueries({ queryKey: ["pomah-projects", userId] });
                  void navigate({ to: "/profil", hash: "proyek-saya", replace: true });
                }}
              />
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
              fiktif. Sumber: simulasi internal Pomah Living. Tanggal contoh: 20 November 2026.
              Bukan penawaran lelang atau jaminan profit.
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
        <PropertySummaryEditor
          property={project.property}
          onChange={(property) => update({ ...project, property })}
        />
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
            onClick={() => goToTab("risks", true)}
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
        <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-w-0">
            <section
              ref={wizardRef}
              className="no-print mb-6 scroll-mt-24 rounded-xl border border-border bg-card p-4 sm:p-5"
              aria-label="Tahapan proyek flipping"
              data-testid="project-wizard"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Tahapan proyek</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ikuti dari kiri ke kanan. Status dihitung otomatis dari data proyek.
                  </p>
                </div>
                <strong className="text-sm tabular-nums" data-testid="wizard-ready">
                  {readySteps}/{wizardSteps.length} tahap siap
                </strong>
              </div>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {wizardSteps.map((step, index) => (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => goToTab(step.tabs[0])}
                      aria-current={activeWizardStep === index ? "step" : undefined}
                      className={`h-full w-full rounded-lg border p-3 text-left transition-colors ${activeWizardStep === index ? "border-brand bg-brand-soft" : "border-border bg-background hover:border-brand"}`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {index + 1}. {step.title}
                        </span>
                        <StepStatusBadge evaluation={evaluations[index]} />
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {step.detail}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {activeEvaluation && (
                <div
                  className={`mt-4 rounded-md p-3 text-xs ${activeEvaluation.status === "done" ? "bg-success-soft text-success" : activeEvaluation.status === "attention" ? "bg-danger-soft text-destructive" : "bg-muted text-foreground"}`}
                  data-testid="wizard-checks"
                >
                  {openChecks.length === 0 ? (
                    <p className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Tahap {wizardSteps[activeWizardStep]?.title.toLowerCase()} sudah lengkap.
                    </p>
                  ) : (
                    <>
                      <p className="font-medium">
                        Yang perlu dilengkapi di tahap ini ({activeEvaluation.passed}/
                        {activeEvaluation.checks.length} terpenuhi):
                      </p>
                      <ul className="mt-2 space-y-1">
                        {openChecks.map((check) => (
                          <li key={check.id} className="flex flex-wrap items-center gap-x-2">
                            {check.critical ? (
                              <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                            ) : (
                              <Circle className="size-3.5 shrink-0" aria-hidden="true" />
                            )}
                            <button
                              type="button"
                              className="font-medium underline-offset-2 hover:underline"
                              onClick={() => goToTab(check.tab)}
                            >
                              {check.label}
                            </button>
                            {check.detail && (
                              <span className="text-muted-foreground">· {check.detail}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </section>
            <Tabs value={tab} onValueChange={(value) => goToTab(value)} className="min-w-0">
              <div className="no-print max-w-full overflow-x-auto border-b border-border pb-2">
                <TabsList className="h-11 w-max justify-start gap-1 rounded-none bg-transparent p-0">
                  {wizardSteps[activeWizardStep]?.tabs.map((value) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="rounded-b-none rounded-t-lg border border-b-0 border-border bg-muted px-3 text-xs text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:bg-brand data-[state=active]:text-white"
                    >
                      {tabLabel(value)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <TabsContent forceMount value="asset" className="project-tab mt-6">
                <AssetAnalysis
                  project={project}
                  onChange={update}
                  onNavigate={(next) => goToTab(next)}
                />
              </TabsContent>
              <TabsContent forceMount value="market" className="project-tab mt-6">
                <ProjectPricing project={project} demo={demo} onChange={update} />
              </TabsContent>
              <TabsContent forceMount value="risks" className="project-tab mt-6">
                <RiskEditor project={project} onChange={update} />
              </TabsContent>
              <TabsContent forceMount value="rab" className="project-tab mt-6">
                <RabEditor project={project} onChange={update} />
              </TabsContent>
              <TabsContent forceMount value="analysis" className="project-tab mt-6">
                <FinanceEditor
                  project={project}
                  onChange={update}
                  groups={["Akuisisi", "Holding"]}
                />
              </TabsContent>
              <TabsContent forceMount value="selling" className="project-tab mt-6">
                <FinanceEditor
                  project={project}
                  onChange={update}
                  groups={["Penjualan & cadangan"]}
                />
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
            <div className="no-print mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              {earlier ? (
                <Button type="button" variant="outline" onClick={() => goToTab(earlier, true)}>
                  <ArrowLeft /> {tabLabel(earlier)}
                </Button>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                Tahap {activeWizardStep + 1} dari {wizardSteps.length} ·{" "}
                {wizardSteps[activeWizardStep]?.title}
              </span>
              {upcoming ? (
                <Button type="button" onClick={() => goToTab(upcoming, true)}>
                  Lanjut: {tabLabel(upcoming)} <ArrowRight />
                </Button>
              ) : (
                <span className="text-xs font-medium text-brand-deep">
                  Semua tahap telah dilalui
                </span>
              )}
            </div>
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
        <FlippingOverview project={project} onNavigate={(next) => goToTab(next, true)} />
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

function StepStatusBadge({ evaluation }: { evaluation: StepEvaluation | undefined }) {
  if (!evaluation) return null;
  if (evaluation.status === "done")
    return (
      <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-success">
        <CheckCircle2 className="size-3.5" aria-hidden="true" /> Siap
      </span>
    );
  if (evaluation.status === "attention")
    return (
      <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-destructive">
        <CircleAlert className="size-3.5" aria-hidden="true" /> Perhatian
      </span>
    );
  return (
    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
      {evaluation.passed}/{evaluation.checks.length}
    </span>
  );
}
