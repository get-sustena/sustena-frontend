import NetInfo from "@react-native-community/netinfo";
import { usePathname } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import {
  cacheCreatorRecipeDraft,
  getPendingCreatorRecipeDrafts,
} from "../db/creatorRecipeDraftRepository";
import { creatorRecipesApi } from "../lib/api";
import { getApiErrorMessage, isApiClientError } from "../lib/api/errors";
import {
  editorStateFromRecipe,
  editorStateFromWriteRequest,
  hasIncompleteLocalRows,
  toRecipeDraftWriteRequest,
} from "../lib/creatorRecipes/editorState";
import { queryClient } from "../lib/query/queryClient";
import { queryKeys } from "../lib/query/queryKeys";
import { isConnectedState } from "../lib/query/networkStatus";

export function useCreatorDraftSyncProcessor(enabled = true) {
  const db = useSQLiteContext();
  const pathname = usePathname();
  const isRunningRef = useRef(false);
  const editorIsOpen = pathname.startsWith("/creator/recipes/");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function runProcessor() {
      if (editorIsOpen || isRunningRef.current) return;
      isRunningRef.current = true;

      syncPendingCreatorDrafts(db)
        .catch((error) => {
          console.error("Failed to sync creator drafts", error);
        })
        .finally(() => {
          isRunningRef.current = false;
        });
    }

    runProcessor();
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      if (isConnectedState(state)) runProcessor();
    });
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") runProcessor();
    });

    return () => {
      unsubscribeNetwork();
      appStateSubscription.remove();
    };
  }, [db, editorIsOpen, enabled]);
}

async function syncPendingCreatorDrafts(db: ReturnType<typeof useSQLiteContext>) {
  const drafts = await getPendingCreatorRecipeDrafts(db);
  let syncedAny = false;

  for (const draft of drafts) {
    try {
      const editorState = editorStateFromWriteRequest(draft.payload);
      const saved = await creatorRecipesApi.updateRecipeDraft(
        draft.id,
        toRecipeDraftWriteRequest(editorState, draft.revision)
      );
      const savedState = editorStateFromRecipe(saved);
      const hasLocalOnlyRows = hasIncompleteLocalRows(editorState);
      await cacheCreatorRecipeDraft(db, {
        id: saved.id,
        revision: saved.revision,
        payload: hasLocalOnlyRows
          ? toRecipeDraftWriteRequest(editorState, saved.revision, {
              sanitize: false,
            })
          : toRecipeDraftWriteRequest(savedState, saved.revision, {
              sanitize: false,
            }),
        syncStatus: hasLocalOnlyRows ? "pending" : "synced",
        lastError: null,
      });
      queryClient.setQueryData(queryKeys.creatorRecipes.detail(saved.id), saved);
      syncedAny = true;
    } catch (error) {
      const status = isApiClientError(error) ? error.status : null;
      const needsAttention =
        status !== null &&
        status >= 400 &&
        status < 500 &&
        ![401, 403, 408, 429].includes(status);
      const shouldStop =
        status === null ||
        status === 401 ||
        status === 403 ||
        status >= 500 ||
        status === 408 ||
        status === 429;
      await cacheCreatorRecipeDraft(db, {
        id: draft.id,
        revision: draft.revision,
        payload: draft.payload,
        syncStatus: needsAttention ? "conflict" : "pending",
        lastError: getApiErrorMessage(error),
      });
      if (shouldStop) break;
    }
  }

  if (syncedAny) {
    queryClient.invalidateQueries({ queryKey: queryKeys.creatorRecipes.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "recipes" && query.queryKey[1] === "list",
    });
  }
}
