import { supabase } from "@/integrations/supabase/client";
import { demoIds, demoSampleSchema, fixtureDemo, type DemoSample } from "@/lib/flipping-demos";
import type { Tables, Json } from "@/integrations/supabase/types";

function readSample(row: Tables<"pomah_flipping_demos">): DemoSample {
  const payload = row.payload;
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  return demoSampleSchema.parse({
    photos: record["demoPhotos"],
    hidden: record["demoHidden"] === true,
    id: row.id,
    description: row.description,
    project: row.payload,
    revision: row.revision,
  });
}
export const publishedDemoKey = ["published-flipping-demos"];
export async function fetchPublishedDemos() {
  const { data, error } = await supabase
    .from("pomah_flipping_demos")
    .select("*")
    .eq("published", true);
  if (error) throw error;
  return demoIds.map((id) => {
    const row = data.find((item) => item.id === id);
    return row ? readSample(row) : fixtureDemo(id);
  });
}
export async function fetchAdminDemos() {
  const { data, error } = await supabase.from("pomah_flipping_demos").select("*");
  if (error) throw error;
  return demoIds.map((id) => {
    const draft = data.find((row) => row.id === id && !row.published);
    const published = data.find((row) => row.id === id && row.published);
    return {
      sample: draft
        ? readSample(draft)
        : published
          ? { ...readSample(published), revision: 0 }
          : fixtureDemo(id),
      publishedRevision: published?.revision ?? 0,
      /** Status yang dilihat publik: tersembunyi bila versi publik ditandai dihapus. */
      publicHidden: published ? readSample(published).hidden : false,
    };
  });
}
export async function saveDemoSample(
  sample: DemoSample,
  published: boolean,
  expectedRevision: number,
) {
  const valid = demoSampleSchema.parse(sample);
  const values = {
    id: valid.id,
    published,
    description: valid.description,
    payload: JSON.parse(
      JSON.stringify({ ...valid.project, demoPhotos: valid.photos, demoHidden: valid.hidden }),
    ) as Json,
  };
  const result =
    expectedRevision === 0
      ? await supabase.from("pomah_flipping_demos").insert(values).select("*").single()
      : await supabase
          .from("pomah_flipping_demos")
          .update(values)
          .eq("id", valid.id)
          .eq("published", published)
          .eq("revision", expectedRevision)
          .select("*")
          .single();
  if (result.error?.code === "PGRST116" || result.error?.code === "23505") {
    throw new Error("Versi demo sudah berubah. Salin perubahan Anda lalu muat ulang halaman.");
  }
  if (result.error) throw result.error;
  return readSample(result.data);
}

/**
 * "Hapus" demo = sembunyikan dari publik. Id demo tetap di basis data (tanpa izin DELETE) dan
 * contoh bawaan kode akan muncul lagi bila barisnya hilang, jadi status disimpan di payload lalu
 * langsung dipublikasikan.
 */
export async function setDemoHidden(
  sample: DemoSample,
  hidden: boolean,
  publishedRevision: number,
) {
  const draft = await saveDemoSample({ ...sample, hidden }, false, sample.revision);
  const published = await saveDemoSample(draft, true, publishedRevision);
  return { draft, published };
}
