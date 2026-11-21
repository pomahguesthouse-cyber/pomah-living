import { ArrowUpRight, ChartNoAxesColumn, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cibinongComparables, summarizeAskingPrices } from "@/lib/cibinong-comparables";
import { calculateFlipping, type FlippingProject } from "@/lib/flipping";
import { formatRupiah } from "@/lib/simulation";

type Props = {
  project: FlippingProject;
  demo: boolean;
  onUseTarget: (price: number) => void;
};

export function ProjectMarketAnalysis({ project, demo, onUseTarget }: Props) {
  const properties = demo && project.property.address.toLowerCase().includes("cibinong")
    ? cibinongComparables
    : [];
  const summary = summarizeAskingPrices(properties.map((property) => property.askingPrice));
  const sale = project.finance.sale;
  const financial = calculateFlipping(project.finance, project.rab);
  const comparableSize = properties.filter((property) =>
    project.property.land > 0 &&
    Math.abs(property.landArea - project.property.land) / project.property.land <= 0.25 &&
    project.property.building > 0 &&
    Math.abs(property.buildingArea - project.property.building) / project.property.building <= 0.25
  );
  const suitable = comparableSize.length >= 3;
  const variance = summary && summary.median > 0 ? ((sale / summary.median) - 1) * 100 : null;

  return (
    <section aria-labelledby="market-title" className="space-y-5">
      <div>
        <h2 id="market-title" className="flex items-center gap-2 text-lg font-semibold">
          <ChartNoAxesColumn className="size-5 text-brand" aria-hidden="true" /> Analisis harga pasar sekitar
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Pembanding ini berupa harga penawaran iklan, bukan harga transaksi. Perlu penyesuaian luas,
          kondisi, akses, legalitas dan lokasi mikro sebelum menentukan harga jual realistis.
        </p>
      </div>
      {!summary ? (
        <div className="rounded-lg border border-border bg-muted/40 p-5">
          <strong className="text-sm">Data pembanding belum tersedia untuk proyek ini</strong>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Modul otomatis untuk wilayah lain membutuhkan sumber listing yang terverifikasi,
            geolokasi dan tanggal pembaruan. Jangan menggunakan iklan Cibinong untuk lokasi lain.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Harga iklan terendah", summary.min],
              ["Median harga iklan", summary.median],
              ["Harga iklan tertinggi", summary.max],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-lg font-semibold tabular-nums">{formatRupiah(Number(value))}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p>
              {suitable
                ? `${comparableSize.length} iklan memiliki luas tanah dan bangunan dalam selisih maksimal 25% dari aset. Tetap periksa kondisi dan harga transaksi.`
                : `Kualitas pembanding rendah: hanya ${comparableSize.length} dari ${properties.length} iklan berada dalam toleransi luas tanah dan bangunan ±25%. Median iklan tidak dapat dianggap estimasi harga pasar wajar untuk aset ini.`}
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[660px] text-left text-xs">
              <thead className="bg-muted text-muted-foreground"><tr><th className="p-3">Area / sumber</th><th className="p-3">LT / LB</th><th className="p-3">Kondisi</th><th className="p-3 text-right">Harga iklan</th></tr></thead>
              <tbody className="divide-y divide-border">
                {properties.map((item) => <tr key={item.url}>
                  <td className="p-3"><span className="block font-medium">{item.area}</span><a className="mt-1 inline-flex items-center gap-1 text-brand underline" href={item.url} target="_blank" rel="noopener noreferrer">{item.source} <ArrowUpRight className="size-3" /></a></td>
                  <td className="p-3 whitespace-nowrap">{item.landArea} / {item.buildingArea} m²</td>
                  <td className="p-3">{item.condition}</td>
                  <td className="p-3 text-right font-semibold tabular-nums">{formatRupiah(item.askingPrice)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold">Dampak terhadap proyeksi flipping</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Target jual proyek saat ini</dt><dd className="mt-1 font-semibold">{formatRupiah(sale)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Selisih target dari median iklan</dt><dd className="mt-1 font-semibold">{variance === null ? "—" : `${variance > 0 ? "+" : ""}${variance.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Total biaya all-in</dt><dd className="mt-1 font-semibold">{formatRupiah(financial.allIn)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Laba/rugi pada target saat ini</dt><dd className="mt-1 font-semibold">{formatRupiah(financial.profit)}</dd></div>
            </dl>
            <Button type="button" variant="outline" className="mt-5" onClick={() => {
              if (window.confirm("Median ini hanya harga iklan dan belum disesuaikan dengan luas/kondisi. Tetap gunakan sebagai target jual simulasi?")) onUseTarget(summary.median);
            }}>
              Gunakan median iklan sebagai asumsi harga jual
            </Button>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Pilihan ini hanya mengubah target harga jual pada simulasi. Tidak menyatakan harga transaksi, valuasi resmi, atau rekomendasi membeli aset.</p>
          </div>
          <p className="text-xs text-muted-foreground">Sumber: contoh tautan iklan Rumah123 dan 99.co yang dicatat pada 20 November 2026. Data statis, bukan feed real-time. Tautan bisa berubah atau tidak aktif.</p>
        </>
      )}
    </section>
  );
}
