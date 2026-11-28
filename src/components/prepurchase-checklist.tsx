import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, evaluateSurvey, masterSchema, type Criterion, type Survey } from "@/lib/prepurchase";
import { fetchCriteria, saveCriteria, prepurchaseKey } from "@/services/prepurchase-service";
import { adminError } from "@/services/admin-service";

export function PrepurchaseChecklist({ survey, onChange, children, photos }: { survey?: Survey | undefined; onChange: (survey: Survey) => void; children?: ReactNode; photos?: ReactNode }) {
  const query = useQuery({ queryKey: prepurchaseKey, queryFn: fetchCriteria, enabled: !survey });
  const current = survey ?? (query.data ? { criteria: query.data, answers: {}, notes: "" } : undefined);
  if (!current) return <>{photos}<section className="rounded-xl border p-4"><h2 className="font-semibold">Checklist pra-pembelian</h2><p role="status">{query.isError ? "Master checklist gagal dimuat." : "Memuat checklist…"}</p>{query.isError && <Button type="button" onClick={() => void query.refetch()}>Coba lagi</Button>}</section>{children}</>;
  const result = evaluateSurvey(current);
  const groups = [
    { title: "Utilitas dan fasilitas penunjang", matches: (row: Criterion) => row.category === "Kelayakan dasar" && (["water","water-source"].includes(row.id) || /kualitas air|sumber air|air bersih|listrik|sanitasi|drainase|septic|internet|plumbing/i.test(row.label)) },
    { title: "Lokasi dan lingkungan", matches: (row: Criterion) => row.category === "Kelayakan dasar" && row.id !== "water" && !/legal|sertifikat|penghuni|sengketa|struktur|bangunan|atap|listrik|sanitasi/i.test(row.label) },
    { title: "Kondisi fisik bangunan", matches: (row: Criterion) => row.category === "Kelayakan dasar" && (row.id === "water" || /struktur|bangunan|atap|listrik|sanitasi/i.test(row.label)) },
    { title: "Potensi nilai jual", matches: (row: Criterion) => row.category === "Keunggulan" },
    { title: "Legalitas dan penguasaan aset", matches: (row: Criterion) => row.category === "Kelayakan dasar" && /legal|sertifikat|penghuni|sengketa/i.test(row.label) },
    { title: "Risiko properti", matches: (row: Criterion) => row.category === "Risiko" },
  ];
  const grouped = groups.map((group, index) => ({ ...group, rows: current.criteria.filter(row => groups.findIndex(candidate => candidate.matches(row)) === index) }));
  return <div className="space-y-3">
    <details open className="rounded-lg border border-border bg-card p-3">
      <summary className="cursor-pointer text-sm font-semibold">2. Hasil survei lapangan</summary>
      <p className="my-2 text-xs text-muted-foreground">Isi foto, kondisi aset dan temuan setelah survei lapangan. Jawaban yang belum diketahui tidak dianggap aman.</p>
      {photos}
      <h3 className="mt-3 text-sm font-semibold">Checklist kondisi aset</h3>
      {grouped.map(group => <details key={group.title} className="border-t py-2"><summary className="cursor-pointer text-sm font-medium">{group.title} · {group.rows.filter(row => current.answers[row.id]).length}/{group.rows.length}</summary>
        {group.rows.length === 0 && <p className="mt-1 text-xs text-muted-foreground">Belum ada kriteria pada master checklist. Periksa juga dokumen dan analisis aset.</p>}
        {group.rows.map(row => <label key={row.id} className="grid items-center gap-1 py-1 text-xs sm:grid-cols-2"><span>{row.id === "water" ? "Kondisi air bersih" : row.label}{row.critical ? " · Risiko kritis" : ""}</span><select className="min-w-0 rounded-md border bg-background px-2 py-1 text-xs" value={current.answers[row.id] ?? ""} onChange={e => onChange({...current, answers: {...current.answers, [row.id]: e.target.value}})}><option value="">Belum diidentifikasi</option>{row.options.map(option => <option key={option.label} value={option.label}>{option.label}</option>)}</select></label>)}
      </details>)}
      <label className="block text-xs">Catatan survei<textarea className="mt-1 w-full rounded-md border bg-background p-2" rows={2} maxLength={4000} value={current.notes} onChange={e => onChange({...current, notes: e.target.value})} /></label>
      <div className="mt-3">{children}</div>
    </details>
    <details open className="rounded-lg border border-border bg-card p-3"><summary className="cursor-pointer text-sm font-semibold">3. Kesimpulan kelayakan aset</summary><div className="mt-2" aria-live="polite"><p className="font-semibold">{result.recommendation}</p><p className="text-sm">Skor {result.complete ? "" : "sementara "}: {result.score ?? "—"}/100 · {result.answered}/{current.criteria.length} terisi</p>{result.critical.length > 0 && <p className="text-sm text-destructive">Risiko kritis: {result.critical.join(", ")}</p>}{result.unknownCritical.length > 0 && <p className="text-sm">Risiko kritis belum diperiksa: {result.unknownCritical.join(", ")}</p>}<p className="mt-2 text-xs text-muted-foreground">Skor hanya berdasarkan checklist, bukan jaminan kelayakan pembelian. Verifikasi legalitas, struktur dan risiko teknis secara terpisah.</p></div></details>
  </div>;
}
export function AdminPrepurchase() {
  const query = useQuery({ queryKey: prepurchaseKey, queryFn: fetchCriteria });
  if (query.isPending) return <p role="status">Memuat master checklist…</p>;
  if (query.isError) return <p role="alert">{adminError(query.error)}</p>;
  return <MasterEditor initial={query.data} />;
}
function MasterEditor({ initial }: { initial: Criterion[] }) {
  const [rows, setRows] = useState(initial);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const client = useQueryClient();
  const edit = (id:string, patch:Partial<Criterion>) => setRows(old => old.map(row => row.id === id ? {...row,...patch} : row));
  async function save() {
    setBusy(true); setMessage("");
    try { await saveCriteria(masterSchema.parse(rows)); await client.invalidateQueries({queryKey:prepurchaseKey}); setMessage("Master checklist tersimpan."); } catch(e) {setMessage(adminError(e));} finally {setBusy(false);}
  }
  return <section className="mt-8 space-y-4"><h2 className="text-xl font-semibold">Master checklist pra-pembelian</h2><p className="text-sm text-muted-foreground">Perubahan berlaku untuk survei baru. Survei yang sudah diisi mempertahankan kriteria awalnya.</p><fieldset disabled={busy} className="space-y-4">{rows.map(row => <article className="space-y-3 rounded-xl border p-4" key={row.id}>
    <label className="block text-sm">Kriteria<Input value={row.label} onChange={e=>edit(row.id,{label:e.target.value})}/></label>
    <div className="flex flex-wrap gap-3"><label className="text-sm">Kategori<select className="block rounded border bg-background p-2" value={row.category} onChange={e=>edit(row.id,{category:e.target.value as Criterion["category"]})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="text-sm">Bobot<Input disabled={row.id === "water-source"} type="number" min={1} max={100} value={row.weight} onChange={e=>edit(row.id,{weight:Number(e.target.value)})}/></label><label className="self-end text-sm"><input type="checkbox" checked={row.critical} onChange={e=>edit(row.id,{critical:e.target.checked})}/> Risiko kritis</label></div>
    {row.options.map((option,i)=><div key={i} className="flex flex-wrap items-end gap-2"><label className="flex-1 text-sm">Pilihan<Input value={option.label} onChange={e=>edit(row.id,{options:row.options.map((o,j)=>j===i?{...o,label:e.target.value}:o)})}/></label><label className="w-24 text-sm">Skor<Input disabled={row.id === "water-source"} type="number" min={0} max={100} value={option.score} onChange={e=>edit(row.id,{options:row.options.map((o,j)=>j===i?{...o,score:Number(e.target.value)}:o)})}/></label><Button type="button" variant="outline" disabled={row.options.length<=2} onClick={()=>edit(row.id,{options:row.options.filter((_,j)=>j!==i)})}>Hapus pilihan</Button></div>)}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={row.options.length>=10} onClick={()=>edit(row.id,{options:[...row.options,{label:"Pilihan baru",score:50}]})}>Tambah pilihan</Button><Button type="button" variant="outline" disabled={rows.length<=1} onClick={()=>setRows(old=>old.filter(r=>r.id!==row.id))}>Hapus kriteria</Button></div></article>)}
    <div className="flex gap-2"><Button type="button" variant="outline" disabled={rows.length>=100} onClick={()=>setRows(old=>[...old,{id:crypto.randomUUID(),label:"Kriteria baru",category:"Kelayakan dasar",weight:1,critical:false,options:[{label:"Ya",score:100},{label:"Tidak",score:0}]}])}>Tambah kriteria</Button><Button type="button" onClick={()=>void save()}>Simpan master</Button></div></fieldset><p role="status">{message}</p></section>;
}
