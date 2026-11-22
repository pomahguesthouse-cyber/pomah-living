import { z } from "zod";
import { flippingSchema, makeFlippingProject, readFlippingProject } from "@/lib/flipping";
import { getProperty } from "@/lib/properties";

export const demoIds = ["demo", "cibinong", "sawangan", "jatiasih"] as const;
export const maxDemoPhotos = 24;
export const maxDemoPhotoBytes = 10 * 1024 * 1024;
export const demoPhotoExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export const demoPhotoStages = ["before", "after"] as const;
export const demoPhotoStageLabels = {
  before: "Kondisi awal",
  after: "Desain atau hasil renovasi",
} as const;
const demoPhotoSchema = z.object({
  path: z.string().regex(/^(demo|cibinong|sawangan|jatiasih)\/[a-f0-9-]{36}\.(jpg|png|webp)$/),
  stage: z.enum(demoPhotoStages),
  caption: z.string().max(200),
});
export type DemoPhoto = z.infer<typeof demoPhotoSchema>;
export const demoSampleSchema = z
  .object({
    id: z.enum(demoIds),
    description: z.string().max(2000),
    project: flippingSchema,
    revision: z.number().int().min(0),
    photos: z.array(demoPhotoSchema).max(maxDemoPhotos).default([]),
  })
  .refine(
    (sample) =>
      sample.photos.every(({ path }) => path.startsWith(`${sample.id}/`)) &&
      new Set(sample.photos.map(({ path }) => path)).size === sample.photos.length,
  );
export type DemoSample = z.infer<typeof demoSampleSchema>;
export function canonicalDemoId(id: string) {
  return id === "demo" ? "demo" : getProperty(id)?.id;
}
export function fixtureDemo(id: string): DemoSample {
  const canonical = canonicalDemoId(id);
  if (!canonical) throw new Error("Demo tidak ditemukan.");
  return demoSampleSchema.parse({
    id: canonical,
    description: "Contoh proyek flipping fiktif, bukan penawaran lelang atau jaminan keuntungan.",
    project: makeFlippingProject(canonical),
    revision: 0,
  });
}
export function demoStorageKey(sample: DemoSample) {
  return `pomah:flipping:demo:${sample.id}:revision:${sample.revision}`;
}
export function restoreDemoSample(sample: DemoSample, raw: string | null, legacy?: string | null) {
  if (!raw) {
    // Only the original fixture can inherit pre-revision browser edits.
    if (sample.revision !== 0 || !legacy) return sample.project;
    try {
      return readFlippingProject(JSON.parse(legacy));
    } catch {
      return sample.project;
    }
  }
  try {
    const envelope = z
      .object({ revision: z.number(), project: flippingSchema })
      .parse(JSON.parse(raw));
    return envelope.revision === sample.revision ? envelope.project : sample.project;
  } catch {
    return sample.project;
  }
}
export function serializeDemoEdit(sample: DemoSample, project: unknown) {
  return JSON.stringify({ revision: sample.revision, project: readFlippingProject(project) });
}
