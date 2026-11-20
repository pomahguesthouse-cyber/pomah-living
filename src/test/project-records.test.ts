import { describe, expect, it } from "vitest";
import { projectProfit, readProjectFields } from "@/lib/project-records";

function projectForm(status: string) {
  const fields = new FormData();
  fields.set("name", " Rumah Cibinong ");
  fields.set("status", status);
  return fields;
}

describe("Project financial details", () => {
  it("keeps unknown figures distinct from zero", () => {
    const fields = projectForm("analysis");
    fields.set("actual_cost", "0");
    expect(readProjectFields(fields)).toMatchObject({
      name: "Rumah Cibinong",
      actual_sale: null,
      actual_cost: 0,
    });
    expect(projectProfit(null, 0)).toBeNull();
    expect(projectProfit(0, 0)).toBe(0);
  });

  it("requires actual figures when sold and keeps losses", () => {
    const fields = projectForm("sold");
    expect(() => readProjectFields(fields)).toThrow("sebelum menandai proyek terjual");
    fields.set("actual_sale", "400000000");
    fields.set("actual_cost", "420000000");
    const { actual_sale, actual_cost } = readProjectFields(fields);
    expect(projectProfit(actual_sale, actual_cost)).toBe(-20_000_000);
  });

  it("rejects unsupported status and invalid rupiah amounts", () => {
    expect(() => readProjectFields(projectForm("unknown"))).toThrow("Pilih status proyek");
    const fields = projectForm("analysis");
    fields.set("expected_cost", "1e8");
    expect(() => readProjectFields(fields)).toThrow("rupiah bulat");
  });
});
