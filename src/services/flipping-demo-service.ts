import { supabase } from "@/integrations/supabase/client";
import { demoIds, demoSampleSchema, fixtureDemo, type DemoSample } from "@/lib/flipping-demos";
import type { Tables, Json } from "@/integrations/supabase/types";

function readSample(row: Tables<"pomah_flipping_demos">): DemoSample {
  return demoSampleSchema.parse({
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
    payload: JSON.parse(JSON.stringify(valid.project)) as Json,
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
