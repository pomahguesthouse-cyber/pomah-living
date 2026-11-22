import { supabase } from "@/integrations/supabase/client";
import {
  demoPhotoExtensions,
  maxDemoPhotoBytes,
  type DemoPhoto,
  type DemoSample,
} from "@/lib/flipping-demos";

const bucket = "flipping-demo-photos";

export function isDemoPhotoFile(file: Pick<File, "type" | "size">) {
  return (
    Object.hasOwn(demoPhotoExtensions, file.type) && file.size > 0 && file.size <= maxDemoPhotoBytes
  );
}

export async function uploadDemoPhoto(
  id: DemoSample["id"],
  stage: DemoPhoto["stage"],
  file: File,
): Promise<DemoPhoto> {
  if (!isDemoPhotoFile(file)) throw new Error("Gunakan JPG, PNG, atau WebP maksimal 10 MB.");
  const extension = demoPhotoExtensions[file.type as keyof typeof demoPhotoExtensions];
  const path = `${id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  return { path, stage, caption: "" };
}

export async function fetchDemoPhotoUrls(paths: string[]) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, 300);
  if (error) throw error;
  return Object.fromEntries(
    data.flatMap((entry) =>
      entry.path && entry.signedUrl && !entry.error ? [[entry.path, entry.signedUrl]] : [],
    ),
  ) as Record<string, string>;
}
