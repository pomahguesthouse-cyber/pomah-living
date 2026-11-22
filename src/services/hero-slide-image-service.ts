import { supabase } from "@/integrations/supabase/client";
import { heroSlideImagePath, isSafeImageUrl, slideImageExtension } from "@/lib/admin";

const bucket = "hero-slide-images";
const signedUrlSeconds = 300;
const imageReplacements = new Map([
  ["06ca0225-c50a-4552-b5aa-7df43173b053.png", "/images/hero-banner-no-corner-logo.png"],
]);

export async function uploadHeroSlideImage(file: File) {
  const extension = slideImageExtension(file);
  if (!extension) throw new Error("Pilih JPG, PNG, atau WebP maksimal 10 MB.");
  const path = `${crypto.randomUUID()}.${extension}`;
  const storage = supabase.storage.from(bucket);
  const { error } = await storage.upload(path, file);
  if (error) throw error;
  // The stable URL identifies the object. The bucket remains private and is read with signed URLs.
  return storage.getPublicUrl(path).data.publicUrl;
}

export async function resolveHeroSlideImages(images: string[]) {
  const urls = new Map<string, string>();
  const uploaded = new Map<string, string>();
  for (const image of images.filter(isSafeImageUrl)) {
    const path = heroSlideImagePath(image);
    if (path && supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl === image) {
      // Replace only the original banner; later admin uploads keep their own images.
      const replacement = imageReplacements.get(path);
      if (replacement) urls.set(image, replacement);
      else uploaded.set(path, image);
    } else urls.set(image, image);
  }
  if (uploaded.size === 0) return urls;

  const storage = supabase.storage.from(bucket);
  const { data, error } = await storage.createSignedUrls([...uploaded.keys()], signedUrlSeconds);
  if (error && urls.size === 0) throw error;
  for (const entry of data ?? []) {
    const image = entry.path && uploaded.get(entry.path);
    if (image && entry.signedUrl && !entry.error) urls.set(image, entry.signedUrl);
  }
  return urls;
}
