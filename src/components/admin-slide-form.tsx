import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Eye, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  isSafeImageUrl,
  slideDetailsSchema,
  slideImageExtension,
  type SlideInput,
} from "@/lib/admin";
import { adminError, type HeroSlide } from "@/services/admin-service";
import { resolveHeroSlideImages, uploadHeroSlideImage } from "@/services/hero-slide-image-service";

export function AdminSlideForm({
  slide,
  busy,
  save,
  remove,
}: {
  slide?: HeroSlide;
  busy: boolean;
  save: (
    value: Omit<SlideInput, "image_url">,
    image: () => Promise<string>,
    id?: string,
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
}) {
  const [published, setPublished] = useState(slide?.published ?? false);
  const existingImage = slide?.image_url ?? "";
  const [file, setFile] = useState<File>();
  const [objectUrl, setObjectUrl] = useState("");
  const [uploadedImage, setUploadedImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState(slide?.title ?? "");
  const [description, setDescription] = useState(slide?.description ?? "");
  const [preview, setPreview] = useState(false);
  const [brokenImage, setBrokenImage] = useState("");
  const [error, setError] = useState("");
  const savedPreview = useQuery({
    queryKey: ["admin-hero-slide-image", existingImage],
    queryFn: async () => (await resolveHeroSlideImages([existingImage])).get(existingImage) ?? null,
    enabled: preview && !file && isSafeImageUrl(existingImage),
    staleTime: 240_000,
    refetchInterval: 240_000,
    retry: false,
  });
  const previewImage = file ? objectUrl : savedPreview.data;
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || uploading) return;
    const form = new FormData(event.currentTarget);
    const val = (key: string) => String(form.get(key) ?? "").trim();
    const result = slideDetailsSchema.safeParse({
      title,
      description,
      eyebrow: val("eyebrow"),
      image_alt: val("image_alt"),
      button_label: val("button_label"),
      button_href: val("button_href"),
      sort_order: Number(val("sort_order")),
      published,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Periksa isian slide.");
      return;
    }
    if (!file && !isSafeImageUrl(existingImage)) {
      setError("Pilih gambar untuk slide ini.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      await save(
        result.data,
        async () => {
          if (!file) return existingImage;
          const imageUrl = uploadedImage || (await uploadHeroSlideImage(file));
          setUploadedImage(imageUrl);
          return imageUrl;
        },
        slide?.id,
      );
    } catch (cause) {
      setError(adminError(cause));
    } finally {
      setUploading(false);
    }
  }
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">
          {slide ? `Slide · urutan ${slide.sort_order}` : "Tambah slide"}
        </h3>
        <span
          className={`rounded-md px-2 py-1 text-xs ${slide?.published ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}
        >
          {slide?.published ? "Terpublikasi" : "Draf"}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium">
          Label atas
          <Input
            name="eyebrow"
            className="mt-2"
            maxLength={100}
            defaultValue={slide?.eyebrow ?? ""}
          />
        </label>
        <label className="text-xs font-medium">
          Judul
          <Input
            name="title"
            className="mt-2"
            maxLength={160}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="text-xs font-medium sm:col-span-2">
          <span className="flex items-center gap-2">
            <Upload className="size-4" /> Unggah gambar slide
          </span>
          <Input
            className="mt-2"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || uploading}
            onChange={(event) => {
              const selected = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!selected) return;
              if (!slideImageExtension(selected)) {
                setError("Pilih JPG, PNG, atau WebP maksimal 10 MB.");
                return;
              }
              setFile(selected);
              setUploadedImage("");
              setObjectUrl("");
              setBrokenImage("");
              setError("");
              setPreview(true);
            }}
          />
          <span className="mt-2 block text-muted-foreground">
            {file
              ? file.name
              : existingImage
                ? "Pilih file untuk mengganti gambar slide ini."
                : "JPG, PNG, atau WebP maksimal 10 MB."}
          </span>
        </label>
        <label className="text-xs font-medium">
          Deskripsi gambar
          <Input
            name="image_alt"
            className="mt-2"
            maxLength={180}
            required
            defaultValue={slide?.image_alt ?? ""}
          />
        </label>
        <label className="text-xs font-medium">
          Urutan
          <Input
            name="sort_order"
            className="mt-2"
            type="number"
            min={0}
            max={999}
            step={1}
            required
            defaultValue={slide?.sort_order ?? 0}
          />
        </label>
        <label className="text-xs font-medium">
          Teks tombol
          <Input
            name="button_label"
            className="mt-2"
            maxLength={80}
            required
            defaultValue={slide?.button_label ?? "Jelajahi aset"}
          />
        </label>
        <label className="text-xs font-medium">
          Tujuan tombol
          <select
            name="button_href"
            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3"
            defaultValue={slide?.button_href ?? "/pilih-aset"}
          >
            <option value="/pilih-aset">Pilih aset</option>
            <option value="/proyek/demo">Proyek demo</option>
          </select>
        </label>
        <label className="text-xs font-medium sm:col-span-2">
          Deskripsi
          <Textarea
            className="mt-2"
            name="description"
            maxLength={350}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Switch
          id={`published-${slide?.id ?? "new"}`}
          checked={published}
          onCheckedChange={setPublished}
        />
        <label htmlFor={`published-${slide?.id ?? "new"}`} className="text-sm">
          Tampilkan di beranda
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || uploading}>
          <Save /> {uploading ? "Menyimpan…" : slide ? "Simpan perubahan" : "Tambah slide"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setPreview(!preview)}>
          <Eye /> Pratinjau
        </Button>
        {slide && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy || uploading}
            onClick={() => void remove(slide.id)}
          >
            <Trash2 /> Hapus
          </Button>
        )}
      </div>
      {preview && (
        <div className="mt-5 border-t border-border pt-5">
          {previewImage && brokenImage !== previewImage ? (
            <img
              src={previewImage}
              alt="Pratinjau gambar slide"
              referrerPolicy="no-referrer"
              onError={() => setBrokenImage(previewImage)}
              className="aspect-[16/9] w-full rounded-md object-cover"
            />
          ) : (
            <p role="alert" className="text-sm text-destructive">
              {file
                ? "Gambar belum dapat ditampilkan."
                : savedPreview.isFetching
                  ? "Memuat gambar…"
                  : existingImage
                    ? "Gambar belum dapat ditampilkan."
                    : "Pilih gambar untuk melihat pratinjau."}
            </p>
          )}
          <h4 className="mt-3 text-lg font-semibold">{title}</h4>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <ArrowRight className="mt-3 size-5 text-primary" />
        </div>
      )}
    </form>
  );
}
