import { useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { DemoPhotoPreview } from "@/components/demo-photo-gallery";
import { useDemoPhotoUrls } from "@/hooks/use-demo-photo-urls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  demoPhotoStageLabels,
  demoPhotoStages,
  maxDemoPhotos,
  type DemoPhoto,
  type DemoSample,
} from "@/lib/flipping-demos";
import { isDemoPhotoFile, uploadDemoPhoto } from "@/services/flipping-demo-photo-service";

export function AdminDemoPhotos({
  sample,
  userId,
  onChange,
  setBusy,
}: {
  sample: DemoSample;
  userId: string;
  onChange: (photos: DemoPhoto[]) => void;
  setBusy: (busy: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const urls = useDemoPhotoUrls(sample.photos, `admin:${userId}`);
  const remaining = maxDemoPhotos - sample.photos.length;

  async function addFiles(stage: DemoPhoto["stage"], files: File[]) {
    const eligible = files.filter(isDemoPhotoFile);
    const batch = eligible.slice(0, remaining);
    setUploading(true);
    setBusy(true);
    try {
      const uploaded: DemoPhoto[] = [];
      let failed = 0;
      // Upload sequentially to keep browser memory and bandwidth predictable.
      for (const file of batch) {
        try {
          uploaded.push(await uploadDemoPhoto(sample.id, stage, file));
        } catch {
          failed++;
        }
      }
      if (uploaded.length) onChange([...sample.photos, ...uploaded]);
      setMessage(
        [
          uploaded.length
            ? `${uploaded.length} foto ditambahkan. Simpan draf untuk menyimpan galeri.`
            : "",
          failed ? `${failed} foto gagal diunggah. Coba lagi.` : "",
          eligible.length < files.length
            ? "Gunakan JPG, PNG, atau WebP maksimal 10 MB per foto."
            : "",
          eligible.length > batch.length ? `Maksimal ${maxDemoPhotos} foto per demo.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    } finally {
      setUploading(false);
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4" aria-label="Kelola foto demo">
      <p className="text-sm text-muted-foreground">
        Foto baru terlihat oleh pengunjung setelah demo dipublikasikan. JPG, PNG, atau WebP maksimal
        10 MB per foto.
      </p>
      <p className="text-sm">
        {sample.photos.length} dari {maxDemoPhotos} foto
      </p>
      {uploading && <p role="status">Mengunggah foto…</p>}
      {message && !uploading && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {urls.isError && (
        <Button type="button" variant="outline" onClick={() => void urls.refetch()}>
          Muat ulang pratinjau
        </Button>
      )}
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {demoPhotoStages.map((stage) => (
          <section key={stage} className="min-w-0 space-y-3 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">{demoPhotoStageLabels[stage]}</h3>
            <label className="block space-y-2 text-sm">
              <span className="flex items-center gap-2">
                <Upload className="size-4" /> Tambah foto
              </span>
              <Input
                type="file"
                aria-label={`Tambah foto ${demoPhotoStageLabels[stage]}`}
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={!remaining || uploading}
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []);
                  event.currentTarget.value = "";
                  if (files.length) void addFiles(stage, files);
                }}
              />
            </label>
            {sample.photos
              .filter((photo) => photo.stage === stage)
              .map((photo) => (
                <div key={photo.path} className="min-w-0 space-y-2 rounded-md border p-3">
                  <DemoPhotoPreview
                    url={urls.data?.[photo.path]}
                    caption={photo.caption || demoPhotoStageLabels[stage]}
                    loading={urls.isPending}
                  />
                  <label className="block space-y-1 text-sm">
                    Keterangan foto
                    <Input
                      value={photo.caption}
                      maxLength={200}
                      onChange={(event) =>
                        onChange(
                          sample.photos.map((item) =>
                            item.path === photo.path
                              ? { ...item, caption: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onChange(sample.photos.filter((item) => item.path !== photo.path))
                    }
                  >
                    <Trash2 /> Hapus dari galeri
                  </Button>
                </div>
              ))}
          </section>
        ))}
      </div>
    </section>
  );
}
