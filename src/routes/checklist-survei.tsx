import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/checklist-survei")({ component: ChecklistSurvei });

const criteria = [
  ["legalitas", "Legalitas", "Dokumen kepemilikan dan status sengketa"],
  ["struktur", "Kondisi bangunan", "Struktur, atap, dinding, dan lantai"],
  ["utilitas", "Kondisi bangunan", "Listrik, air, sanitasi, dan drainase"],
  ["akses", "Lokasi", "Akses jalan dan lingkungan"],
  ["tol", "Aksesibilitas", "Jarak ke pintu tol (km)"],
  ["stasiun", "Aksesibilitas", "Jarak ke stasiun kereta (km)"],
  ["pasar", "Potensi investasi", "Harga pembanding dan potensi jual kembali"],
] as const;
type Answer = { status: string; notes: string };
type Survey = { surveyCompleted: boolean; finalized: boolean; answers: Record<string, Answer> };
const empty = (): Survey => ({ surveyCompleted: false, finalized: false, answers: {} });

function ChecklistSurvei() {
  const [id, setId] = useState("demo");
  const [survey, setSurvey] = useState<Survey>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const propertyId = new URLSearchParams(window.location.search).get("propertyId") || "demo";
    setId(propertyId);
    try {
      const saved = localStorage.getItem("pomah-checklist:" + propertyId);
      if (saved) setSurvey(JSON.parse(saved) as Survey);
    } catch { /* storage may be disabled */ }
    setReady(true);
  }, []);
  function update(next: Survey) {
    setSurvey(next);
    try { localStorage.setItem("pomah-checklist:" + id, JSON.stringify(next)); }
    catch { /* draft remains in memory */ }
  }
  const completed = criteria.filter(([key]) => survey.answers[key]?.status && survey.answers[key].status !== "belum").length;
  return <main className="mx-auto max-w-3xl px-4 py-10">
    <a href="/pilih-aset" className="text-sm underline">← Kembali ke properti</a>
    <h1 className="mt-6 text-3xl font-bold">Checklist Hasil Survei</h1>
    <p className="mt-2 text-muted-foreground">Properti: {id}. Checklist dapat diisi melalui HP saat survei dan difinalisasi setelah survei selesai.</p>
    <section className="my-6 rounded-xl border p-4">
      <p className="font-medium">Pencarian → Analisis Awal → Survei → Checklist → Analisis Kelayakan</p>
      <p className="mt-2 text-sm">Terisi {completed}/{criteria.length} · {survey.finalized ? "Final" : "Draft tersimpan di perangkat ini"}</p>
      <label className="mt-3 flex gap-2"><input type="checkbox" checked={survey.surveyCompleted} disabled={!ready || survey.finalized} onChange={e => update({ ...survey, surveyCompleted: e.target.checked })}/> Survei lapangan selesai</label>
    </section>
    <div className="space-y-4">{criteria.map(([key, group, label]) => {
      const answer = survey.answers[key] || { status: "belum", notes: "" };
      const change = (next: Answer) => update({ ...survey, answers: { ...survey.answers, [key]: next } });
      return <section key={key} className="rounded-xl border p-4">
        <p className="text-xs uppercase text-muted-foreground">{group}</p>
        <h2 className="mt-1 font-semibold">{label}</h2>
        <select aria-label={"Penilaian " + label} className="mt-3 w-full rounded-md border bg-background p-2" disabled={survey.finalized} value={answer.status} onChange={e => change({ ...answer, status: e.target.value })}>
          <option value="belum">Belum diperiksa</option><option value="baik">Baik / sesuai</option><option value="perlu-perbaikan">Perlu perbaikan / perhatian</option><option value="tidak-sesuai">Tidak sesuai</option>
        </select>
        <textarea aria-label={"Catatan " + label} placeholder={key === "tol" || key === "stasiun" ? "Isi jarak dalam km dan sumber pengukuran" : "Catatan temuan survei"} className="mt-2 w-full rounded-md border bg-background p-2" rows={2} disabled={survey.finalized} value={answer.notes} onChange={e => change({ ...answer, notes: e.target.value })}/>
      </section>;
    })}</div>
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" className="rounded-md border px-4 py-2" disabled={survey.finalized} onClick={() => update({ ...survey })}>Simpan draft</button>
      <button type="button" className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={!ready || !survey.surveyCompleted || completed !== criteria.length || survey.finalized} onClick={() => update({ ...survey, finalized: true })}>Finalisasi checklist</button>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">Versi awal: draft tersimpan hanya pada browser/perangkat ini, belum tersinkron ke akun atau database. Analisis kelayakan dilakukan setelah checklist final.</p>
  </main>;
}
