import { Href, router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StageBasics } from "../../../src/components/creator/editor/StageBasics";
import { StageDetails } from "../../../src/components/creator/editor/StageDetails";
import { StageIngredients } from "../../../src/components/creator/editor/StageIngredients";
import { StageInstructions } from "../../../src/components/creator/editor/StageInstructions";
import { StageReview } from "../../../src/components/creator/editor/StageReview";
import { AppText } from "../../../src/components/ui/AppText";
import { ConfirmationSheet } from "../../../src/components/ui/ConfirmationSheet";
import { Icon } from "../../../src/components/ui/Icon";
import { ProgressLoader } from "../../../src/components/ui/ProgressLoader";
import {
  cacheCreatorRecipeDraft,
  deleteCachedCreatorRecipeDraft,
  getCachedCreatorRecipeDraft,
} from "../../../src/db/creatorRecipeDraftRepository";
import {
  useAuthoringVocabularyQuery,
  useCreateRecipeDraftMutation,
  useMyRecipeQuery,
  usePublishRecipeMutation,
  useSavePublishedRecipeEditMutation,
  useUpdateRecipeDraftMutation,
} from "../../../src/hooks/api/useCreatorRecipes";
import { useIngredientCatalogQuery } from "../../../src/hooks/api/useIngredients";
import { useUnitsQuery } from "../../../src/hooks/api/useUnits";
import {
  getApiErrorMessage,
  isApiClientError,
} from "../../../src/lib/api/errors";
import {
  editorStateFromRecipe,
  editorStateFromWriteRequest,
  hasIncompleteLocalRows,
  normalizeEditorState,
  RecipeEditorState,
  RecipeEditorValidationError,
  toRecipeDraftWriteRequest,
  validateRecipeEditor,
} from "../../../src/lib/creatorRecipes/editorState";
import { queryKeys } from "../../../src/lib/query/queryKeys";
import { queryClient } from "../../../src/lib/query/queryClient";
import { pickAndUploadImage } from "../../../src/lib/media/uploadImage";
import { createLocalId } from "../../../src/lib/id";
import { closeSheet, openSheet, showToast } from "../../../src/store/uiStore";
import { theme } from "../../../src/theme/theme";
import { RecipeDraft } from "../../../src/types/api";

const STAGE_NAMES = [
  "Basics",
  "Practical details",
  "Ingredients",
  "Cooking steps",
  "Serve & publish",
];
const LOCAL_SAVE_DELAY = 250;
const SERVER_SAVE_DELAY = 1400;

type SaveStatus = "saved" | "saving" | "device" | "conflict";

type QueuedSave = {
  state: RecipeEditorState;
  notify: boolean;
};

export default function RecipeEditorScreen() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const scrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const recipeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isPublishedEditMode = params.mode === "edit-published";
  const recipeQuery = useMyRecipeQuery(recipeId);
  const vocabularyQuery = useAuthoringVocabularyQuery();
  const ingredientCatalogQuery = useIngredientCatalogQuery();
  const unitsQuery = useUnitsQuery();
  const updateMutation = useUpdateRecipeDraftMutation(recipeId ?? "", {
    invalidateLibraries: false,
  });
  const publishMutation = usePublishRecipeMutation();
  const createMutation = useCreateRecipeDraftMutation();
  const savePublishedEditMutation = useSavePublishedRecipeEditMutation();
  const [state, setState] = useState<RecipeEditorState | null>(null);
  const [stage, setStage] = useState(1);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [publishedName, setPublishedName] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [serverValidationErrors, setServerValidationErrors] = useState<
    RecipeEditorValidationError[]
  >([]);
  const initializedRef = useRef(false);
  const stateRef = useRef<RecipeEditorState | null>(null);
  const revisionRef = useRef<number | null>(null);
  const savedSignatureRef = useRef("");
  const queuedSaveRef = useRef<QueuedSave | null>(null);
  const activeSaveRef = useRef<Promise<RecipeDraft | null> | null>(null);
  const conflictRef = useRef(false);

  const recipe = recipeQuery.data;
  const vocabulary = vocabularyQuery.data;
  const ingredientCatalog = ingredientCatalogQuery.data ?? [];
  const units = unitsQuery.data ?? [];
  const localValidationErrors = useMemo(
    () => (state ? validateRecipeEditor(state) : []),
    [state]
  );
  const validationErrors = useMemo(
    () => mergeValidationErrors(localValidationErrors, serverValidationErrors),
    [localValidationErrors, serverValidationErrors]
  );

  useEffect(() => {
    if (!recipe || initializedRef.current) return;
    initializedRef.current = true;
    const initialRecipe = recipe;
    let active = true;

    async function initialize() {
      const cached = isPublishedEditMode
        ? null
        : await getCachedCreatorRecipeDraft(db, initialRecipe.id).catch(
            () => null
          );
      if (!active) return;
      const useCached = Boolean(
        cached && cached.syncStatus !== "synced"
      );
      const nextState = useCached
        ? editorStateFromWriteRequest(cached!.payload)
        : editorStateFromRecipe(initialRecipe);
      const nextRevision = useCached
        ? (cached!.revision ?? initialRecipe.revision)
        : initialRecipe.revision;
      stateRef.current = nextState;
      revisionRef.current = nextRevision;
      savedSignatureRef.current = useCached ? "" : stateSignature(nextState);
      conflictRef.current = Boolean(
        useCached &&
          cached!.revision !== null &&
          cached!.revision !== initialRecipe.revision
      );
      setState(nextState);
      setStage(Math.max(1, Math.min(5, nextState.editorStage)));
      setCoverUrl(initialRecipe.coverMediaUrl);
      setSaveStatus(
        conflictRef.current ? "conflict" : useCached ? "device" : "saved"
      );
    }

    initialize();
    return () => {
      active = false;
    };
  }, [db, isPublishedEditMode, recipe]);

  useEffect(() => {
    stateRef.current = state;
    if (!state || !recipe || !initializedRef.current) return;
    const signature = stateSignature(state);
    if (signature === savedSignatureRef.current) return;

    // A published recipe remains untouched until the creator explicitly
    // chooses Save and exit or Publish.
    if (isPublishedEditMode) return;

    if (!conflictRef.current) setSaveStatus("saving");
    const localTimer = setTimeout(() => {
      cacheState(state, "pending", null).catch(() => undefined);
    }, LOCAL_SAVE_DELAY);
    const serverTimer = setTimeout(() => {
      queueServerSave(state, false).catch(() => undefined);
    }, SERVER_SAVE_DELAY);

    return () => {
      clearTimeout(localTimer);
      clearTimeout(serverTimer);
    };
    // The save helpers intentionally use refs so typing does not restart a save
    // that is already in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublishedEditMode, recipe, state]);

  async function cacheState(
    value: RecipeEditorState,
    syncStatus: "synced" | "pending" | "conflict",
    lastError: string | null
  ) {
    if (!recipeId || isPublishedEditMode) return;
    await cacheCreatorRecipeDraft(db, {
      id: recipeId,
      revision: revisionRef.current,
      payload: toRecipeDraftWriteRequest(value, revisionRef.current, {
        sanitize: false,
      }),
      syncStatus,
      lastError,
    });
  }

  function queueServerSave(value: RecipeEditorState, notify: boolean) {
    queuedSaveRef.current = { state: normalizeEditorState(value), notify };
    if (activeSaveRef.current) return activeSaveRef.current;

    activeSaveRef.current = drainServerSaveQueue().finally(() => {
      activeSaveRef.current = null;
    });
    return activeSaveRef.current;
  }

  async function drainServerSaveQueue(): Promise<RecipeDraft | null> {
    let lastSaved: RecipeDraft | null = null;
    while (queuedSaveRef.current && !conflictRef.current) {
      const queued = queuedSaveRef.current;
      queuedSaveRef.current = null;
      setSaveStatus("saving");
      try {
        const saved = await updateMutation.mutateAsync(
          toRecipeDraftWriteRequest(queued.state, revisionRef.current)
        );
        lastSaved = saved;
        revisionRef.current = saved.revision;
        const queuedSignature = stateSignature(queued.state);
        const hasLocalOnlyRows = hasIncompleteLocalRows(queued.state);
        savedSignatureRef.current = hasLocalOnlyRows ? "" : queuedSignature;
        const currentIsSaved =
          !hasLocalOnlyRows &&
          stateRef.current !== null &&
          stateSignature(stateRef.current) === savedSignatureRef.current;
        await cacheState(
          queued.state,
          currentIsSaved ? "synced" : "pending",
          null
        );
        setSaveStatus(currentIsSaved ? "saved" : "saving");
        if (queued.notify) showToast("Draft saved", "success");
      } catch (error) {
        const message = getApiErrorMessage(error);
        if (isRecipeConflict(error)) {
          conflictRef.current = true;
          queuedSaveRef.current = null;
          setSaveStatus("conflict");
          await cacheState(queued.state, "conflict", message).catch(
            () => undefined
          );
          if (queued.notify) openConflictDialog();
        } else {
          setSaveStatus("device");
          await cacheState(queued.state, "pending", message).catch(
            () => undefined
          );
          if (queued.notify) {
            showToast(
              "Saved on this device. Try saving again when connected.",
              "danger"
            );
          }
        }
        break;
      }
    }
    return lastSaved;
  }

  async function chooseCover() {
    if (!state) return;
    try {
      setUploadingCover(true);
      const image = await pickAndUploadImage("recipe_cover", [16, 9]);
      if (!image) return;
      setCoverUrl(image.localUri);
      setState((current) =>
        current ? { ...current, coverMediaId: image.assetId } : current
      );
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    } finally {
      setUploadingCover(false);
    }
  }

  function goToStage(nextStage: number) {
    const bounded = Math.max(1, Math.min(5, nextStage));
    setStage(bounded);
    setServerValidationErrors([]);
    setState((current) =>
      current ? { ...current, editorStage: bounded } : current
    );
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function continueToNextStage() {
    if (!state) return;
    if (stage === 3) {
      const blocking = localValidationErrors.filter(
        (error) => error.stage === 3 && error.field.startsWith("ingredients.")
      );
      if (blocking.length) {
        showToast(blocking[0].message, "danger");
        return;
      }
    }
    goToStage(stage + 1);
  }

  async function saveNow(notify = true) {
    if (!stateRef.current) return null;
    if (isPublishedEditMode) {
      if (!recipeId) return null;
      setSaveStatus("saving");
      try {
        const saved = await savePublishedEditMutation.mutateAsync({
          publishedRecipeId: recipeId,
          payload: toRecipeDraftWriteRequest(
            stateRef.current,
            recipeQuery.data?.revision ?? null
          ),
        });
        revisionRef.current = saved.revision;
        savedSignatureRef.current = stateSignature(stateRef.current);
        setSaveStatus("saved");
        if (notify) showToast("Draft saved", "success");
        return saved;
      } catch (error) {
        if (isRecipeConflict(error)) {
          conflictRef.current = true;
          setSaveStatus("conflict");
          openConflictDialog();
        } else {
          setSaveStatus("saved");
          showToast(getApiErrorMessage(error), "danger");
        }
        return null;
      }
    }
    await cacheState(stateRef.current, "pending", null).catch(() => undefined);
    return queueServerSave(stateRef.current, notify);
  }

  async function saveAndExit() {
    const saved = await saveNow(false);
    if (isPublishedEditMode && !saved) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.creatorRecipes.all });
    if (saveStatus === "device") {
      showToast("Draft saved on this device", "success");
    } else if (saveStatus !== "conflict") {
      showToast("Draft saved", "success");
    }
    exitEditor();
  }

  function closeEditor() {
    if (!state || stateSignature(state) === savedSignatureRef.current) {
      exitEditor();
      return;
    }
    openSheet(
      <ConfirmationSheet
        title="Leave recipe editor?"
        description="Your latest changes can be saved before you leave."
        actions={[
          { label: "Keep editing", onPress: closeSheet },
          {
            label: "Save and exit",
            primary: true,
            onPress: async () => {
              closeSheet();
              await saveAndExit();
            },
          },
        ]}
      />
    );
  }

  async function publish() {
    const currentRecipe = recipeQuery.data;
    if (!state || !currentRecipe) return;
    const errors = validateRecipeEditor(state);
    setServerValidationErrors([]);
    if (errors.length) {
      showToast(
        `Finish ${errors.length} item${errors.length === 1 ? "" : "s"} before publishing`,
        "danger"
      );
      return;
    }
    const saved = await saveNow(false);
    if (!saved || conflictRef.current || revisionRef.current === null) return;
    try {
      await publishMutation.mutateAsync({
        recipeId: saved.id,
        revision: saved.revision,
      });
      await deleteCachedCreatorRecipeDraft(db, recipeId ?? "").catch(
        () => undefined
      );
      showToast(
        currentRecipe.draftOfRecipeId || isPublishedEditMode
          ? "Published recipe updated"
          : "Recipe published",
        "success"
      );
      setPublishedName(state.name.trim() || currentRecipe.name);
    } catch (error) {
      const publishErrors = getPublishValidationErrors(error);
      if (publishErrors.length) setServerValidationErrors(publishErrors);
      if (isRecipeConflict(error)) {
        conflictRef.current = true;
        setSaveStatus("conflict");
        openConflictDialog();
      } else {
        showToast(getApiErrorMessage(error), "danger");
      }
    }
  }

  function openConflictDialog() {
    openSheet(
      <ConfirmationSheet
        title="This draft changed elsewhere"
        description="Choose whether to reload the latest server copy or keep the changes on this device."
        actions={[
          { label: "Later", onPress: closeSheet },
          {
            label: "Reload server copy",
            onPress: async () => {
              closeSheet();
              await reloadServerCopy();
            },
          },
          {
            label: "Keep my changes",
            primary: true,
            onPress: async () => {
              closeSheet();
              await keepLocalChanges();
            },
          },
        ]}
      />
    );
  }

  function exitEditor() {
    queryClient.invalidateQueries({ queryKey: queryKeys.creatorRecipes.all });
    router.back();
  }

  async function createAnotherRecipe() {
    try {
      const draft = await createMutation.mutateAsync({
        id: createLocalId("recipe"),
        name: "",
        editorStage: 1,
      });
      router.push({
        pathname: "/creator/recipes/[id]",
        params: { id: draft.id, mode: "create" },
      });
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  function updateEditorState(
    value:
      | RecipeEditorState
      | ((current: RecipeEditorState) => RecipeEditorState)
  ) {
    setState((current) => {
      if (!current) return current;
      return typeof value === "function" ? value(current) : value;
    });
  }

  async function reloadServerCopy() {
    const result = await recipeQuery.refetch();
    if (!result.data) {
      showToast("The latest server copy could not be loaded", "danger");
      return;
    }
    const next = editorStateFromRecipe(result.data);
    revisionRef.current = result.data.revision;
    savedSignatureRef.current = stateSignature(next);
    stateRef.current = next;
    conflictRef.current = false;
    queuedSaveRef.current = null;
    setState(next);
    setStage(next.editorStage);
    setCoverUrl(result.data.coverMediaUrl);
    setSaveStatus("saved");
    await cacheState(next, "synced", null).catch(() => undefined);
    showToast("Latest server copy loaded", "success");
  }

  async function keepLocalChanges() {
    const local = stateRef.current;
    if (!local) return;
    const result = await recipeQuery.refetch();
    if (!result.data) {
      showToast("The server revision could not be loaded", "danger");
      return;
    }
    revisionRef.current = result.data.revision;
    conflictRef.current = false;
    setSaveStatus("saving");
    const saved = await queueServerSave(local, true);
    if (saved) setSaveStatus("saved");
  }

  const loading =
    recipeQuery.isLoading ||
    vocabularyQuery.isLoading ||
    ingredientCatalogQuery.isLoading ||
    unitsQuery.isLoading;
  const loadError =
    recipeQuery.error ||
    vocabularyQuery.error ||
    ingredientCatalogQuery.error ||
    unitsQuery.error;

  if (loading) {
    return <ProgressLoader variant="screen" />;
  }

  if (!recipe || !state || !vocabulary || loadError) {
    return (
      <View style={styles.notFound}>
        <Icon name="chefHat" size={36} color={theme.colors.textMuted} />
        <AppText style={styles.notFoundTitle}>Recipe editor unavailable</AppText>
        <AppText style={styles.notFoundCopy}>
          {loadError
            ? getApiErrorMessage(loadError)
            : "This draft could not be found."}
        </AppText>
        <Pressable onPress={() => router.back()} style={styles.notFoundButton}>
          <AppText style={styles.notFoundButtonText}>Back to profile</AppText>
        </Pressable>
      </View>
    );
  }

  if (publishedName) {
    return (
      <View style={[styles.successScreen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.successIcon}>
          <Icon name="check" size={31} color={theme.colors.onDark} strokeWidth={3} />
        </View>
        <AppText style={styles.successTitle}>Your recipe is live</AppText>
        <AppText style={styles.successCopy}>
          “{publishedName}” now appears on your creator profile.
        </AppText>
        <View style={styles.successActions}>
          <Pressable onPress={() => router.replace("/profile" as Href)} style={({ pressed }) => [styles.primaryButton, styles.successActionButton, pressed && styles.pressed]}>
            <AppText style={styles.primaryButtonText}>Back to profile</AppText>
          </Pressable>
          <Pressable disabled={createMutation.isPending} onPress={createAnotherRecipe} style={({ pressed }) => [styles.secondaryButton, styles.successActionButton, pressed && styles.pressed]}>
            <AppText style={styles.secondaryButtonText}>{createMutation.isPending ? "Creating..." : "Create another recipe"}</AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Close recipe editor"
            onPress={closeEditor}
            style={styles.headerButton}
          >
            <Icon name="close" size={17} color={theme.colors.text} />
          </Pressable>
          <AppText style={styles.headerTitle}>
            {params.mode === "create" ? "Create recipe" : "Edit recipe"}
          </AppText>
          <Pressable
            disabled={uploadingCover}
            onPress={saveAndExit}
            style={styles.headerSave}
          >
            <AppText style={styles.headerSaveText}>Save &amp; exit</AppText>
          </Pressable>
        </View>
        <AppText style={styles.progressText}>
          {stage} of 5&nbsp;&nbsp;{STAGE_NAMES[stage - 1]}
        </AppText>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${stage * 20}%` },
            ]}
          />
        </View>
      </View>

      {saveStatus === "conflict" ? (
        <Pressable onPress={openConflictDialog} style={styles.conflictBanner}>
          <Icon name="notification" size={17} color={theme.colors.red} />
          <AppText style={styles.conflictText}>
            This draft changed elsewhere. Tap to resolve the conflict.
          </AppText>
          <Icon name="chevronRight" size={15} color={theme.colors.red} />
        </Pressable>
      ) : null}

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 124 },
        ]}
      >
        {stage === 1 ? (
          <StageBasics
            state={state}
            setState={updateEditorState}
            coverUrl={coverUrl}
            uploadingCover={uploadingCover}
            onChooseCover={chooseCover}
          />
        ) : null}
        {stage === 2 ? (
          <StageDetails
            state={state}
            setState={updateEditorState}
            vocabulary={vocabulary}
          />
        ) : null}
        {stage === 3 ? (
          <StageIngredients
            state={state}
            setState={updateEditorState}
            ingredientCatalog={ingredientCatalog}
            units={units}
          />
        ) : null}
        {stage === 4 ? (
          <StageInstructions state={state} setState={updateEditorState} />
        ) : null}
        {stage === 5 ? (
          <StageReview
            state={state}
            setState={updateEditorState}
            vocabulary={vocabulary}
            validationErrors={validationErrors}
            onJumpToStage={goToStage}
          />
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom) }]}>
        {stage === 1 ? (
          <Pressable
            onPress={continueToNextStage}
            style={({ pressed }) => [styles.primaryButton, styles.fullWidthButton, pressed && styles.pressed]}
          >
            <AppText style={styles.primaryButtonText}>Continue</AppText>
          </Pressable>
        ) : stage < 5 ? (
          <>
            <Pressable
              onPress={() => goToStage(stage - 1)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <AppText style={styles.secondaryButtonText}>Back</AppText>
            </Pressable>
            <Pressable
              onPress={continueToNextStage}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <AppText style={styles.primaryButtonText}>Continue</AppText>
            </Pressable>
          </>
        ) : (
          <View style={styles.publishActions}>
            <View style={styles.publishSecondaryRow}>
              <Pressable onPress={() => goToStage(4)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><AppText style={styles.secondaryButtonText}>Back</AppText></Pressable>
              <Pressable onPress={saveAndExit} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><AppText style={styles.secondaryButtonText}>Save as draft</AppText></Pressable>
            </View>
            <Pressable disabled={publishMutation.isPending || saveStatus === "conflict"} onPress={publish} style={({ pressed }) => [styles.publishButton, pressed && styles.pressed, (publishMutation.isPending || saveStatus === "conflict") && styles.disabled]}>
              <AppText style={styles.publishButtonText}>{publishMutation.isPending ? "Publishing..." : "Publish recipe"}</AppText>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function stateSignature(state: RecipeEditorState) {
  return JSON.stringify(toRecipeDraftWriteRequest(state, null, { sanitize: false }));
}

function isRecipeConflict(error: unknown) {
  return isApiClientError(error) && error.code === "RECIPE_CONFLICT";
}

function getPublishValidationErrors(error: unknown): RecipeEditorValidationError[] {
  if (!isApiClientError(error) || !error.payload || typeof error.payload !== "object") {
    return [];
  }
  const value = error.payload as {
    errors?: { stage?: unknown; field?: unknown; message?: unknown }[];
  };
  if (!Array.isArray(value.errors)) return [];
  return value.errors.flatMap((item) =>
    typeof item.stage === "number" &&
    typeof item.field === "string" &&
    typeof item.message === "string"
      ? [{ stage: item.stage, field: item.field, message: item.message }]
      : []
  );
}

function mergeValidationErrors(
  local: RecipeEditorValidationError[],
  server: RecipeEditorValidationError[]
) {
  const seen = new Set<string>();
  return [...local, ...server].filter((error) => {
    const key = `${error.stage}:${error.field}:${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { paddingHorizontal: 20, paddingBottom: 10, backgroundColor: "#FFFFFF" },
  headerRow: { minHeight: 42, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { position: "absolute", left: 70, right: 70, textAlign: "center", fontFamily: theme.fontFamily.display, fontSize: 15, color: "#17291E" },
  headerSave: { minHeight: 42, paddingLeft: 10, alignItems: "flex-end", justifyContent: "center" },
  headerSaveText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, color: "#279A5F" },
  progressText: { marginBottom: 7, fontFamily: theme.fontFamily.body, fontSize: 10.5, letterSpacing: 0.4, color: "#8A9187" },
  progressTrack: { height: 3, overflow: "hidden", borderRadius: 999, backgroundColor: "#E3E3E3" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#17291E" },
  conflictBanner: { minHeight: 48, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: "#E8C4BE", backgroundColor: "#FBF0EE" },
  conflictText: { flex: 1, fontSize: 11.5, lineHeight: 16, color: theme.colors.redText },
  content: { paddingHorizontal: 20, paddingTop: 0 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 10, paddingHorizontal: 20, flexDirection: "row", gap: 8, backgroundColor: "#FFFFFF" },
  secondaryButton: { minHeight: 48, paddingHorizontal: 10, flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E1E1E1", borderRadius: 999, backgroundColor: "#FFFFFF" },
  secondaryButtonText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13.5, textAlign: "center", color: "#1B211C" },
  primaryButton: { minHeight: 48, flex: 2, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#17291E" },
  primaryButtonText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14.5, color: "#FBFBF7" },
  fullWidthButton: { flex: 1 },
  publishActions: { flex: 1, gap: 8 },
  publishSecondaryRow: { flexDirection: "row", gap: 8 },
  publishButton: { minHeight: 50, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#17291E" },
  publishButtonText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14.5, textAlign: "center", color: "#FBFBF7" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  notFound: { flex: 1, paddingHorizontal: 30, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: theme.colors.background },
  notFoundTitle: { fontFamily: theme.fontFamily.display, fontSize: 24, color: theme.colors.navy },
  notFoundCopy: { maxWidth: 300, textAlign: "center", fontSize: 12.5, lineHeight: 19, color: theme.colors.textMuted },
  notFoundButton: { marginTop: 5, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.navy },
  notFoundButtonText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, color: theme.colors.white },
  successScreen: { flex: 1, paddingHorizontal: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  successIcon: { width: 72, height: 72, alignItems: "center", justifyContent: "center", borderRadius: 36, backgroundColor: "#17291E" },
  successTitle: { marginTop: 22, fontFamily: theme.fontFamily.display, fontSize: 28, lineHeight: 32, textAlign: "center", color: "#17291E" },
  successCopy: { maxWidth: 310, marginTop: 9, fontSize: 13.5, lineHeight: 20, textAlign: "center", color: theme.colors.textMuted },
  successActions: { width: "100%", maxWidth: 420, marginTop: 28, gap: 10 },
  successActionButton: { width: "100%", flex: 0 },
});
