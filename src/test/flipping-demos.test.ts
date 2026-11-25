import { describe, expect, it } from "vitest";
import {
  canonicalDemoId,
  demoIds,
  demoStorageKey,
  demoSampleSchema,
  fixtureDemo,
  restoreDemoSample,
  serializeDemoEdit,
} from "@/lib/flipping-demos";
describe("Shared demo revisions", () => {
  it("preserves canonical fixture IDs and defaults", () => {
    expect(demoIds).toEqual(["demo", "cibinong", "sawangan", "jatiasih"]);
    expect(canonicalDemoId("banyumanik")).toBe("cibinong");
    expect(canonicalDemoId("private-uuid")).toBeUndefined();
    expect(fixtureDemo("demo").project.finance.purchase).toBe(300000000);
  });
  it("does not let an older local revision shadow a publication", () => {
    const sample = { ...fixtureDemo("demo"), revision: 2 };
    const older = serializeDemoEdit(
      { ...sample, revision: 1 },
      { ...sample.project, finance: { ...sample.project.finance, purchase: 1 } },
    );
    expect(restoreDemoSample(sample, older).finance.purchase).toBe(300000000);
    expect(demoStorageKey(sample)).not.toBe(demoStorageKey({ ...sample, revision: 1 }));
  });
  it("retains user edits only within the current revision", () => {
    const sample = { ...fixtureDemo("demo"), revision: 2 };
    const edited = {
      ...sample.project,
      finance: { ...sample.project.finance, purchase: 123000000 },
    };
    expect(restoreDemoSample(sample, serializeDemoEdit(sample, edited)).finance.purchase).toBe(
      123000000,
    );
    expect(restoreDemoSample(sample, "{invalid")).toEqual(sample.project);
  });
  it("recovers legacy browser edits only for the original fixture", () => {
    const sample = fixtureDemo("demo");
    const legacy = JSON.stringify({
      ...sample.project,
      finance: { ...sample.project.finance, purchase: 123_000_000 },
    });
    expect(restoreDemoSample(sample, null, legacy).finance.purchase).toBe(123_000_000);
    expect(restoreDemoSample({ ...sample, revision: 1 }, null, legacy)).toEqual(sample.project);
  });
  it("defaults old demos to an empty gallery", () => {
    const { photos: _photos, ...legacy } = fixtureDemo("demo");
    expect(demoSampleSchema.parse(legacy).photos).toEqual([]);
  });

  it("allows photos only from the same demo and rejects duplicate paths", () => {
    const sample = fixtureDemo("demo");
    const photo = {
      path: "demo/12345678-1234-1234-1234-123456789abc.webp",
      stage: "before",
      caption: "Fasad",
    };
    expect(demoSampleSchema.parse({ ...sample, photos: [photo] }).photos).toEqual([photo]);
    expect(demoSampleSchema.safeParse({ ...sample, photos: [photo, photo] }).success).toBe(false);
    expect(demoSampleSchema.safeParse({ ...sample, id: "jatiasih", photos: [photo] }).success).toBe(
      false,
    );
  });
});

describe("Demo yang dihapus admin", () => {
  it("contoh bawaan tidak tersembunyi", () => {
    expect(fixtureDemo("demo").hidden).toBe(false);
  });

  it("status tersembunyi ikut tersimpan saat divalidasi ulang", () => {
    const hidden = demoSampleSchema.parse({ ...fixtureDemo("cibinong"), hidden: true });
    expect(hidden.hidden).toBe(true);
    const legacy: Partial<ReturnType<typeof fixtureDemo>> = { ...fixtureDemo("cibinong") };
    delete legacy.hidden;
    expect(demoSampleSchema.parse(legacy).hidden).toBe(false);
  });
});
