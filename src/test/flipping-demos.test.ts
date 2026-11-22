import { describe, expect, it } from "vitest";
import {
  canonicalDemoId,
  demoIds,
  demoStorageKey,
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
});
