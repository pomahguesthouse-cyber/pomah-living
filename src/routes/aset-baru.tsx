import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileSearch, Link2, PenLine, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateSimulation, formatRupiah } from "@/lib/simulation";
import { importAuctionUrl } from "@/lib/import-auction";

export const Route = createFileRoute("/aset-baru")({
  head: () => ({ meta: [{ title: "Tambah aset — Pomah Living" }] }),
  component: NewAsset,
});

type AssetDraft = {
  name: string;
  address: string;
  sourceUrl: string;
  auctionLimit: string;
  auctionDeposit: string;
  landArea: string;
  buildingArea: string;
  salePrice: string;
  purchaseCosts: string;
  renovationCosts: string;
  holdingAndSaleCosts: string;
  targetProfit: string;
  notes: string;
};

const empty: AssetDraft = {
  name: "",
  address: "",
  sourceUrl: "",
  auctionLimit: "",
  auctionDeposit: "",
  landArea: "",
  buildingArea: "",
  salePrice: "",
  purchaseCosts: "",
  renovationCosts: "",
  holdingAndSaleCosts: "",
  targetProfit: "",
  notes: "",
};
const fields: { key: keyof AssetDraft; label: string; type?: string; hint?: string }[] = [
  { key: "name", label: "Nama aset" },
  { key: "address", label: "Alamat / lokasi properti" },
  { key: "auctionLimit", label: "Nilai limit / harga akuisisi (Rp)", type: "number" },
  { key: "auctionDeposit", label: "Uang jaminan lelang (Rp)", type: "number" },
  { key: "landArea", label: "Luas tanah (m²)", type: "number" },
  { key: "buildingArea", label: "Luas bangunan (m²)", type: "number" },
  { key: "salePrice", label: "Perkiraan harga jual setelah renovasi (Rp)", type: "number" },
  { key: "purchaseCosts", label: "Pajak, legalitas, dan biaya pembelian (Rp)", type: "number" },
  { key: "renovationCosts", label: "Estimasi RAB renovasi termasuk cadangan (Rp)", type: "number" },
  { key: "holdingAndSaleCosts", label: "Biaya holding dan pemasaran (Rp)", type: "number" },
  { key: "targetProfit", label: "Target laba (Rp)", type: "number" },
];

function NewAsset() {
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [url, setUrl] = useState("");
  const [asset, setAsset] = useState<AssetDraft>(empty);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  function update(key: keyof AssetDraft, value: string) {
    setAsset((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }
  async function importLink() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const data = await importAuctionUrl({ data: { url: url.trim() } });
      setAsset((prev) => ({
        ...prev,
        sourceUrl: data.sourceUrl,
        name: data.title || prev.name,
        auctionLimit: data.limit === null ? prev.auctionLimit : String(data.limit),
        auctionDeposit: data.deposit === null ? prev.auctionDeposit : String(data.deposit),
        address: data.address || prev.address,
        landArea: data.landArea === null ? prev.landArea : String(data.landArea),
        buildingArea: data.buildingArea === null ? prev.buildingArea : String(data.buildingArea),
        notes: data.description || prev.notes,
      }));
      setNotice(data.warning ?? "Data awal berhasil dibaca. Periksa dan lengkapi kolom di bawah.");
    } catch (err) {
      setAsset((prev) => ({ ...prev, sourceUrl: url.trim() }));
      setError(
        err instanceof Error
          ? err.message
          : "Tidak dapat membaca situs. Lengkapi data secara manual.",
      );
    } finally {
      setBusy(false);
    }
  }
  const num = (key: keyof AssetDraft) => Number(asset[key] || 0);
  const validMoney = [
    "auctionLimit",
    "salePrice",
    "purchaseCosts",
    "renovationCosts",
    "holdingAndSaleCosts",
    "targetProfit",
  ].every(
    (key) =>
      /^\d+$/.test(asset[key as keyof AssetDraft]) &&
      Number.isSafeInteger(Number(asset[key as keyof AssetDraft])),
  );
  const canCalculate = validMoney && num("auctionLimit") > 0 && num("salePrice") > 0;
  const result = canCalculate
    ? calculateSimulation({
        winningPrice: num("auctionLimit"),
        salePrice: num("salePrice"),
        purchaseCosts: num("purchaseCosts"),
        renovationCosts: num("renovationCosts"),
        holdingAndSaleCosts: num("holdingAndSaleCosts"),
        targetProfit: num("targetProfit"),
      })
    : null;
  const roi =
    result && result.totalCost > 0 ? (result.estimatedProfit / result.totalCost) * 100 : null;
  function saveDraft() {
    if (!asset.name.trim() || !canCalculate) {
      setError("Lengkapi nama aset dan semua angka simulasi sebelum menyimpan.");
      return;
    }
    try {
      const key = "pomah-living-asset-drafts";
      const previous = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown;
      const items = Array.isArray(previous) ? previous : [];
      window.localStorage.setItem(
        key,
        JSON.stringify([...items, { ...asset, savedAt: new Date().toISOString() }]),
      );
      setSaved(true);
      setError("");
    } catch {
      setError(
        "Penyimpanan di perangkat ini gagal. Coba kembali setelah mengaktifkan penyimpanan browser.",
      );
    }
  }
  return (
    <main className="page-container py-10 sm:py-14">
      <Link to="/pilih-aset" className="text-sm text-muted-foreground hover:text-foreground">
        ← Kembali ke pilih aset
      </Link>
      <p className="eyebrow mt-8 text-brand">Aset properti</p>
      <h1 className="section-title mt-2">Tambahkan aset untuk dianalisis.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Gunakan URL lelang BTN atau DJKN, atau masukkan data properti sendiri. Semua nilai impor
        dapat diperiksa dan dikoreksi.
      </p>
      <div className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant={mode === "url" ? "default" : "outline"}
          onClick={() => setMode("url")}
        >
          <Link2 className="mr-2 size-4" /> Tempel URL lelang
        </Button>
        <Button
          type="button"
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
        >
          <PenLine className="mr-2 size-4" /> Input manual
        </Button>
      </div>
      {mode === "url" && (
        <section className="mt-6 max-w-2xl rounded-xl border border-border p-5">
          <label htmlFor="auction-url" className="text-sm font-semibold">
            URL detail aset lelang
          </label>
          <input
            id="auction-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://lelang.go.id/..."
            className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button className="mt-3" disabled={busy || !url.trim()} onClick={() => void importLink()}>
            <FileSearch className="mr-2 size-4" /> {busy ? "Membaca halaman…" : "Ambil data awal"}
          </Button>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Mendukung halaman HTTPS lelang.go.id dan balelelang.btn.co.id. Situs yang memerlukan
            login atau membatasi akses mungkin tidak bisa diimpor. Data tetap perlu diverifikasi.
          </p>
        </section>
      )}
      {notice && (
        <p role="status" className="mt-5 max-w-2xl text-sm text-amber-700">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 max-w-2xl text-sm text-destructive">
          {error}
        </p>
      )}
      <section className="mt-8 max-w-4xl">
        <h2 className="text-xl font-semibold">Data aset dan simulasi awal</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {fields.map(({ key, label, type }) => (
            <label key={key} className="block text-sm font-medium">
              {label}
              <input
                type={type ?? "text"}
                min={type === "number" ? "0" : undefined}
                step={type === "number" ? "1" : undefined}
                value={asset[key]}
                onChange={(e) => update(key, e.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
          ))}
        </div>
        <label className="mt-4 block text-sm font-medium">
          Catatan / deskripsi dari sumber
          <textarea
            value={asset.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-md border border-input bg-background p-3 text-sm"
          />
        </label>
        {asset.sourceUrl && (
          <p className="mt-3 break-all text-xs text-muted-foreground">
            Sumber data: {asset.sourceUrl}
          </p>
        )}
      </section>
      <section className="mt-8 max-w-4xl rounded-xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">Analisis flipping awal</h2>
        {!result ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Lengkapi semua angka biaya dan harga jual (isi 0 jika belum ada biaya) untuk melihat
            simulasi.
          </p>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <p className="text-sm">
              Total kebutuhan modal
              <br />
              <strong className="text-xl">{formatRupiah(result.totalCost)}</strong>
            </p>
            <p className="text-sm">
              Estimasi laba
              <br />
              <strong className="text-xl">{formatRupiah(result.estimatedProfit)}</strong>
            </p>
            <p className="text-sm">
              Batas tawar berdasarkan target laba
              <br />
              <strong className="text-xl">{formatRupiah(result.bidLimit)}</strong>
            </p>
            <p className="text-sm">
              ROI sederhana atas total modal
              <br />
              <strong className="text-xl">{roi?.toFixed(1)}%</strong>
            </p>
          </div>
        )}
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Simulasi indikatif, belum mencakup verifikasi legalitas, penghuni, kondisi bangunan, atau
          harga pasar. Nilai limit dipakai sebagai asumsi harga menang; perbarui sesuai hasil
          lelang.
        </p>
        <Button className="mt-5" onClick={saveDraft} disabled={!canCalculate}>
          <Save className="mr-2 size-4" /> Simpan draf di perangkat
        </Button>
        {saved && (
          <p role="status" className="mt-2 text-sm text-green-700">
            Draf tersimpan di browser perangkat ini, belum tersinkron ke akun atau modul proyek.
          </p>
        )}
      </section>
      <p className="mt-8 max-w-4xl text-sm text-muted-foreground">
        Tahap berikutnya: menghubungkan aset ini ke RAB terperinci, gambar kerja, dan proposal
        investasi. Saat ini fitur yang aktif adalah input data, pembacaan metadata sumber, dan
        simulasi keuangan awal.
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/pilih-aset">
          Lihat aset demo <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
    </main>
  );
}
