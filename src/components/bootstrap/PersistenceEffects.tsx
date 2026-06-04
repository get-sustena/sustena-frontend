import { usePersistPreferences } from "../../hooks/usePersistPreferences";

export function PersistenceEffects() {
  usePersistPreferences();

  return null;
}
