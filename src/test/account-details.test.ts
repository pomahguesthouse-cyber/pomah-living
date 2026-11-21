import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAccountDetails, saveAccountDetails } from "@/services/account-details";

const { select, maybeSingle, upsert, saveSelect } = vi.hoisted(() => ({
  select: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
  saveSelect: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select, upsert }) },
}));

beforeEach(() => {
  maybeSingle.mockReset();
  select.mockReset().mockReturnValue({ eq: () => ({ maybeSingle }) });
});

describe("Account experience preference", () => {
  it("keeps explicitly selected Tidak ada", async () => {
    const details = { full_name: "Akun uji", has_property_experience: false };
    maybeSingle.mockResolvedValueOnce({ data: details, error: null });
    await expect(fetchAccountDetails("test")).resolves.toEqual({
      details,
      experienceAvailable: true,
    });
  });

  it("loads the existing form if the new column has yet to be deployed", async () => {
    const details = { full_name: "Akun uji" };
    maybeSingle
      .mockResolvedValueOnce({
        data: null,
        error: { code: "42703", message: "column profiles.has_property_experience does not exist" },
      })
      .mockResolvedValueOnce({ data: details, error: null });

    await expect(fetchAccountDetails("test")).resolves.toEqual({
      details,
      experienceAvailable: false,
    });
    expect(select.mock.calls[1]?.[0]).not.toContain("has_property_experience");
  });

  it("propagates other errors", async () => {
    const error = { code: "42501", message: "permission denied" };
    maybeSingle.mockResolvedValueOnce({ data: null, error });
    await expect(fetchAccountDetails("test")).rejects.toEqual(error);
    expect(select).toHaveBeenCalledTimes(1);
  });
  it("saves existing fields without the new column during rollout", async () => {
    const details = {
      full_name: "Akun uji",
      birth_date: null,
      occupation: null,
      display_name: null,
      avatar_url: null,
      address: null,
      residence_province: null,
      residence_regency: null,
      contact_phone: null,
      preferred_regions: ["32"],
    };
    upsert.mockReturnValueOnce({ select: saveSelect });
    saveSelect.mockReturnValueOnce({
      single: () => ({ overrideTypes: async () => ({ data: details, error: null }) }),
    });

    await expect(saveAccountDetails("test", details)).resolves.toEqual(details);
    expect(upsert).toHaveBeenCalledWith({ id: "test", ...details });
    expect(saveSelect.mock.calls[0]?.[0]).not.toContain("has_property_experience");
  });
});
