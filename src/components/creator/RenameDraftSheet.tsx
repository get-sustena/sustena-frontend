import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useUpdateRecipeDraftMutation } from "../../hooks/api/useCreatorRecipes";
import { getApiErrorMessage } from "../../lib/api/errors";
import { editorStateFromRecipe, toRecipeDraftWriteRequest } from "../../lib/creatorRecipes/editorState";
import { closeSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import type { RecipeDraft } from "../../types/api";
import { AppText } from "../ui/AppText";

export function RenameDraftSheet({ recipe }: { recipe: RecipeDraft }) {
  const [name, setName] = useState(recipe.name);
  const [error, setError] = useState("");
  const mutation = useUpdateRecipeDraftMutation(recipe.id);
  async function rename() {
    if (!name.trim()) { setError("Enter a name for this draft."); return; }
    try {
      const state = editorStateFromRecipe(recipe);
      await mutation.mutateAsync(toRecipeDraftWriteRequest({ ...state, name: name.trim() }, recipe.revision));
      closeSheet();
      showToast("Draft renamed", "success");
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), "danger");
    }
  }
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Rename draft</AppText>
      <AppText style={styles.label}>Draft name</AppText>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      <View style={styles.actions}>
        <Pressable onPress={closeSheet} style={styles.cancel}><AppText style={styles.cancelText}>Cancel</AppText></Pressable>
        <Pressable disabled={mutation.isPending} onPress={rename} style={styles.rename}><AppText style={styles.renameText}>Rename</AppText></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 18 },
  title: { marginBottom: 14, fontFamily: theme.fontFamily.display, fontSize: 18, color: "#17291E" },
  label: { marginBottom: 6, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: "#17291E" },
  input: { width: "100%", marginBottom: 8, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: "#D8E3CA", backgroundColor: "#FFFFFF", fontFamily: theme.fontFamily.body, fontSize: 14.5, color: "#17291E" },
  error: { marginTop: 6, fontSize: 12.5, color: "#C0392E" },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  cancel: { flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: "#D8E3CA", backgroundColor: "#FFFFFF", alignItems: "center" },
  cancelText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: "#17291E" },
  rename: { flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: "#17291E", alignItems: "center" },
  renameText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: "#FBFBF7" },
});
