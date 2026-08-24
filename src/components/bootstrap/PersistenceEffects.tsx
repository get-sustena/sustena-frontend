import { usePersistPreferences } from "../../hooks/usePersistPreferences";
import { usePersistProfileAnswers } from "../../hooks/usePersistProfileAnswers";
import { useCreatorDraftSyncProcessor } from "../../hooks/useCreatorDraftSyncProcessor";
import { useSyncQueueProcessor } from "../../hooks/useSyncQueueProcessor";
import { useAuthStore } from "../../store/authStore";

export function PersistenceEffects() {
  const hasKnownUser = useAuthStore((state) => Boolean(state.user));

  usePersistPreferences(hasKnownUser);
  usePersistProfileAnswers(hasKnownUser);
  useSyncQueueProcessor(hasKnownUser);
  useCreatorDraftSyncProcessor(hasKnownUser);

  return null;
}
