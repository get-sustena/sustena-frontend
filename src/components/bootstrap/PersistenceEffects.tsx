import { usePersistPreferences } from "../../hooks/usePersistPreferences";
import { usePersistProfileAnswers } from "../../hooks/usePersistProfileAnswers";
import { useCreatorDraftSyncProcessor } from "../../hooks/useCreatorDraftSyncProcessor";
import { useSyncQueueProcessor } from "../../hooks/useSyncQueueProcessor";
import { useAuthStore } from "../../store/authStore";

export function PersistenceEffects() {
  const hasKnownUser = useAuthStore((state) => Boolean(state.user));
  const isSigningOut = useAuthStore((state) => state.isSigningOut);
  const enabled = hasKnownUser && !isSigningOut;

  usePersistPreferences(enabled);
  usePersistProfileAnswers(enabled);
  useSyncQueueProcessor(enabled);
  useCreatorDraftSyncProcessor(enabled);

  return null;
}
