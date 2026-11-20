import { beforeEach, describe, expect, it } from "vitest";
import { baseScenario, stressedScenario } from "@/lib/simulation";
import { useSimulationStore } from "@/stores/simulation-store";

const original = useSimulationStore.getState();
beforeEach(() => {
  useSimulationStore.setState(original, true);
});
describe("Asset simulation state", () => {
  it("updates a selected property's input without changing another asset", () => {
    useSimulationStore.getState().setField("cibinong", "renovationCosts", "85000000");
    expect(useSimulationStore.getState().simulations.cibinong.inputs.renovationCosts).toBe(
      "85000000",
    );
    expect(useSimulationStore.getState().simulations.sawangan.inputs.renovationCosts).toBe(
      "70000000",
    );
  });
  it("updates verification independently", () => {
    useSimulationStore.getState().setCheck("sawangan", "occupancy", true);
    expect(useSimulationStore.getState().simulations.sawangan.verification.occupancy).toBe(true);
  });
  it("fills all six inputs for a stressed scenario", () => {
    useSimulationStore.getState().setScenario("cibinong", "stressed", stressedScenario);
    expect(useSimulationStore.getState().simulations.cibinong.inputs.salePrice).toBe("450000000");
    expect(useSimulationStore.getState().simulations.cibinong.inputs.renovationCosts).toBe(
      "85000000",
    );
    expect(useSimulationStore.getState().simulations.cibinong.inputs.holdingAndSaleCosts).toBe(
      "30000000",
    );
    useSimulationStore.getState().setScenario("cibinong", "base", baseScenario);
    expect(useSimulationStore.getState().simulations.cibinong.inputs.salePrice).toBe("480000000");
  });
});
