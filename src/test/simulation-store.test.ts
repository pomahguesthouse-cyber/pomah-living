import { beforeEach, describe, expect, it } from "vitest";
import { baseScenario, stressedScenario } from "@/lib/simulation";
import { useSimulationStore } from "@/stores/simulation-store";

const original = useSimulationStore.getState();
beforeEach(() => {
  useSimulationStore.setState(original, true);
});
describe("Asset simulation state", () => {
  it("updates a selected property's input without changing another asset", () => {
    useSimulationStore.getState().setField("banyumanik", "renovationCosts", "85000000");
    expect(useSimulationStore.getState().simulations.banyumanik.inputs.renovationCosts).toBe(
      "85000000",
    );
    expect(useSimulationStore.getState().simulations.tembalang.inputs.renovationCosts).toBe(
      "70000000",
    );
  });
  it("updates verification independently", () => {
    useSimulationStore.getState().setCheck("tembalang", "occupancy", true);
    expect(useSimulationStore.getState().simulations.tembalang.verification.occupancy).toBe(true);
  });
  it("fills all six inputs for a stressed scenario", () => {
    useSimulationStore.getState().setScenario("banyumanik", "stressed", stressedScenario);
    expect(useSimulationStore.getState().simulations.banyumanik.inputs.salePrice).toBe("450000000");
    expect(useSimulationStore.getState().simulations.banyumanik.inputs.renovationCosts).toBe(
      "85000000",
    );
    expect(useSimulationStore.getState().simulations.banyumanik.inputs.holdingAndSaleCosts).toBe(
      "30000000",
    );
    useSimulationStore.getState().setScenario("banyumanik", "base", baseScenario);
    expect(useSimulationStore.getState().simulations.banyumanik.inputs.salePrice).toBe("480000000");
  });
});
