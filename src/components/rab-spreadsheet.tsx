import { useState, type ClipboardEvent } from "react";
import { ClipboardPaste, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rabTotal, workGroups, type FlippingProject, type RabItem } from "@/lib/flipping";
import { formatRupiah } from "@/lib/simulation";

type Props = { project: FlippingProject; onChange: (project: FlippingProject) => void };
const amountLimit = 1_000_000_000_000;
const header = ["Pekerjaan", "Kelompok", "Volume", "Satuan", "Harga satuan", "Jumlah"];
function parseNumber(raw: string) {
  const clean = raw.trim().replace(/^Rp\s*/i, "").replace(/\s/g, "");
  const normalized = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(clean)
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value <= amountLimit ? value : null;
}
function newRow(): RabItem {
  return { id: crypto.randomUUID(), name: "", group: "Persiapan", volume: 1, unit: "m²", price: 0 };
}
export function RabSpreadsheet({ project, onChange }: Props) {
  const [pasteError, setPasteError] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const change = (rab: RabItem[]) => onChange({ ...project, rab });
  const edit = (id: string, fields: Partial<RabItem>) =>
    change(project.rab.map((item) => item.id === id ? { ...item, ...fields } : item));
  function importRows(text: string) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) { setPasteError("Tidak ada baris untuk ditempel."); return; }
    if (project.rab.length + lines.length > 200) {
      setPasteError("Maksimal 200 item RAB per proyek."); return;
    }
    const imported: RabItem[] = [];
    for (const [i, line] of lines.entries()) {
      const cells = line.split("\t");
      if (cells.length !== 5) {
        setPasteError(`Baris ${i + 1}: gunakan lima kolom (pekerjaan, kelompok, volume, satuan, harga satuan).`); return;
      }
      const [name, rawGroup, rawVolume, unit, rawPrice] = cells.map((cell) => cell.trim());
      const group = workGroups.find((g) => g.toLowerCase() === rawGroup.toLowerCase());
      const volume = parseNumber(rawVolume);
      const price = parseNumber(rawPrice);
      if (!name || name.length > 500 || !group || volume === null || price === null || !unit || unit.length > 500) {
        setPasteError(`Baris ${i + 1} tidak valid. Periksa kelompok, volume, satuan, dan harga.`); return;
      }
      imported.push({ id: crypto.randomUUID(), name, group, volume, unit, price });
    }
    change([...project.rab, ...imported]);
    setPasteError("");
    setPasteText("");
    setShowPaste(false);
  }
  function pasteCell(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!pasted.includes("\t") && !pasted.includes("\n")) return;
    event.preventDefault();
    setPasteError("Untuk menempel beberapa sel Excel, gunakan panel 'Tempel dari Excel' dengan lima kolom.");
    setShowPaste(true);
  }
  return (
    <section aria-label="Spreadsheet RAB renovasi" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">RAB renovasi · Editor tabel</h2>
          <p className="mt-1 text-xs text-muted-foreground">Edit langsung setiap sel seperti Excel. Jumlah = volume × harga satuan; ringkasan investasi mengikuti otomatis.</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setShowPaste(!showPaste)}><ClipboardPaste className="size-4" /> Tempel dari Excel</Button>
          <Button type="button" variant="outline" disabled={project.rab.length >= 200} onClick={() => change([...project.rab, newRow()])}><Plus className="size-4" /> Tambah baris</Button>
        </div>
      </div>
      {showPaste && <div className="no-print rounded-lg border border-border bg-muted/30 p-4">
        <label htmlFor="rab-paste" className="text-sm font-medium">Tempel 5 kolom dari Excel / Sheets</label>
        <p className="mt-1 text-xs text-muted-foreground">Urutan: Pekerjaan · Kelompok · Volume · Satuan · Harga satuan. Jangan sertakan header atau kolom jumlah. Baris akan ditambahkan setelah data yang sudah ada.</p>
        <textarea id="rab-paste" rows={4} className="mt-3 w-full rounded-md border border-input bg-background p-3 font-mono text-xs" value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"Cat dinding\tFinishing\t100\tm²\t50000"} />
        <Button type="button" className="mt-2" onClick={() => importRows(pasteText)}>Tambahkan ke RAB</Button>
      </div>}
      {pasteError && <p role="alert" className="text-sm text-destructive">{pasteError}</p>}
      <div className="max-w-full overflow-x-auto rounded-lg border border-border">
        <table className="rab-table w-full min-w-[900px] border-collapse text-left text-xs">
          <thead className="bg-muted">
            <tr>{["No.", ...header, "Aksi"].map((name) =>
              <th key={name} scope="col" className={`whitespace-nowrap border-b border-r border-border px-3 py-3 font-semibold ${name === "Aksi" ? "no-print" : ""}`}>{name}</th>)}</tr>
          </thead>
          <tbody>
            {project.rab.map((item, index) => <tr key={item.id} className="group border-b border-border even:bg-muted/20">
              <th scope="row" className="border-r border-border px-3 font-medium text-muted-foreground">{index + 1}</th>
              <td className="min-w-[220px] border-r border-border p-1.5"><Input className="h-9 border-transparent bg-transparent focus-visible:border-input" aria-label={`Pekerjaan baris ${index + 1}`} value={item.name} maxLength={500} onPaste={(event) => pasteCell(event)} onChange={(event) => edit(item.id, { name: event.target.value })} /><span className="print-value">{item.name}</span></td>
              <td className="min-w-[130px] border-r border-border p-1.5"><select className="h-9 w-full rounded-md border border-transparent bg-transparent px-1 focus:border-input" aria-label={`Kelompok baris ${index + 1}`} value={item.group} onChange={(event) => { const group = workGroups.find((g) => g === event.target.value); if (group) edit(item.id, { group }); }}>{workGroups.map((group) => <option key={group} value={group}>{group}</option>)}</select><span className="print-value">{item.group}</span></td>
              <td className="w-24 border-r border-border p-1.5"><Input className="h-9 border-transparent bg-transparent text-right tabular-nums" aria-label={`Volume baris ${index + 1}`} type="number" inputMode="decimal" min={0} max={amountLimit} step="any" value={item.volume} onChange={(event) => { const n = Number(event.target.value); if (Number.isFinite(n) && n >= 0 && n <= amountLimit) edit(item.id, { volume: n }); }}/><span className="print-value">{item.volume}</span></td>
              <td className="w-24 border-r border-border p-1.5"><Input className="h-9 border-transparent bg-transparent" aria-label={`Satuan baris ${index + 1}`} value={item.unit} maxLength={500} onChange={(event) => edit(item.id, { unit: event.target.value })} /><span className="print-value">{item.unit}</span></td>
              <td className="min-w-[150px] border-r border-border p-1.5"><Input className="h-9 border-transparent bg-transparent text-right tabular-nums" aria-label={`Harga satuan baris ${index + 1}`} type="number" min={0} max={amountLimit} step="any" inputMode="decimal" value={item.price} onChange={(event) => { const n = Number(event.target.value); if (Number.isFinite(n) && n >= 0 && n <= amountLimit) edit(item.id, { price: n }); }}/><span className="print-value">{formatRupiah(item.price)}</span></td>
              <td className="whitespace-nowrap border-r border-border px-3 text-right font-semibold tabular-nums">{formatRupiah(item.volume * item.price)}</td>
              <td className="no-print p-1"><Button type="button" variant="ghost" size="icon" aria-label={`Hapus baris ${index + 1}`} title="Hapus baris" onClick={() => change(project.rab.filter((row) => row.id !== item.id))}><Trash2 className="size-4 text-destructive" /></Button></td>
            </tr>)}
          </tbody>
          <tfoot className="bg-muted/60">
            <tr><th colSpan={6} className="px-3 py-4 text-right text-sm">TOTAL RAB RENOVASI</th><td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold tabular-nums" data-testid="rab-total">{formatRupiah(rabTotal(project.rab))}</td><td className="no-print" /></tr>
          </tfoot>
        </table>
      </div>
      {project.rab.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pekerjaan. Tambahkan baris atau tempel data dari Excel.</p>}
      <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        {workGroups.map((group) => <div key={group} className="rounded-md border border-border p-3"><dt className="text-muted-foreground">{group}</dt><dd className="mt-1 font-semibold">{formatRupiah(rabTotal(project.rab.filter((item) => item.group === group)))}</dd></div>)}
      </dl>
      <p className="text-xs text-muted-foreground">Perubahan proyek demo tersimpan di perangkat; untuk proyek pribadi, tekan “Simpan rincian” di bagian atas halaman. Batas 200 item per proyek.</p>
    </section>
  );
}
