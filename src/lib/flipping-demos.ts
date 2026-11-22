import { z } from "zod";
import { flippingSchema, makeFlippingProject, readFlippingProject } from "@/lib/flipping";
import { getProperty } from "@/lib/properties";

export const demoIds = ["demo", "cibinong", "sawangan", "jatiasih"] as const;
export const demoSampleSchema = z.object({
  id: z.enum(demoIds),
  description: z.string().max(2000),
  project: flippingSchema,
  revision: z.number().int().min(0),
});
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
export function restoreDemoSample(sample: DemoSample, raw: string | null) {
  if (!raw) return sample.project;
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
