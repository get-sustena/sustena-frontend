import { usePersistPreferences } from "../../hooks/usePersistPreferences";
import { usePersistProfileAnswers } from "../../hooks/usePersistProfileAnswers";
import { useSyncQueueProcessor } from "../../hooks/useSyncQueueProcessor";

export function PersistenceEffects() {
  usePersistPreferences();
  usePersistProfileAnswers();
  useSyncQueueProcessor();

  return null;
}
