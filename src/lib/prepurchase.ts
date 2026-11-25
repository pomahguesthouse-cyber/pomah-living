import { z } from "zod";
export const categories = ["Kelayakan dasar", "Keunggulan", "Risiko"] as const;
export const criterionSchema = z.object({
  id: z.string().min(1).max(100), label: z.string().trim().min(1).max(200),
  category: z.enum(categories), weight: z.number().int().min(1).max(100),
  critical: z.boolean(), options: z.array(z.object({
    label: z.string().trim().min(1).max(100), score: z.number().min(0).max(100),
  })).min(2).max(10),
});
export const masterSchema = z.array(criterionSchema).min(1).max(100).refine(
  rows => new Set(rows.map(r => r.id)).size === rows.length &&
    rows.every(r => new Set(r.options.map(o => o.label)).size === r.options.length),
  "ID kriteria dan pilihan harus unik");
export type Criterion = z.infer<typeof criterionSchema>;
export const surveySchema = z.object({
  criteria: masterSchema,
  answers: z.record(z.string(), z.string().max(100)),
  notes: z.string().max(4000),
});
export type Survey = z.infer<typeof surveySchema>;
const make = (id: string, label: string, category: Criterion["category"], options: [string, number][], critical = false, weight = 1): Criterion =>
  ({ id, label, category, weight, critical, options: options.map(([label, score]) => ({ label, score })) });
const advantage = (id: string, label: string) => make(id, label, "Keunggulan", [["Ya",100],["Tidak",50]]);
const risk = (id: string, label: string, critical = false) => make(id, label, "Risiko", [["Ya",0],["Tidak",100]], critical, critical ? 3 : 1);
export const defaultCriteria: Criterion[] = [
  make("location","Jenis lingkungan","Kelayakan dasar",[["Perumahan",100],["Non-perumahan",75],["Perkampungan",75]]),
  make("road","Lebar jalan","Kelayakan dasar",[["Kurang dari 3 m",25],["3–5 m",75],["Lebih dari 5 m",100]],false,2),
  make("water","Kualitas air","Kelayakan dasar",[["Bersih",100],["Perlu filter",60],["Bermasalah",0]],false,2),
  advantage("corner","Posisi hook / rumah sudut"),
  advantage("park","Menghadap taman"),
  advantage("main-road","Jalan utama"),
  advantage("double-access","Dua akses jalan"),
  advantage("extra-land","Kelebihan luas tanah"),
  risk("rail","Dekat rel kereta api"),
  risk("river","Dekat bantaran sungai",true),
  risk("soil","Indikasi tanah bergerak / longsor",true),
  risk("flood","Rawan banjir",true),
  risk("sutet","Dekat SUTET"),
  risk("waste","Dekat tempat pembuangan sampah"),
  risk("noise","Dekat sumber kebisingan / polusi"),
];
export function evaluateSurvey(survey: Survey) {
  let points = 0, weight = 0, answered = 0;
  const critical: string[] = [], unknownCritical: string[] = [];
  for (const row of survey.criteria) {
    const answer = row.options.find(o => o.label === survey.answers[row.id]);
    if (!answer) { if (row.critical) unknownCritical.push(row.label); continue; }
    answered++;
    weight += row.weight;
    points += answer.score * row.weight;
    if (row.critical && answer.score < 100) critical.push(row.label);
  }
  const score = weight ? Math.round(points / weight) : null;
  const complete = answered === survey.criteria.length;
  const recommendation = critical.length ? "Perlu pemeriksaan teknis" : !complete ? "Survei belum lengkap" :
    (score ?? 0) >= 80 ? "Layak dipertimbangkan" : (score ?? 0) >= 60 ? "Perlu pertimbangan" : "Tidak direkomendasikan";
  return { score, complete, answered, critical, unknownCritical, recommendation };
}
