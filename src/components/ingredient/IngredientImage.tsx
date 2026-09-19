import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { getIngredientImageSource } from "../../lib/ingredientImages";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

type Props = {
  ingredientId?: string | null;
  name?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function IngredientImage({
  ingredientId,
  name,
  size = 48,
  style,
}: Props) {
  const source = getIngredientImageSource(ingredientId, name);

  return (
    <View
      accessible={false}
      style={[styles.frame, { width: size, height: size }, style]}
    >
      {source ? (
        <Image source={source} contentFit="contain" style={styles.image} />
      ) : (
        <AppText style={[styles.fallback, { fontSize: Math.max(12, size * 0.32) }]}>
          {(name?.trim().charAt(0) || "?").toUpperCase()}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    color: theme.colors.textMutedAlt,
    fontFamily: theme.fontFamily.bodySemiBold,
  },
});
