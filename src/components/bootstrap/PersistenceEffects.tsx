import { usePersistPreferences } from "../../hooks/usePersistPreferences";
import { usePersistProfileAnswers } from "../../hooks/usePersistProfileAnswers";
import { useCreatorDraftSyncProcessor } from "../../hooks/useCreatorDraftSyncProcessor";
import { useSyncQueueProcessor } from "../../hooks/useSyncQueueProcessor";

export function PersistenceEffects() {
  usePersistPreferences();
  usePersistProfileAnswers();
  useSyncQueueProcessor();
  useCreatorDraftSyncProcessor();

  return null;
}
