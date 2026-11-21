import { useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type FlippingProject, type AssetAssessment } from "@/lib/flipping";

export function AssetAnalysis({
  project,
  onChange,
  onNavigate,
}: {
  project: FlippingProject;
  onChange: (next: FlippingProject) => void;
  onNavigate: (tab: string) => void;
}) {
  const rows = project.assetAssessments;
  const [message, setMessage] = useState("");
  const edit = (area: string, patch: Partial<AssetAssessment>) =>
    onChange({
      ...project,
      assetAssessments: rows.map((row) => (row.area === area ? { ...row, ...patch } : row)),
    });

  function sendToRab(row: AssetAssessment) {
    if (!row.finding.trim() || !row.recommendation.trim()) {
      setMessage("Isi temuan dan rekomendasi perbaikan terlebih dahulu.");
      return;
    }
    if (project.rab.length >= 200) {
      setMessage("RAB sudah mencapai batas 200 pekerjaan.");
      return;
    }
    const name = `${row.area}: ${row.recommendation.trim()}`.slice(0, 500);
    if (project.rab.some((item) => item.name === name)) {
      setMessage("Pekerjaan dengan nama sama sudah ada di RAB.");
      return;
    }
    onChange({
      ...project,
      rab: [
        ...project.rab,
        {
          id: crypto.randomUUID(),
          name,
          group: row.group,
          volume: 0,
          unit: "m²",
          price: 0,
        },
      ],
    });
    setMessage(
      `Usulan ${row.area} ditambahkan ke RAB. Lengkapi volume, satuan, dan harga setelah survei.`,
    );
  }
  return (
    <section aria-labelledby="asset-analysis-title" className="space-y-5">
      <div>
        <h2 id="asset-analysis-title" className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardCheck className="size-5 text-brand" /> Analisis Aset
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Catat kondisi bangunan, kerusakan yang ditemukan, dan rekomendasi pekerjaan. Tambahkan
          pekerjaan yang disetujui ke RAB renovasi.
        </p>
      </div>
      <div className="rounded-md border border-border bg-muted/30 p-4 text-xs leading-6 text-muted-foreground">
        Formulir pemeriksaan manual, belum menggunakan AI. Catatan disimpan bersama rincian proyek:
        proyek demo otomatis di perangkat ini, sedangkan proyek pribadi setelah menekan “Simpan
        rincian”. Usulan pekerjaan yang disetujui masuk ke RAB. Penyebab kerusakan tersembunyi dan
        kondisi struktur tetap perlu verifikasi tenaga ahli di lapangan.
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.area} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">{row.area}</h3>
              <select
                aria-label={`Status ${row.area}`}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={row.condition}
                onChange={(event) => {
                  const condition = event.target.value;
                  if (
                    condition === "Belum diperiksa" ||
                    condition === "Baik" ||
                    condition === "Perlu perbaikan ringan" ||
                    condition === "Perlu pemeriksaan lanjutan" ||
                    condition === "Perlu perbaikan besar"
                  )
                    edit(row.area, { condition });
                }}
              >
                <option>Belum diperiksa</option>
                <option>Baik</option>
                <option>Perlu perbaikan ringan</option>
                <option>Perlu pemeriksaan lanjutan</option>
                <option>Perlu perbaikan besar</option>
              </select>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-medium">
                Temuan / indikasi kerusakan
                <Input
                  className="mt-2"
                  maxLength={500}
                  value={row.finding}
                  placeholder="Isi berdasarkan foto atau survei"
                  onChange={(event) => edit(row.area, { finding: event.target.value })}
                />
              </label>
              <label className="block text-xs font-medium">
                Rekomendasi pekerjaan
                <Input
                  className="mt-2"
                  maxLength={400}
                  value={row.recommendation}
                  placeholder="Contoh: perbaiki kebocoran atap"
                  onChange={(event) => edit(row.area, { recommendation: event.target.value })}
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  !row.finding.trim() || !row.recommendation.trim() || project.rab.length >= 200
                }
                onClick={() => sendToRab(row)}
              >
                <Plus className="size-4" /> Masukkan ke RAB
              </Button>
            </div>
          </article>
        ))}
      </div>
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <Button type="button" variant="outline" onClick={() => onNavigate("rab")}>
        Buka tabel RAB renovasi
      </Button>
    </section>
  );
}
