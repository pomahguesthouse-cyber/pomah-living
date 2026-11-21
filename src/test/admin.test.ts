import { describe, expect, it } from "vitest";
import { canReviewApproval, isSafeImageUrl, slideSchema } from "@/lib/admin";

describe("Admin input boundaries", () => {
  it("accepts public HTTPS images", () => {
    expect(isSafeImageUrl("https://images.pomahliving.com/house.webp")).toBe(true);
  });
  it("rejects unsafe image destinations", () => {
    for (const url of [
      "javascript:alert(1)",
      "http://example.com/a",
      "https://localhost/a",
      "https://127.0.0.1/a",
      "https://user:pass@example.com/a",
      "https://example.com:8080/a",
      "https://images.internal/a",
    ])
      expect(isSafeImageUrl(url)).toBe(false);
  });
  it("only allows known local CTA destinations", () => {
    const slide = {
      title: "Rumah",
      eyebrow: "",
      description: "",
      image_url: "https://example.com/a.webp",
      image_alt: "Rumah",
      button_label: "Lihat",
      button_href: "https://evil.example",
      sort_order: 0,
      published: false,
    };
    expect(slideSchema.safeParse(slide).success).toBe(false);
    expect(slideSchema.safeParse({ ...slide, button_href: "/pilih-aset" }).success).toBe(true);
  });
  it("only pending applications can be reviewed", () => {
    expect(canReviewApproval("pending")).toBe(true);
    for (const status of ["approved", "rejected", "revision", "regular"])
      expect(canReviewApproval(status)).toBe(false);
  });
});
