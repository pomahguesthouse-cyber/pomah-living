import {
  AlertTriangle,
  ArrowDownRight,
  Landmark,
  CheckCircle2,
  CircleDollarSign,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  calculateMortgage,
  calculateSimulation,
  defaultMortgage,
  formatRupiah,
  getDecision,
  type SimulationValues,
  type Verification,
} from "@/lib/simulation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ResultsProps = {
  values: SimulationValues | null;
  auctionLimit: number;
  verification: Verification;
  /** Dipanggil dari tombol "Isi harga jual" saat harga jual masih kosong. */
  onFillSalePrice?: () => void;
};
export function SimulationResults({
  values,
  auctionLimit,
  verification,
  onFillSalePrice,
}: ResultsProps) {
  if (!values)
    return (
      <aside className="result-panel p-6 lg:sticky lg:top-28">
        <div className="flex items-center gap-2 text-brand-deep">
          <CircleDollarSign className="size-5" />
          <h2 className="font-semibold">Hasil simulasi</h2>
        </div>
        <div className="mt-6 border-t border-border pt-6">
          <AlertTriangle className="mb-3 size-6 text-warning" />
          <p className="font-semibold">Lengkapi angka simulasi</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Isi seluruh kolom dengan angka rupiah yang valid untuk menghitung batas tawar dan
            estimasi laba.
          </p>
        </div>
      </aside>
    );
  if (values.salePrice <= 0)
    return (
      <aside className="result-panel p-6 lg:sticky lg:top-28" aria-label="Hasil simulasi">
        <div className="flex items-center gap-2 text-brand-deep">
          <CircleDollarSign className="size-5" />
          <h2 className="font-semibold">Hasil simulasi</h2>
        </div>
        <div className="mt-6 border-t border-border pt-6">
          <TrendingUp className="mb-3 size-6 text-brand" />
          <p className="font-semibold">Isi harga jual untuk melihat batas tawar</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Batas tawar dihitung dari harga jual setelah renovasi. Gunakan harga rumah sejenis yang
            sudah direnovasi di sekitar lokasi. Nilai limit lelang:{" "}
            <span className="font-semibold text-foreground">{formatRupiah(auctionLimit)}</span>.
          </p>
          {onFillSalePrice && (
            <Button type="button" variant="brand" className="mt-4" onClick={onFillSalePrice}>
              Isi harga jual
            </Button>
          )}
        </div>
      </aside>
    );
  const result = calculateSimulation(values);
  const mortgage = calculateMortgage(values.salePrice);
  const decision = getDecision(values, auctionLimit, verification);
  const DecisionIcon =
    decision.tone === "success"
      ? CheckCircle2
      : decision.tone === "danger"
        ? ArrowDownRight
        : AlertTriangle;
  return (
    <aside className="result-panel lg:sticky lg:top-28" aria-label="Hasil simulasi">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <CircleDollarSign className="size-5 text-brand" />
            Hasil simulasi
          </h2>
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-success">
            <span className="size-1.5 rounded-full bg-success" />
            Diperbarui langsung
          </span>
        </div>
        <div className="mt-7">
          <p className="text-sm text-muted-foreground">Batas tawar Anda</p>
          <p
            data-testid="bid-limit"
            className={cn(
              "result-figure mt-1",
              result.bidLimit < auctionLimit ? "text-destructive" : "text-brand-deep",
            )}
          >
            {formatRupiah(result.bidLimit)}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Harga menang maksimal untuk mencapai target laba.
          </p>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">Nilai limit lelang</span>
          <span className="font-semibold tabular-nums">{formatRupiah(auctionLimit)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Selisih terhadap limit</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              result.bidLimit < auctionLimit ? "text-destructive" : "text-success",
            )}
          >
            {result.bidLimit >= auctionLimit ? "+ " : "− "}
            {formatRupiah(Math.abs(result.bidLimit - auctionLimit))}
          </span>
        </div>
      </div>
      <div className="border-y border-border bg-muted/50 px-6 py-5">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <CircleDollarSign className="size-4" />
            Total biaya proyek
          </span>
          <span data-testid="total-cost" className="font-semibold tabular-nums">
            {formatRupiah(result.totalCost)}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="size-4" />
            Estimasi laba
          </span>
          <span
            data-testid="estimated-profit"
            className={cn(
              "text-lg font-semibold tabular-nums",
              result.estimatedProfit >= values.targetProfit ? "text-success" : "text-warning",
            )}
          >
            {formatRupiah(result.estimatedProfit)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Target laba</span>
          <span className="tabular-nums">{formatRupiah(values.targetProfit)}</span>
        </div>
      </div>
      <div className="border-b border-border px-6 py-5" data-testid="buyer-mortgage">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Landmark className="size-4 text-brand" />
          Simulasi KPR BTN untuk pembeli
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Harga jual {formatRupiah(values.salePrice)}, uang muka{" "}
          {Math.round(defaultMortgage.downPaymentRate * 100)}%, tenor {defaultMortgage.years} tahun,
          bunga {defaultMortgage.annualRatePercent.toLocaleString("id-ID")}% per tahun.
        </p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Uang muka</span>
          <span className="font-semibold tabular-nums">{formatRupiah(mortgage.downPayment)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Cicilan per bulan</span>
          <span
            data-testid="monthly-payment"
            className="text-lg font-semibold tabular-nums text-brand-deep"
          >
            {formatRupiah(mortgage.monthlyPayment)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Perkiraan penghasilan minimal</span>
          <span className="tabular-nums">{formatRupiah(mortgage.minimumIncome)}/bulan</span>
        </div>
        <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
          Asumsi ilustrasi, bukan penawaran KPR. Suku bunga dan syarat mengikuti ketentuan BTN.
        </p>
      </div>
      <div className="p-6" aria-live="polite" aria-atomic="true">
        <div
          className={cn(
            "rounded-md p-4",
            decision.tone === "success" && "bg-success-soft text-success",
            decision.tone === "warning" && "bg-warning-soft text-warning",
            decision.tone === "danger" && "bg-danger-soft text-destructive",
          )}
        >
          <p data-testid="decision" className="flex items-center gap-2 text-sm font-semibold">
            <DecisionIcon className="size-4 shrink-0" />
            {decision.label}
          </p>
          <p className="mt-2 text-xs leading-5">{decision.description}</p>
        </div>
        {result.bidLimit < 0 && (
          <div className="mt-4 text-destructive">
            <p className="text-sm font-semibold">Target laba tidak tercapai</p>
            <p className="mt-1 text-xs leading-5">
              Biaya selain harga menang sudah melampaui harga jual setelah dikurangi target laba.
              Bahkan tanpa biaya menang lelang, target laba tidak tercapai.
            </p>
          </div>
        )}
        <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          Hasil simulasi bukan jaminan keuntungan atau rekomendasi investasi.
        </p>
      </div>
    </aside>
  );
}
