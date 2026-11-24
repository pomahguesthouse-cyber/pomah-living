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
