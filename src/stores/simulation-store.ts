import { create } from "zustand";
import { properties, type PropertyId } from "@/lib/properties";
import {
  toInputs,
  type CheckKey,
  type SimulationField,
  type SimulationInputs,
  type SimulationValues,
  type Verification,
} from "@/lib/simulation";

export type AssetSimulation = {
  inputs: SimulationInputs;
  verification: Verification;
  scenario: "base" | "stressed" | "custom";
};
const initialSimulations = Object.fromEntries(
  properties.map((property) => [
    property.id,
    {
      inputs: toInputs(property.initialValues),
      verification: { ...property.verification },
      scenario: property.id === "ngaliyan" ? "stressed" : "base",
    },
  ]),
) as Record<PropertyId, AssetSimulation>;

type SimulationStore = {
  simulations: Record<PropertyId, AssetSimulation>;
  setField: (id: PropertyId, field: SimulationField, value: string) => void;
  setCheck: (id: PropertyId, key: CheckKey, verified: boolean) => void;
  setScenario: (id: PropertyId, scenario: "base" | "stressed", values: SimulationValues) => void;
};
export const useSimulationStore = create<SimulationStore>((set) => ({
  simulations: initialSimulations,
  setField: (id, field, value) =>
    set((state) => ({
      simulations: {
        ...state.simulations,
        [id]: {
          ...state.simulations[id],
          scenario: "custom",
          inputs: { ...state.simulations[id].inputs, [field]: value },
        },
      },
    })),
  setCheck: (id, key, verified) =>
    set((state) => ({
      simulations: {
        ...state.simulations,
        [id]: {
          ...state.simulations[id],
          verification: { ...state.simulations[id].verification, [key]: verified },
        },
      },
    })),
  setScenario: (id, scenario, values) =>
    set((state) => ({
      simulations: {
        ...state.simulations,
        [id]: { ...state.simulations[id], scenario, inputs: toInputs(values) },
      },
    })),
}));
