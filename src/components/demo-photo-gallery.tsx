import { demoPhotoStageLabels, demoPhotoStages, type DemoPhoto } from "@/lib/flipping-demos";
import { useDemoPhotoUrls } from "@/hooks/use-demo-photo-urls";

export function DemoPhotoPreview({
  url,
  caption,
  loading,
}: {
  url: string | undefined;
  caption: string;
  loading: boolean;
}) {
  return url ? (
    <img
      src={url}
      alt={caption}
      loading="lazy"
      className="aspect-[4/3] w-full rounded-md object-cover"
    />
  ) : (
    <div className="grid aspect-[4/3] place-items-center rounded-md bg-muted px-3 text-center text-xs text-muted-foreground">
      {loading ? "Memuat foto…" : "Foto tidak tersedia"}
    </div>
  );
}

export function DemoPhotoGallery({ photos }: { photos: DemoPhoto[] }) {
  const urls = useDemoPhotoUrls(photos, "public");
  return (
    <section className="mb-8 space-y-5" aria-label="Galeri Flipping Demo">
      <h2 className="text-lg font-semibold">Galeri Flipping Demo</h2>
      {urls.isError && (
        <button type="button" className="text-sm underline" onClick={() => void urls.refetch()}>
          Muat ulang foto
        </button>
      )}
      {demoPhotoStages.map((stage) => {
        const items = photos.filter((photo) => photo.stage === stage);
        return (
          items.length > 0 && (
            <section key={stage} className="space-y-3">
              <h3 className="text-sm font-semibold">{demoPhotoStageLabels[stage]}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((photo) => (
                  <figure key={photo.path} className="min-w-0 space-y-2 rounded-lg border p-3">
                    <DemoPhotoPreview
                      url={urls.data?.[photo.path]}
                      caption={photo.caption || demoPhotoStageLabels[stage]}
                      loading={urls.isPending}
                    />
                    {photo.caption && (
                      <figcaption className="break-words text-sm">{photo.caption}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )
        );
      })}
    </section>
  );
}
