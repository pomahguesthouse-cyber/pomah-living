import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, evaluateSurvey, masterSchema, type Criterion, type Survey } from "@/lib/prepurchase";
import { fetchCriteria, saveCriteria, prepurchaseKey } from "@/services/prepurchase-service";
import { adminError } from "@/services/admin-service";

export function PrepurchaseChecklist({ survey, onChange }: { survey?: Survey; onChange: (survey: Survey) => void }) {
  const query = useQuery({ queryKey: prepurchaseKey, queryFn: fetchCriteria, enabled: !survey });
  const current = survey ?? (query.data ? { criteria: query.data, answers: {}, notes: "" } : undefined);
  if (!current) return <section className="rounded-xl border p-4"><h2 className="font-semibold">Checklist pra-pembelian</h2><p role="status">{query.isError ? "Master checklist gagal dimuat." : "Memuat checklist…"}</p>{query.isError && <Button type="button" onClick={() => void query.refetch()}>Coba lagi</Button>}</section>;
  const result = evaluateSurvey(current);
  return <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
    <h2 className="text-xl font-semibold">Checklist pra-pembelian aset</h2>
    <p className="text-sm text-muted-foreground">Isi berdasarkan survei lapangan sebelum merencanakan renovasi. Jawaban yang belum diketahui tidak dianggap aman.</p>
    {categories.map(category => <fieldset key={category} className="space-y-3"><legend className="font-semibold">{category}</legend>{current.criteria.filter(row => row.category === category).map(row => <label key={row.id} className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2"><span>{row.label}{row.critical ? " · Risiko kritis" : ""}</span><select className="rounded-md border bg-background p-2" value={current.answers[row.id] ?? ""} onChange={e => onChange({...current, answers: {...current.answers, [row.id]: e.target.value}})}><option value="">Belum diverifikasi</option>{row.options.map(option => <option key={option.label} value={option.label}>{option.label}</option>)}</select></label>)}</fieldset>)}
    <label className="block text-sm">Catatan survei<textarea className="mt-2 w-full rounded-md border bg-background p-2" maxLength={4000} value={current.notes} onChange={e => onChange({...current, notes: e.target.value})} /></label>
    <div className="rounded-lg border p-4" aria-live="polite"><p className="font-semibold">{result.recommendation}</p><p className="text-sm">Skor {result.complete ? "" : "sementara "}: {result.score ?? "—"}/100 · {result.answered}/{current.criteria.length} terisi</p>{result.critical.length > 0 && <p className="text-sm text-destructive">Risiko kritis: {result.critical.join(", ")}</p>}{result.unknownCritical.length > 0 && <p className="text-sm">Risiko kritis belum diperiksa: {result.unknownCritical.join(", ")}</p>}<p className="mt-2 text-xs text-muted-foreground">Skor bukan jaminan kelayakan pembelian. Verifikasi legalitas, struktur dan risiko teknis secara terpisah.</p></div>
  </section>;
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
    <div className="flex flex-wrap gap-3"><label className="text-sm">Kategori<select className="block rounded border bg-background p-2" value={row.category} onChange={e=>edit(row.id,{category:e.target.value as Criterion["category"]})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="text-sm">Bobot<Input type="number" min={1} max={100} value={row.weight} onChange={e=>edit(row.id,{weight:Number(e.target.value)})}/></label><label className="self-end text-sm"><input type="checkbox" checked={row.critical} onChange={e=>edit(row.id,{critical:e.target.checked})}/> Risiko kritis</label></div>
    {row.options.map((option,i)=><div key={i} className="flex flex-wrap items-end gap-2"><label className="flex-1 text-sm">Pilihan<Input value={option.label} onChange={e=>edit(row.id,{options:row.options.map((o,j)=>j===i?{...o,label:e.target.value}:o)})}/></label><label className="w-24 text-sm">Skor<Input type="number" min={0} max={100} value={option.score} onChange={e=>edit(row.id,{options:row.options.map((o,j)=>j===i?{...o,score:Number(e.target.value)}:o)})}/></label><Button type="button" variant="outline" disabled={row.options.length<=2} onClick={()=>edit(row.id,{options:row.options.filter((_,j)=>j!==i)})}>Hapus pilihan</Button></div>)}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={row.options.length>=10} onClick={()=>edit(row.id,{options:[...row.options,{label:"Pilihan baru",score:50}]})}>Tambah pilihan</Button><Button type="button" variant="outline" disabled={rows.length<=1} onClick={()=>setRows(old=>old.filter(r=>r.id!==row.id))}>Hapus kriteria</Button></div></article>)}
    <div className="flex gap-2"><Button type="button" variant="outline" disabled={rows.length>=100} onClick={()=>setRows(old=>[...old,{id:crypto.randomUUID(),label:"Kriteria baru",category:"Kelayakan dasar",weight:1,critical:false,options:[{label:"Ya",score:100},{label:"Tidak",score:0}]}])}>Tambah kriteria</Button><Button type="button" onClick={()=>void save()}>Simpan master</Button></div></fieldset><p role="status">{message}</p></section>;
}
