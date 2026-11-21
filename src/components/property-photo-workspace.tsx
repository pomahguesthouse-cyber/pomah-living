import { useEffect, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Photo = { id: string; url: string; name: string; area: string; notes: string; stage: "before" | "after" };
const areas = ["Fasad", "Atap", "Struktur", "Dinding", "Lantai", "Plafon", "Dapur", "Kamar mandi", "Listrik / plumbing", "Lainnya"];
const allowed = ["image/jpeg", "image/png", "image/webp"];

export function PropertyPhotoWorkspace() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  useEffect(() => () => { photos.forEach((photo) => URL.revokeObjectURL(photo.url)); }, [photos]);
  function addFiles(files: FileList | null, stage: "before" | "after") {
    if (!files) return;
    const valid = Array.from(files).filter((file) => allowed.includes(file.type) && file.size <= 10 * 1024 * 1024);
    setError(valid.length !== files.length ? "Sebagian foto dilewati. Gunakan JPG, PNG, atau WebP maksimal 10 MB per foto." : "");
    if (!valid.length) return;
    setPhotos((old) => [...old, ...valid.slice(0, Math.max(0, 24 - old.length)).map((file) => ({
      id: crypto.randomUUID(), url: URL.createObjectURL(file), name: file.name,
      area: "Fasad", notes: "", stage,
    }))]);
  }
  function patch(id: string, data: Partial<Photo>) {
    setPhotos((old) => old.map((photo) => photo.id === id ? { ...photo, ...data } : photo));
  }
  function remove(id: string) {
    setPhotos((old) => old.filter((photo) => photo.id !== id));
  }
  const before = photos.filter((photo) => photo.stage === "before");
  const after = photos.filter((photo) => photo.stage === "after");
  return (
    <section aria-labelledby="condition-title" className="space-y-5">
      <div>
        <h2 id="condition-title" className="flex items-center gap-2 text-lg font-semibold"><Camera className="size-5" /> Dokumentasi kondisi & before-after</h2>
        <p className="mt-2 text-sm text-muted-foreground">Unggah foto kondisi aset dan konsep hasil renovasi. Tandai ruangan, kerusakan terlihat, dan pekerjaan yang perlu disurvei. Fitur ini belum menjalankan analisis AI otomatis atau menghitung RAB dari gambar.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["before", "after"] as const).map((stage) => (
          <label key={stage} className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 p-5 text-center text-sm">
            <ImagePlus className="size-6 text-brand" />
            <span className="font-semibold">{stage === "before" ? "Unggah foto kondisi awal" : "Unggah foto desain / hasil renovasi"}</span>
            <span className="text-xs text-muted-foreground">JPG, PNG, WebP · maksimal 10 MB/foto</span>
            <input aria-label={stage === "before" ? "Foto sebelum renovasi" : "Foto sesudah renovasi"} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { addFiles(e.target.files, stage); e.target.value = ""; }} />
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Foto hanya ditampilkan sementara di perangkat pada sesi ini, tidak diunggah ke server atau disimpan dalam proyek. Maksimal 24 foto. Jangan anggap ilustrasi AI sebagai kondisi aktual setelah renovasi.</p>
      {(["before", "after"] as const).map((stage) => {
        const items = stage === "before" ? before : after;
        return <section key={stage} className="space-y-3">
          <h3 className="font-semibold">{stage === "before" ? "Kondisi awal" : "Rencana / hasil renovasi"} ({items.length})</h3>
          {items.length === 0 && <p className="text-sm text-muted-foreground">Belum ada foto.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((photo) => <div key={photo.id} className="min-w-0 space-y-3 rounded-lg border border-border p-3">
              <img src={photo.url} alt={photo.name} className="aspect-[4/3] w-full rounded-md object-cover" />
              <p className="truncate text-xs text-muted-foreground" title={photo.name}>{photo.name}</p>
              <label className="block text-xs">Area bangunan
                <select value={photo.area} onChange={(e) => patch(photo.id, { area: e.target.value })} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2">
                  {areas.map((area) => <option key={area}>{area}</option>)}
                </select>
              </label>
              <label className="block text-xs">{stage === "before" ? "Kerusakan terlihat / pemeriksaan lanjutan" : "Konsep finishing / perubahan"}
                <Input className="mt-1" value={photo.notes} maxLength={500} placeholder={stage === "before" ? "Contoh: bercak lembap di plafon, perlu cek kebocoran" : "Contoh: cat baru dan pencahayaan hangat"} onChange={(e) => patch(photo.id, { notes: e.target.value })} />
              </label>
              <Button variant="outline" size="sm" type="button" onClick={() => remove(photo.id)}><Trash2 className="size-4" /> Hapus foto</Button>
            </div>)}
          </div>
        </section>;
      })}
      <div className="rounded-md bg-muted/60 p-4 text-xs leading-6">
        <strong>Langkah berikutnya:</strong> sambungkan unggahan privat per proyek ke penyimpanan terproteksi, lalu analisis AI di server untuk mengusulkan item pekerjaan. Setiap temuan wajib diverifikasi melalui survei dan pengukuran volume sebelum masuk RAB.
      </div>
    </section>
  );
}
