import { expect, it } from "vitest";
import { makeFlippingProject } from "@/lib/flipping";
import { useFlippingStore } from "@/stores/flipping-store";

it("isolates demo and account-specific state and removes private state", () => {
  const demo = makeFlippingProject("demo");
  useFlippingStore.getState().setProject("demo:demo", demo);
  useFlippingStore
    .getState()
    .setProject("user-a:project", { ...demo, finance: { ...demo.finance, purchase: 123 } });
  expect(useFlippingStore.getState().projects["demo:demo"]?.finance.purchase).toBe(300_000_000);
  expect(useFlippingStore.getState().projects["user-b:project"]).toBeUndefined();
  useFlippingStore.getState().removeProject("user-a:project");
  expect(useFlippingStore.getState().projects["user-a:project"]).toBeUndefined();
});
