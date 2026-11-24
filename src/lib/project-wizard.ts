import { calculateFlipping, rabTotal, type FlippingProject } from "@/lib/flipping";
import { analyzeScenario, scenarioInputs } from "@/lib/scenarios";

export const projectTabs = [
  { id: "asset", label: "Analisis aset" },
  { id: "market", label: "Harga pasar" },
  { id: "risks", label: "Dokumen & risiko" },
  { id: "analysis", label: "Biaya perolehan & pendanaan" },
  { id: "rab", label: "RAB renovasi" },
  { id: "photos", label: "Foto & before-after" },
  { id: "timeline", label: "Timeline" },
  { id: "selling", label: "Biaya jual" },
  { id: "scenarios", label: "Skenario & laba" },
] as const;
export type ProjectTab = (typeof projectTabs)[number]["id"];

export const wizardSteps = [
  {
    id: "feasibility",
    title: "Kelayakan aset",
    detail: "Kondisi bangunan, harga pasar, dokumen dan risiko",
    tabs: ["asset", "market", "risks"],
  },
  {
    id: "acquisition",
    title: "Akuisisi",
    detail: "Harga beli, pajak, bea lelang, notaris dan pendanaan",
    tabs: ["analysis"],
  },
  {
    id: "renovation",
    title: "Renovasi",
    detail: "RAB pekerjaan, foto kondisi dan jadwal pelaksanaan",
    tabs: ["rab", "photos", "timeline"],
  },
  {
    id: "sale",
    title: "Penjualan",
    detail: "Biaya jual, skenario harga dan laba bersih",
    tabs: ["selling", "scenarios"],
  },
] as const satisfies readonly {
  id: string;
  title: string;
  detail: string;
  tabs: readonly ProjectTab[];
}[];
export type WizardStepId = (typeof wizardSteps)[number]["id"];

const tabOrder: ProjectTab[] = wizardSteps.flatMap((step) => [...step.tabs]);

export function isProjectTab(value: string): value is ProjectTab {
  return projectTabs.some((tab) => tab.id === value);
}

/** Indeks tahap wizard yang memuat tab ini; setiap tab hanya ada di satu tahap. */
export function stepIndexOfTab(tab: ProjectTab): number {
  const index = wizardSteps.findIndex((step) => (step.tabs as readonly string[]).includes(tab));
  return index < 0 ? 0 : index;
}

export function tabLabel(tab: ProjectTab): string {
  return projectTabs.find((item) => item.id === tab)?.label ?? tab;
}

/** Tab berikutnya dalam urutan seluruh wizard, atau null di tab terakhir. */
export function nextTab(tab: ProjectTab): ProjectTab | null {
  const index = tabOrder.indexOf(tab);
  return index >= 0 && index < tabOrder.length - 1 ? (tabOrder[index + 1] ?? null) : null;
}

export function previousTab(tab: ProjectTab): ProjectTab | null {
  const index = tabOrder.indexOf(tab);
  return index > 0 ? (tabOrder[index - 1] ?? null) : null;
}

// ---------------------------------------------------------------------------
// Status otomatis per tahap
// ---------------------------------------------------------------------------

export type StepCheck = {
  id: string;
  label: string;
  ok: boolean;
  /** Gagal pada cek kritis menandai tahap "perlu perhatian", bukan sekadar belum lengkap. */
  critical?: boolean;
  detail?: string;
  tab: ProjectTab;
};
export type StepStatus = "done" | "todo" | "attention";
export type StepEvaluation = {
  id: WizardStepId;
  status: StepStatus;
  checks: StepCheck[];
  passed: number;
};

function scenarioProfit(project: FlippingProject, index: number) {
  if (!project.scenarios[index]) return null;
  return analyzeScenario(project, index).result.profit;
}

function checksFor(step: WizardStepId, project: FlippingProject): StepCheck[] {
  const { finance, property } = project;
  switch (step) {
    case "feasibility": {
      const unchecked = project.assetAssessments.filter(
        (item) => item.condition === "Belum diperiksa",
      ).length;
      const serious = project.assetAssessments.filter(
        (item) =>
          item.condition === "Perlu perbaikan besar" ||
          item.condition === "Perlu pemeriksaan lanjutan",
      ).length;
      const openRisks = project.risks.filter((risk) => !risk.verified).length;
      return [
        {
          id: "assessment",
          label: "Kondisi bangunan diperiksa",
          ok: unchecked === 0,
          ...(unchecked ? { detail: `${unchecked} bagian belum diperiksa` } : {}),
          tab: "asset",
        },
        {
          id: "serious",
          label: "Temuan berat sudah masuk RAB",
          ok: serious === 0 || rabTotal(project.rab) > 0,
          ...(serious
            ? { detail: `${serious} bagian perlu perbaikan besar/pemeriksaan lanjutan` }
            : {}),
          tab: "asset",
        },
        {
          id: "sale",
          label: "Target harga jual diisi",
          ok: finance.sale > 0,
          tab: "market",
        },
        {
          id: "risks",
          label: "Semua risiko diverifikasi",
          ok: openRisks === 0,
          ...(openRisks
            ? { detail: `${openRisks} dari ${project.risks.length} belum diverifikasi` }
            : {}),
          tab: "risks",
        },
      ];
    }
    case "acquisition":
      return [
        { id: "limit", label: "Nilai limit lelang diisi", ok: property.limit > 0, tab: "analysis" },
        {
          id: "purchase",
          label: "Harga beli tidak di bawah limit",
          ok: finance.purchase > 0 && finance.purchase >= property.limit,
          critical: finance.purchase > 0 && finance.purchase < property.limit,
          tab: "analysis",
        },
        {
          id: "notary",
          label: "Biaya notaris/balik nama diisi",
          ok: finance.notary > 0,
          tab: "analysis",
        },
        {
          id: "months",
          label: "Durasi kepemilikan diisi",
          ok: finance.months > 0,
          tab: "analysis",
        },
      ];
    case "renovation": {
      const undated = project.timeline.filter((item) => !item.date).length;
      const contingency = project.rab
        .filter((item) => item.group === "Contingency")
        .reduce((sum, item) => sum + item.volume * item.price, 0);
      return [
        { id: "rab", label: "RAB renovasi terisi", ok: rabTotal(project.rab) > 0, tab: "rab" },
        {
          id: "contingency",
          label: "Ada cadangan biaya renovasi",
          ok: contingency > 0 || finance.reserve > 0,
          tab: "rab",
        },
        {
          id: "timeline",
          label: "Jadwal timeline diisi",
          ok: project.timeline.length > 0 && undated === 0,
          ...(undated ? { detail: `${undated} tahapan belum bertanggal` } : {}),
          tab: "timeline",
        },
      ];
    }
    case "sale": {
      const profit = calculateFlipping(finance, project.rab).profit;
      const pessimistic = scenarioProfit(project, 0);
      return [
        {
          id: "scenarios",
          label: "Harga jual tiap skenario diisi",
          ok: project.scenarios.every((_, index) => scenarioInputs(project, index).sale > 0),
          tab: "scenarios",
        },
        {
          id: "selling",
          label: "Biaya jual diisi",
          ok: finance.sellerFeeRate > 0 || finance.sellerTaxRate > 0 || finance.marketing > 0,
          tab: "selling",
        },
        {
          id: "profit",
          label: "Proyeksi laba positif",
          ok: profit > 0,
          critical: finance.sale > 0 && profit <= 0,
          tab: "scenarios",
        },
        {
          id: "pessimistic",
          label: "Skenario pesimis tidak rugi",
          ok: pessimistic !== null && pessimistic >= 0,
          tab: "scenarios",
        },
      ];
    }
  }
}

export function evaluateStep(step: WizardStepId, project: FlippingProject): StepEvaluation {
  const checks = checksFor(step, project);
  const passed = checks.filter((check) => check.ok).length;
  const status: StepStatus =
    passed === checks.length
      ? "done"
      : checks.some((check) => !check.ok && check.critical)
        ? "attention"
        : "todo";
  return { id: step, status, checks, passed };
}

export function evaluateWizard(project: FlippingProject): StepEvaluation[] {
  return wizardSteps.map((step) => evaluateStep(step.id, project));
}
