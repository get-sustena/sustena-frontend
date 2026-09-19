import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import type { RecipeDraft } from "../../types/api";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function CreatorProfileRecipeCard({ recipe, onPress, onMore }: { recipe: RecipeDraft; onPress: () => void; onMore: () => void }) {
  const isDraft = recipe.publicationStatus !== "published";
  const duration = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {recipe.coverMediaUrl ? (
        <Image source={{ uri: recipe.coverMediaUrl }} contentFit="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={styles.fallback}><Icon name="chefHat" size={24} color="#8a9187" /></View>
      )}
      <LinearGradient colors={["rgba(8,18,12,0)", "rgba(8,18,12,0.84)"]} style={StyleSheet.absoluteFill} />
      {isDraft ? <AppText style={styles.badge}>DRAFT</AppText> : null}
      <Pressable accessibilityLabel={`More options for ${recipe.name || "Untitled recipe"}`} onPress={(event) => { event.stopPropagation(); onMore(); }} style={styles.more}>
        <Icon name="moreH" size={15} color="#17291E" />
      </Pressable>
      <View style={styles.copy}>
        <AppText numberOfLines={2} style={styles.name}>{recipe.name.trim() || "Untitled recipe"}</AppText>
        <AppText style={styles.meta}>{isDraft ? `${draftCompletion(recipe)}% complete` : `${duration} min`}</AppText>
      </View>
    </Pressable>
  );
}

function draftCompletion(recipe: RecipeDraft) {
  const checks = [recipe.name.trim(), recipe.description?.trim(), recipe.classifications.length, recipe.ingredients.length, recipe.instructions.length, recipe.baseServings, recipe.prepTimeMinutes !== null, recipe.cookTimeMinutes !== null];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const styles = StyleSheet.create({
  card: { position: "relative", width: "100%", aspectRatio: 1, borderRadius: 12, overflow: "hidden" },
  pressed: { opacity: 0.9 },
  fallback: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF2E7" },
  badge: { position: "absolute", top: 8, left: 8, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(251,251,247,0.92)", fontFamily: theme.fontFamily.monoBold, fontSize: 9.5, letterSpacing: 0.4, color: "#17291E" },
  more: { position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 9, backgroundColor: "rgba(251,251,247,0.92)", alignItems: "center", justifyContent: "center" },
  copy: { position: "absolute", left: 9, right: 9, bottom: 9 },
  name: { marginBottom: 3, fontFamily: theme.fontFamily.display, fontSize: 13, lineHeight: 16.25, color: "#FBFBF7" },
  meta: { fontFamily: theme.fontFamily.mono, fontSize: 10, color: "rgba(251,251,247,0.85)" },
});
