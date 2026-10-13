import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import type { RecipeListItem } from "../../types/api";
import { SCRIM_COMPACT_COLORS, SCRIM_COMPACT_LOCATIONS } from "../recipe/RecipePhoto";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function PublicCreatorRecipeTile({ recipe, onPress }: { recipe: RecipeListItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      {recipe.imageUrl ? <Image source={{ uri: recipe.imageUrl }} contentFit="cover" style={StyleSheet.absoluteFill} /> : <View style={styles.fallback}><Icon name="chefHat" size={24} color={theme.colors.textMutedAlt} /></View>}
      <LinearGradient colors={SCRIM_COMPACT_COLORS} locations={SCRIM_COMPACT_LOCATIONS} style={StyleSheet.absoluteFill} />
      <View style={styles.copy}>
        <AppText numberOfLines={2} style={styles.name}>{recipe.name || "Untitled recipe"}</AppText>
        {recipe.totalTimeMinutes ? <AppText style={styles.time}>{recipe.totalTimeMinutes} min</AppText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { position: "relative", width: "100%", aspectRatio: 1, overflow: "hidden" },
  fallback: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.cream2, alignItems: "center", justifyContent: "center" },
  copy: { position: "absolute", left: 10, right: 10, bottom: 9 },
  name: { marginBottom: 3, fontFamily: theme.fontFamily.display, fontSize: 12.5, lineHeight: 15.625, color: "#FBFBF7" },
  time: { fontFamily: theme.fontFamily.body, fontSize: 10, color: "rgba(251,251,247,0.85)" },
});
