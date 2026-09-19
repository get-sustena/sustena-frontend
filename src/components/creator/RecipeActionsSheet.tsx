import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useDeleteRecipeMutation, useDuplicateRecipeMutation } from "../../hooks/api/useCreatorRecipes";
import { getApiErrorMessage } from "../../lib/api/errors";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import type { RecipeDraft } from "../../types/api";
import { AppText } from "../ui/AppText";
import { DeleteRecipeConfirmationSheet } from "./DeleteRecipeConfirmationSheet";
import { RenameDraftSheet } from "./RenameDraftSheet";

export function RecipeActionsSheet({ recipe }: { recipe: RecipeDraft }) {
  const duplicateMutation = useDuplicateRecipeMutation();
  const deleteMutation = useDeleteRecipeMutation();
  const isPublished = recipe.publicationStatus === "published";

  async function duplicate() {
    try {
      await duplicateMutation.mutateAsync(recipe.id);
      closeSheet();
      showToast(isPublished ? "Recipe copied to drafts" : "Draft duplicated", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  function editPublished() {
    closeSheet();
    router.push({
      pathname: "/creator/recipes/[id]",
      params: { id: recipe.id, mode: "edit-published" },
    });
  }

  function confirmDelete() {
    closeSheet();
    setTimeout(() => openSheet(<DeleteRecipeConfirmationSheet name={recipe.name} draft={!isPublished} onCancel={closeSheet} onDelete={deleteRecipe} />), 300);
  }

  async function deleteRecipe() {
    try {
      await deleteMutation.mutateAsync({ recipeId: recipe.id, revision: recipe.revision });
      closeSheet();
      showToast(isPublished ? "Recipe deleted" : "Draft deleted", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  return (
    <View style={styles.sheet}>
      <AppText numberOfLines={2} style={styles.title}>{recipe.name.trim() || "Untitled recipe"}</AppText>
      {isPublished ? (
        <>
          <MenuRow label="Edit recipe" onPress={editPublished} />
          <MenuRow label="Duplicate as draft" onPress={duplicate} />
          <MenuRow label="Delete recipe" onPress={confirmDelete} danger />
        </>
      ) : (
        <>
          <MenuRow label="Rename draft" onPress={() => { closeSheet(); setTimeout(() => openSheet(<RenameDraftSheet recipe={recipe} />), 300); }} />
          <MenuRow label="Duplicate draft" onPress={duplicate} />
          <MenuRow label="Delete draft" onPress={confirmDelete} danger />
        </>
      )}
    </View>
  );
}

function MenuRow({ label, danger = false, onPress }: { label: string; danger?: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.row}><AppText style={[styles.label, danger && styles.danger]}>{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 18 },
  title: { marginBottom: 10, fontFamily: theme.fontFamily.bodyBold, fontSize: 16, color: "#17291E" },
  row: { paddingHorizontal: 4, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E1E1E1" },
  label: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: "#17291E" },
  danger: { color: "#C0392E" },
});
