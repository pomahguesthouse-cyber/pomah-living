import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
const db = supabase as unknown as SupabaseClient;
const bucket = db.storage.from("project-photos");
type Stage = "before" | "progress" | "after";
type Photo = {id:string; object_path:string; name:string; area:string; notes:string; created_at:string; url?:string};
const labels = {before:"Foto survei",progress:"Foto progres renovasi",after:"Foto hasil akhir"};
const areas = ["Fasad","Atap","Struktur","Dinding","Lantai","Plafon","Dapur","Kamar mandi","Listrik / plumbing","Lainnya"];
export function PrivateProjectPhotos({projectId,userId,stage}:{projectId:string;userId:string;stage:Stage}) {
 const client=useQueryClient();
 const key=["private-project-photos",userId,projectId,stage];
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const query=useQuery({queryKey:key,queryFn:async()=>{
  const {data,error}=await db.from("pomah_project_photos").select("id,object_path,name,area,notes,created_at").eq("project_id",projectId).eq("owner_id",userId).eq("stage",stage).order("created_at",{ascending:false});
  if(error)throw error;
  return Promise.all((data as Photo[]).map(async p=>{const signed=await bucket.createSignedUrl(p.object_path,3600);return {...p,url:signed.data?.signedUrl};}));
 },staleTime:300000,refetchInterval:1800000});
 async function upload(files:FileList|null){
  if(!files||busy)return;
  setBusy(true);setMessage("");
  let success=0;const failures:string[]=[];
  try{
   for(const file of Array.from(files)){
    const ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp"} as Record<string,string>)[file.type];
    if(!ext||file.size>10485760){failures.push(file.name+": format/ukuran tidak didukung");continue;}
    const object_path=userId+"/"+projectId+"/"+crypto.randomUUID()+"."+ext;
    const result=await bucket.upload(object_path,file,{contentType:file.type,upsert:false});
    if(result.error){failures.push(file.name+": "+result.error.message);continue;}
    const row=await db.from("pomah_project_photos").insert({project_id:projectId,owner_id:userId,object_path,name:file.name,stage});
    if(row.error){const cleanup=await bucket.remove([object_path]);failures.push(file.name+": "+row.error.message+(cleanup.error?" (pembersihan file gagal)":""));continue;}
    success++;
   }
   setMessage(success+" foto tersimpan. "+failures.join("; "));
  }catch(e){setMessage("Unggahan terhenti: "+String(e));}
  finally{setBusy(false);await client.invalidateQueries({queryKey:key});}
 }
 async function edit(p:Photo,values:{area?:string;notes?:string}){
  const {error}=await db.from("pomah_project_photos").update(values).eq("id",p.id).eq("owner_id",userId);
  if(error)setMessage("Gagal menyimpan catatan: "+error.message);
  else setMessage("Keterangan tersimpan.");
  await client.invalidateQueries({queryKey:key});
 }
 async function remove(p:Photo){
  if(busy||!window.confirm("Hapus foto ini secara permanen?"))return;
  setBusy(true);
  try{
   const result=await bucket.remove([p.object_path]);if(result.error)throw result.error;
   const row=await db.from("pomah_project_photos").delete().eq("id",p.id).eq("owner_id",userId);if(row.error)throw row.error;
   setMessage("Foto dihapus.");
  }catch(e){setMessage("Gagal menghapus: "+String(e));}
  finally{setBusy(false);await client.invalidateQueries({queryKey:key});}
 }
 return <section className="space-y-3 rounded-lg border p-3">
  <h3 className="text-sm font-semibold">{labels[stage]}</h3>
  <p className="text-xs text-muted-foreground">Privat per proyek. JPG, PNG, WebP maksimal 10 MB per foto.</p>
  <div className="flex flex-wrap gap-2">
   <label className="cursor-pointer rounded border px-3 py-2 text-xs">Pilih dari galeri<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={e=>{void upload(e.target.files);e.target.value="";}} /></label>
   <label className="cursor-pointer rounded border px-3 py-2 text-xs">Ambil foto<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={e=>{void upload(e.target.files);e.target.value="";}} /></label>
  </div>
  {busy&&<p role="status">Memproses foto...</p>}
  {message&&<p role="status" className="text-xs">{message}</p>}
  {query.isPending&&<p>Memuat foto...</p>}
  {query.isError&&<p role="alert">Foto gagal dimuat. Periksa konfigurasi penyimpanan dan koneksi. <Button type="button" size="sm" onClick={()=>void query.refetch()}>Coba lagi</Button></p>}
  <div className="grid gap-3 sm:grid-cols-2">{query.data?.map(p=><article key={p.id} className="space-y-2 rounded border p-2">
   {p.url?<img src={p.url} alt={p.name} loading="lazy" className="aspect-[4/3] w-full rounded object-cover"/>:<p>Foto tidak dapat dimuat.</p>}
   <p className="break-all text-xs">{p.name} · {new Date(p.created_at).toLocaleDateString("id-ID")}</p>
   <label className="block text-xs">Area<select className="block w-full rounded border bg-background p-1" value={p.area} onChange={e=>void edit(p,{area:e.target.value})}>{areas.map(a=><option key={a}>{a}</option>)}</select></label>
   <label className="block text-xs">Catatan<textarea key={p.id+":"+p.notes} className="block w-full rounded border bg-background p-1" defaultValue={p.notes} maxLength={500} rows={2} onBlur={e=>{if(e.target.value!==p.notes)void edit(p,{notes:e.target.value});}}/></label>
   <Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>void remove(p)}>Hapus foto</Button>
  </article>)}</div>
  {query.isSuccess&&!query.data.length&&<p className="text-xs">Belum ada foto.</p>}
 </section>;
}
