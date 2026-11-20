import { ArrowDown, ArrowUpRight, ChartNoAxesColumn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cibinongComparables, summarizeAskingPrices } from "@/lib/cibinong-comparables";
import { formatRupiah } from "@/lib/simulation";

const summary = summarizeAskingPrices(cibinongComparables.map(({ askingPrice }) => askingPrice));

type NearbyAskingPricesProps = {
  onUseMedian: (askingPrice: number) => void;
};

export function NearbyAskingPrices({ onUseMedian }: NearbyAskingPricesProps) {
  if (!summary) return null;
  const { min, max, median } = summary;

  return (
    <section className="border-t border-border py-7" aria-labelledby="comparables-title">
      <h2 id="comparables-title" className="flex items-center gap-2 text-base font-semibold">
        <ChartNoAxesColumn className="size-5 text-brand" aria-hidden="true" />
        Harga pembanding sekitar
      </h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Tiga iklan pilihan di area Cibinong dan sekitarnya. Angka menunjukkan harga iklan dari
        penjual. Sampel ini memberi gambaran awal dan belum disesuaikan terhadap perbedaan luas,
        lokasi, atau kondisi aset.
      </p>

      <ul className="mt-4 divide-y divide-border">
        {cibinongComparables.map((listing) => (
          <li key={listing.url} className="flex flex-wrap items-start justify-between gap-2 py-3">
            <div>
              <p className="text-sm font-medium">{listing.area}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                LT {listing.landArea} m² · LB {listing.buildingArea} m² · {listing.condition}
              </p>
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-deep underline underline-offset-2"
              >
                Lihat iklan di {listing.source}
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </a>
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {formatRupiah(listing.askingPrice)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-3 rounded-md border border-border bg-brand-soft px-4 py-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Kisaran harga iklan</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">
              {formatRupiah(min)}–{formatRupiah(max)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Nilai tengah harga iklan</dt>
            <dd className="mt-1 text-base font-semibold tabular-nums">{formatRupiah(median)}</dd>
          </div>
        </dl>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => onUseMedian(median)}
        >
          Pakai nilai tengah di simulasi <ArrowDown aria-hidden="true" />
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Iklan dicek pada <time dateTime="2026-11-20">20 November 2026</time>.
      </p>
    </section>
  );
}
