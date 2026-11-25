import { ArrowUpRight, ClipboardList, Hammer, House, Wallet } from "lucide-react";
import { calculateFlipping, workGroups, type FlippingProject } from "@/lib/flipping";
import { formatRupiah } from "@/lib/simulation";

export function FlippingOverview({ project, onNavigate }: { project: FlippingProject; onNavigate: (tab: string) => void }) {
  const result = calculateFlipping(project.finance, project.rab);
  const f = project.finance;
  const costs = [
    { name: "Perolehan aset", amount: result.acquisition, color: "bg-sky-600" },
    { name: "Renovasi", amount: result.renovation, color: "bg-amber-500" },
    { name: "Biaya kepemilikan", amount: result.holding, color: "bg-violet-500" },
    { name: "Penjualan", amount: result.selling, color: "bg-emerald-600" },
    { name: "Cadangan tambahan", amount: f.reserve, color: "bg-slate-500" },
  ];
  const acquisition = [
    ["Harga beli / menang lelang", f.purchase],
    ["Bea lelang pembeli (asumsi)", result.auctionFee],
    ["BPHTB (asumsi)", result.bphtb],
    ["Notaris, PPAT & balik nama", f.notary],
    ["Pemeriksaan dokumen", f.documentCheck],
    ["Pengosongan properti", f.vacancy],
  ] as const;
  const work = workGroups.map((group) => ({
    group,
    amount: project.rab.filter((item) => item.group === group).reduce((sum, item) => sum + item.volume * item.price, 0),
    count: project.rab.filter((item) => item.group === group).length,
  })).filter((item) => item.count > 0);
  const maxCost = Math.max(result.allIn, 1);
  const cards = [
    { label: "Harga beli aset", value: f.purchase, icon: House },
    { label: "Total biaya perolehan", value: result.acquisition, icon: Wallet },
    { label: "RAB renovasi", value: result.renovation, icon: Hammer },
    { label: "Total modal all-in", value: result.allIn, icon: ClipboardList },
  ];
  return (
    <section aria-labelledby="overview-title" className="mt-7 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Project financial dashboard</p>
          <h2 id="overview-title" className="mt-1 text-xl font-semibold sm:text-2xl">Ringkasan proyek flipping</h2>
          <p className="mt-1 text-sm text-muted-foreground">Perhitungan rinci (pajak, bunga, biaya jual) dengan titik awal dari analisis aset. Angka otomatis mengikuti perubahan asumsi dan RAB di bawah.</p>
        </div>
        <button type="button" className="no-print inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline" onClick={() => onNavigate("analysis")}>Edit asumsi <ArrowUpRight className="size-4" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => <div key={label} className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm">
          <Icon className="mb-4 size-5 text-brand" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">{label}</p>
          <strong className="mt-2 block break-words text-lg tabular-nums">{formatRupiah(value)}</strong>
        </div>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Komposisi total modal</h3>
          <p className="mt-1 text-xs text-muted-foreground">Biaya all-in, termasuk biaya penjualan berbasis harga jual target</p>
          <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Komposisi modal berdasarkan kategori biaya">
            {costs.filter((row) => row.amount > 0).map((row) => <div key={row.name} className={row.color} style={{ width: `${(row.amount / maxCost) * 100}%` }} title={`${row.name}: ${formatRupiah(row.amount)}`} />)}
          </div>
          <dl className="mt-5 space-y-3">
            {costs.map((row) => <div key={row.name} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
              <dt className="flex items-center gap-2 text-muted-foreground"><span className={`inline-block size-2.5 rounded-sm ${row.color}`} />{row.name}</dt>
              <dd className="font-semibold tabular-nums">{formatRupiah(row.amount)}</dd>
            </div>)}
          </dl>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Proyeksi exit</p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Target harga jual</p>
            <button type="button" className="no-print text-xs font-semibold text-brand hover:underline" onClick={() => onNavigate("market")}>Ubah / simulasi</button>
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatRupiah(f.sale)}</p>
          <p className="mt-4 text-sm text-muted-foreground">Estimasi laba / rugi bersih</p>
          <p className={`mt-1 break-words text-2xl font-bold tabular-nums ${result.profit < 0 ? "text-destructive" : "text-brand-deep"}`}>{formatRupiah(result.profit)}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div><p className="text-xs text-muted-foreground">ROI</p><strong>{result.roi === null ? "—" : `${result.roi.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`}</strong></div>
            <div><p className="text-xs text-muted-foreground">Balik modal pada</p><strong>{result.breakEven === null ? "Tidak tersedia" : formatRupiah(Math.ceil(result.breakEven))}</strong></div>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">Simulasi, bukan jaminan keuntungan. Seluruh asumsi pajak dan biaya perlu diverifikasi.</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Rincian biaya perolehan</h3><button type="button" className="no-print text-xs font-semibold text-brand hover:underline" onClick={() => onNavigate("analysis")}>Ubah biaya</button></div>
          <dl className="mt-4 divide-y divide-border text-sm">
            {acquisition.map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-2.5"><dt className="text-muted-foreground">{label}</dt><dd className="shrink-0 font-medium tabular-nums">{formatRupiah(value)}</dd></div>)}
            <div className="flex justify-between gap-3 py-3 font-bold"><dt>Total perolehan</dt><dd className="tabular-nums">{formatRupiah(result.acquisition)}</dd></div>
          </dl>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">RAB pekerjaan renovasi</h3><button type="button" className="no-print text-xs font-semibold text-brand hover:underline" onClick={() => onNavigate("rab")}>Edit RAB</button></div>
          {work.length ? <dl className="mt-4 divide-y divide-border text-sm">
            {work.map((row) => <div key={row.group} className="flex justify-between gap-3 py-2.5"><dt className="text-muted-foreground">{row.group} <span className="text-xs">({row.count} item)</span></dt><dd className="font-medium tabular-nums">{formatRupiah(row.amount)}</dd></div>)}
            <div className="flex justify-between gap-3 py-3 font-bold"><dt>Total RAB</dt><dd className="tabular-nums">{formatRupiah(result.renovation)}</dd></div>
          </dl> : <p className="mt-4 text-sm text-muted-foreground">Belum ada item RAB. Tambahkan pekerjaan setelah survei kondisi bangunan.</p>}
        </section>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Biaya langsung adalah item renovasi dalam RAB. Biaya perolehan, holding, pajak dan pemasaran dihitung terpisah agar tidak terjadi penghitungan ganda. Harga satuan dan volume harus diperiksa sebelum keputusan lelang.</p>
    </section>
  );
}
