import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

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
  const { session, ready: authReady } = useSession();
  const userId = session?.user.id;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [survey, setSurvey] = useState<Survey>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!authReady) return;
    const propertyId = new URLSearchParams(window.location.search).get("propertyId") || "demo";
    setId(propertyId);
    if (!userId) { setReady(true); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("flipper_survey_checklists" as never)
        .select("survey_completed,status,answers").eq("flipper_id", userId)
        .eq("property_id", propertyId).maybeSingle();
      if (cancelled) return;
      if (error) setMessage("Gagal memuat checklist: " + error.message);
      else if (data) {
        const row = data as { survey_completed: boolean; status: string; answers: Record<string, Answer> };
        setSurvey({ surveyCompleted: row.survey_completed, finalized: row.status === "final", answers: row.answers || {} });
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [userId, authReady]);
  async function update(next: Survey) {
    if (!userId || saving || survey.finalized) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("flipper_survey_checklists" as never).upsert({
      flipper_id: userId, property_id: id, survey_completed: next.surveyCompleted,
      status: next.finalized ? "final" : "draft", answers: next.answers,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: "flipper_id,property_id" });
    setSaving(false);
    if (error) setMessage("Gagal menyimpan: " + error.message);
    else { setSurvey(next); setMessage(next.finalized ? "Checklist berhasil difinalisasi." : "Draft tersimpan di database."); }
  }
  const completed = criteria.filter(([key]) => survey.answers[key]?.status && survey.answers[key].status !== "belum").length;
  return <main className="mx-auto max-w-3xl px-4 py-10">
    <a href="/pilih-aset" className="text-sm underline">← Kembali ke properti</a>
    <h1 className="mt-6 text-3xl font-bold">Checklist Hasil Survei</h1>
    <p className="mt-2 text-muted-foreground">Properti: {id}. Checklist dapat diisi melalui HP saat survei dan difinalisasi setelah survei selesai.</p>
    <section className="my-6 rounded-xl border p-4">
      <p className="font-medium">Pencarian → Analisis Awal → Survei → Checklist → Analisis Kelayakan</p>
      <p className="mt-2 text-sm">Terisi {completed}/{criteria.length} · {survey.finalized ? "Final" : "Draft tersimpan di database"}</p>
      <label className="mt-3 flex gap-2"><input type="checkbox" checked={survey.surveyCompleted} disabled={!ready || !userId || saving || survey.finalized} onChange={e => update({ ...survey, surveyCompleted: e.target.checked })}/> Survei lapangan selesai</label>
    </section>
    <div className="grid gap-2 sm:grid-cols-2">{criteria.map(([key, group, label]) => {
      const answer = survey.answers[key] || { status: "belum", notes: "" };
      const change = (next: Answer) => update({ ...survey, answers: { ...survey.answers, [key]: next } });
      return <section key={key} className="rounded-xl border p-4">
        <p className="text-xs uppercase text-muted-foreground">{group}</p>
        <h2 className="mt-0.5 text-sm font-semibold leading-5">{label}</h2>
        <select aria-label={"Penilaian " + label} className="mt-2 w-full rounded-md border bg-background px-2 py-1.5 text-sm" disabled={!userId || saving || survey.finalized} value={answer.status} onChange={e => change({ ...answer, status: e.target.value })}>
          <option value="belum">Belum diperiksa</option><option value="baik">Baik / sesuai</option><option value="perlu-perbaikan">Perlu perbaikan / perhatian</option><option value="tidak-sesuai">Tidak sesuai</option>
        </select>
        <textarea aria-label={"Catatan " + label} placeholder={key === "tol" || key === "stasiun" ? "Isi jarak dalam km dan sumber pengukuran" : "Catatan temuan survei"} className="mt-1.5 w-full resize-y rounded-md border bg-background px-2 py-1.5 text-sm" rows={1} disabled={survey.finalized} value={answer.notes} onChange={e => change({ ...answer, notes: e.target.value })}/>
      </section>;
    })}</div>
    {!userId && <p className="mt-4 text-sm text-destructive">Login sebagai Flipper untuk menyimpan checklist.</p>}
    {message && <p role="status" className="mt-4 text-sm">{message}</p>}
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" className="rounded-md border px-4 py-2" disabled={survey.finalized} onClick={() => update({ ...survey })}>Simpan draft</button>
      <button type="button" className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={!ready || !userId || saving || !survey.surveyCompleted || completed !== criteria.length || survey.finalized} onClick={() => update({ ...survey, finalized: true })}>Finalisasi checklist</button>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">Checklist tersimpan pada akun Flipper di database. Analisis kelayakan dilakukan setelah checklist final.</p>
  </main>;
}
