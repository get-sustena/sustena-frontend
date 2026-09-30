
import { UnitMode } from "../data/recipes";

export type HealthCondition =
  | "none"
  | "diabetic"
  | "hypertension"
  | "lactose_intolerant"
  | "high_cholesterol"
  | "gluten_sensitivity";

export type DietaryPreference =
  | "no_restrictions"
  | "vegan"
  | "vegetarian"
  | "pescetarian"
  | "halal"
  | "keto"
  | "high_protein";

export type UserPreferences = {
  healthConditions: HealthCondition[];
  dietaryPreference: DietaryPreference;
  defaultUnitMode: UnitMode;
  defaultServingSize: number;
  hapticsEnabled: boolean;
  dataSaverEnabled: boolean;
  mealRemindersEnabled: boolean;
};
