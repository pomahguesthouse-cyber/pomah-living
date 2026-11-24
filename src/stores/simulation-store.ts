import { create } from "zustand";
import { properties } from "@/lib/properties";
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
      scenario: property.id === "jatiasih" ? "stressed" : "base",
    },
  ]),
) as Record<string, AssetSimulation>;

export function seedSimulation(
  values: SimulationValues,
  verification: Verification,
  scenario: AssetSimulation["scenario"] = "base",
): AssetSimulation {
  return { inputs: toInputs(values), verification: { ...verification }, scenario };
}

type SimulationStore = {
  simulations: Record<string, AssetSimulation>;
  /** Mendaftarkan simulasi awal untuk aset katalog; tidak menimpa simulasi yang sudah ada. */
  register: (id: string, seed: AssetSimulation) => void;
  setField: (id: string, field: SimulationField, value: string) => void;
  setCheck: (id: string, key: CheckKey, verified: boolean) => void;
  setScenario: (id: string, scenario: "base" | "stressed", values: SimulationValues) => void;
};
export const useSimulationStore = create<SimulationStore>((set) => ({
  simulations: initialSimulations,
  register: (id, seed) =>
    set((state) =>
      state.simulations[id] ? state : { simulations: { ...state.simulations, [id]: seed } },
    ),
  setField: (id, field, value) =>
    set((state) => {
      const current = state.simulations[id];
      if (!current) return state;
      return {
        simulations: {
          ...state.simulations,
          [id]: { ...current, scenario: "custom", inputs: { ...current.inputs, [field]: value } },
        },
      };
    }),
  setCheck: (id, key, verified) =>
    set((state) => {
      const current = state.simulations[id];
      if (!current) return state;
      return {
        simulations: {
          ...state.simulations,
          [id]: { ...current, verification: { ...current.verification, [key]: verified } },
        },
      };
    }),
  setScenario: (id, scenario, values) =>
    set((state) => {
      const current = state.simulations[id];
      if (!current) return state;
      return {
        simulations: {
          ...state.simulations,
          [id]: { ...current, scenario, inputs: toInputs(values) },
        },
      };
    }),
}));
