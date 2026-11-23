import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileSearch, Link2, PenLine, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateSimulation, formatRupiah } from "@/lib/simulation";
import { importAuctionUrl } from "@/lib/import-auction";
import { parseAuctionText } from "@/lib/auction-text-parser";

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
  bedrooms: string;
  bathrooms: string;
  floors: string;
  carport: string;
  electricPower: string;
  legalStatus: string;
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
  bedrooms: "",
  bathrooms: "",
  floors: "",
  carport: "",
  electricPower: "",
  legalStatus: "",
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
  { key: "bedrooms", label: "Jumlah kamar tidur", type: "number" },
  { key: "bathrooms", label: "Jumlah kamar mandi", type: "number" },
  { key: "floors", label: "Jumlah lantai", type: "number" },
  { key: "carport", label: "Fasilitas carport / parkir" },
  { key: "electricPower", label: "Daya listrik terpasang (VA)", type: "number" },
  { key: "legalStatus", label: "Status legalitas (SHM, HGB, lainnya)" },
];
const simulationFields: typeof fields = [
  { key: "salePrice", label: "Perkiraan harga jual setelah renovasi (Rp)", type: "number" },
  { key: "purchaseCosts", label: "Pajak, legalitas, dan biaya pembelian (Rp)", type: "number" },
  { key: "renovationCosts", label: "Estimasi RAB renovasi termasuk cadangan (Rp)", type: "number" },
  { key: "holdingAndSaleCosts", label: "Biaya holding dan pemasaran (Rp)", type: "number" },
  { key: "targetProfit", label: "Target laba (Rp)", type: "number" },
];

function NewAsset() {
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [url, setUrl] = useState("");
  const [copiedText, setCopiedText] = useState("");
  const [asset, setAsset] = useState<AssetDraft>(empty);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [photoNames, setPhotoNames] = useState<string[]>([]);
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
  function importCopiedText() {
    const parsed = parseAuctionText(copiedText);
    if (![parsed.name, parsed.address, parsed.limit, parsed.deposit, parsed.landArea, parsed.buildingArea].some(Boolean)) {
      setError("Teks detail lelang belum dikenali. Salin bagian ringkasan lelang dan tab Uraian.");
      return;
    }
    setAsset((prev) => ({
      ...prev,
      name: parsed.name || prev.name,
      address: parsed.address || prev.address,
      auctionLimit: parsed.limit === null ? prev.auctionLimit : String(parsed.limit),
      auctionDeposit: parsed.deposit === null ? prev.auctionDeposit : String(parsed.deposit),
      landArea: parsed.landArea === null ? prev.landArea : String(parsed.landArea),
      buildingArea: parsed.buildingArea === null ? prev.buildingArea : String(parsed.buildingArea),
      notes: [prev.notes, parsed.certificate && "Sertifikat: " + parsed.certificate, parsed.lotCode && "Kode lot: " + parsed.lotCode].filter(Boolean).join("\n"),
    }));
    setError("");
    setNotice("Informasi dari teks halaman sudah dimasukkan. Periksa kembali berdasarkan pengumuman resmi.");
    setSaved(false);
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
  function restoreDraft() {
    try {
      const items: unknown = JSON.parse(window.localStorage.getItem("pomah-living-asset-drafts") || "[]");
      if (!Array.isArray(items) || !items.length) {
        setNotice("Belum ada draf tersimpan di perangkat ini.");
        return;
      }
      const latest: unknown = items[items.length - 1];
      if (!latest || typeof latest !== "object") throw new Error("Draf tidak valid");
      const restored = latest as Record<string, unknown>;
      setAsset(Object.fromEntries(Object.keys(empty).map((key) => [key, typeof restored[key] === "string" ? restored[key] : ""])) as AssetDraft);
      setPhotoNames([]);
      setSaved(false);
      setNotice("Draf terakhir dimuat. Berkas foto harus dipilih ulang.");
      setError("");
    } catch {
      setError("Draf tersimpan tidak dapat dibuka.");
    }
  }
  function saveDraft() {
    if (!asset.name.trim()) {
      setError("Isi nama aset sebelum menyimpan draf.");
      return;
    }
    try {
      const key = "pomah-living-asset-drafts";
      const previous = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown;
      const items = Array.isArray(previous) ? previous : [];
      window.localStorage.setItem(
        key,
        JSON.stringify([...items, { ...asset, photoNames, savedAt: new Date().toISOString() }]),
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
        Masukkan data properti dari sumber lelang secara bertahap. Simpan draf tanpa harus
        mengetahui RAB renovasi atau harga jual terlebih dahulu.
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
      {mode === "url" && (
        <section className="mt-5 max-w-2xl rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold">Alternatif: tempel teks detail DJKN</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Jika impor URL tidak menemukan detail aset, buka halaman lelang, salin teks ringkasan dan tab Uraian, lalu tempel di sini. Data yang ditemukan akan mengisi formulir. Tidak perlu menunggu scraper browser.
          </p>
          <label htmlFor="auction-copy" className="mt-4 block text-sm font-medium">Teks halaman DJKN</label>
          <textarea id="auction-copy" value={copiedText} onChange={(e) => setCopiedText(e.target.value)}
            rows={5} placeholder="Nilai Limit Rp223.000.000 ... Uang Jaminan ... Luas: 77 M² ... Alamat: ..."
            className="mt-2 w-full rounded-md border border-input bg-background p-3 text-sm" />
          <Button type="button" variant="outline" className="mt-3" disabled={!copiedText.trim()} onClick={importCopiedText}>
            Isi formulir dari teks
          </Button>
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
        <h2 className="text-xl font-semibold">1. Data aset lelang</h2>
        <p className="mt-2 text-sm text-muted-foreground">Isi informasi yang tersedia terlebih dahulu. Kolom yang belum diketahui boleh dikosongkan.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={saveDraft}><Save className="mr-2 size-4" /> Simpan draf aset</Button>
          <Button type="button" variant="outline" onClick={restoreDraft}>Muat draf terakhir</Button>
        </div>
        <label className="mt-5 block text-sm font-medium">Link sumber lelang (opsional)
          <input type="url" value={asset.sourceUrl} onChange={(e) => update("sourceUrl", e.target.value)} placeholder="https://lelang.go.id/..." className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm" />
        </label>
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
        <h2 className="text-xl font-semibold">2. Foto kondisi aset</h2>
        <p className="mt-2 text-sm text-muted-foreground">Foto wajib tersedia sebelum analisis kondisi bangunan. Draf teks boleh disimpan lebih dulu. Foto di tahap ini hanya dipilih di sesi browser dan belum tersimpan ke server.</p>
        <label className="mt-4 block text-sm font-medium">Pilih foto kondisi rumah (JPG, PNG, WebP)
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-2 block w-full text-sm" onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            const valid = files.filter((f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type) && f.size <= 10 * 1024 * 1024);
            setPhotoNames(valid.map((f) => f.name));
            setNotice(valid.length !== files.length ? "Sebagian foto ditolak: gunakan JPG/PNG/WebP maksimal 10 MB per foto." : "Foto dipilih untuk sesi ini. Penyimpanan permanen belum aktif.");
            setSaved(false);
          }} />
        </label>
        <p className="mt-3 text-sm">{photoNames.length} foto dipilih {photoNames.length === 0 ? "— analisis foto belum dapat dilanjutkan." : "— siap ditinjau."}</p>
        <p className="mt-3 text-xs text-muted-foreground">Analisis AI dan pengiriman foto ke RAB belum tersedia dari formulir ini. Modul pemeriksaan manual dan RAB sudah ada di halaman proyek flipping.</p>
      </section>
      <section className="mt-8 max-w-4xl rounded-xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">3. Simulasi indikatif (opsional, setelah RAB)</h2>
        <p className="mt-2 text-sm text-muted-foreground">Harga jual, biaya renovasi, dan target laba bukan bagian dari data awal aset. Lengkapi jika analisis dan RAB sudah siap.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {simulationFields.map(({ key, label, type }) => (
            <label key={key} className="block text-sm font-medium">{label}
              <input type={type ?? "text"} min={type === "number" ? "0" : undefined} step="1" value={asset[key]} onChange={(e) => update(key, e.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm" />
            </label>
          ))}
        </div>
        <h3 className="mt-6 text-lg font-semibold">Hasil simulasi awal</h3>
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
        <Button className="mt-5" onClick={saveDraft}>
          <Save className="mr-2 size-4" /> Simpan draf di perangkat
        </Button>
        {saved && (
          <p role="status" className="mt-2 text-sm text-green-700">
            Draf data tersimpan di browser perangkat ini. Berkas foto belum tersimpan; pilih ulang foto saat kembali ke tahap analisis. Draf belum tersinkron ke akun atau modul proyek.
          </p>
        )}
      </section>
      <p className="mt-8 max-w-4xl text-sm text-muted-foreground">
        Perhitungan RAB terperinci dan analisis manual tersedia di halaman proyek flipping. Integrasi draf aset, unggahan foto permanen, dan analisis AI masih memerlukan pengembangan lanjutan.
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/pilih-aset">
          Lihat aset demo <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
    </main>
  );
}
