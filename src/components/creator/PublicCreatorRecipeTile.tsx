import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import type { RecipeListItem } from "../../types/api";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function PublicCreatorRecipeTile({ recipe, width, onPress }: { recipe: RecipeListItem; width: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tile, { width }]}>
      {recipe.imageUrl ? <Image source={{ uri: recipe.imageUrl }} contentFit="cover" style={StyleSheet.absoluteFillObject} /> : <View style={styles.fallback}><Icon name="chefHat" size={24} color="#93A184" /></View>}
      <LinearGradient colors={["rgba(8,18,12,0)", "rgba(8,18,12,0.84)"]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.copy}>
        <AppText numberOfLines={2} style={styles.name}>{recipe.name || "Untitled recipe"}</AppText>
        {recipe.totalTimeMinutes ? <AppText style={styles.time}>{recipe.totalTimeMinutes} min</AppText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { position: "relative", aspectRatio: 1, overflow: "hidden" },
  fallback: { ...StyleSheet.absoluteFillObject, backgroundColor: "#EEF2E7", alignItems: "center", justifyContent: "center" },
  copy: { position: "absolute", left: 10, right: 10, bottom: 9 },
  name: { marginBottom: 3, fontFamily: theme.fontFamily.display, fontSize: 12.5, lineHeight: 15.625, color: "#FBFBF7" },
  time: { fontFamily: theme.fontFamily.mono, fontSize: 10, color: "rgba(251,251,247,0.85)" },
});
