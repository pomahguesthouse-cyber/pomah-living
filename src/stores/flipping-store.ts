import { create } from "zustand";
import type { FlippingProject } from "@/lib/flipping";

type FlippingState = {
  projects: Record<string, FlippingProject>;
  setProject: (id: string, project: FlippingProject) => void;
  removeProject: (id: string) => void;
};
export const useFlippingStore = create<FlippingState>((set) => ({
  projects: {},
  setProject: (id, project) => set((state) => ({ projects: { ...state.projects, [id]: project } })),
  removeProject: (id) =>
    set((state) => ({
      projects: Object.fromEntries(Object.entries(state.projects).filter(([key]) => key !== id)),
    })),
}));
