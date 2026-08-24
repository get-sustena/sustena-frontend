import { create } from "zustand";
import {
  DEFAULT_PLAN_SETUP,
  PlanSetupValue,
} from "../types/planner";

type PlannerState = {
  planSetup: PlanSetupValue;
  setPlanSetup: (value: PlanSetupValue) => void;
  hydratePlanSetup: (value: PlanSetupValue) => void;
};

export const usePlannerStore = create<PlannerState>((set) => ({
  planSetup: DEFAULT_PLAN_SETUP,
  setPlanSetup: (planSetup) => set({ planSetup }),
  hydratePlanSetup: (planSetup) => set({ planSetup }),
}));
