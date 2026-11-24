import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";

describe("Sign-in return path", () => {
  it("accepts internal paths", () => {
    expect(safeRedirect("/analisis/rumah-cilodong")).toBe("/analisis/rumah-cilodong");
  });
  it.each(["https://evil.test", "//evil.test", "javascript:alert(1)", "/a b", 42, undefined])(
    "rejects %s",
    (value) => {
      expect(safeRedirect(value)).toBeUndefined();
    },
  );
});
