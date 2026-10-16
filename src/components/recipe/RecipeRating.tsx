import { Pressable, StyleSheet, View } from "react-native";
import { socialCopy } from "../../lib/socialCopy";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { SkeletonBlock, SkeletonGroup } from "../ui/Skeleton";

const STARS = [1, 2, 3, 4, 5];
const MARIGOLD = "#E3A62E";

type Props = {
  // 0 when you haven't rated it.
  rating: number;
  // While the server hasn't said yet what you gave it.
  loading?: boolean;
  onRate: (stars: number) => void;
};

// Rate this recipe, under I cooked it (PRD v6.9 section 20, A3). It can be
// changed any time.
export function RecipeRating({ rating, loading = false, onRate }: Props) {
  if (loading) {
    return (
      <SkeletonGroup label="Loading your rating" style={styles.row}>
        <SkeletonBlock width={112} height={12} radius={999} />
        <View style={styles.stars}>
          {STARS.map((star) => (
            <View key={star} style={styles.star}>
              <Icon name="star" size={24} color="#E4E4E4" />
            </View>
          ))}
        </View>
      </SkeletonGroup>
    );
  }

  return (
    <View style={styles.row} role="group" aria-label={socialCopy.rateThisRecipe}>
      <AppText style={styles.title}>
        {rating ? socialCopy.youGaveIt(rating) : socialCopy.rateThisRecipe}
      </AppText>
      <View style={styles.stars}>
        {STARS.map((star) => {
          const on = star <= rating;
          return (
            <Pressable
              key={star}
              onPress={() => onRate(star)}
              accessibilityRole="button"
              accessibilityLabel={`${star} ${star === 1 ? "star" : "stars"}`}
              accessibilityState={{ selected: on }}
              aria-pressed={on}
              style={({ pressed }) => [styles.star, pressed && styles.pressed]}
            >
              <Icon name="star" size={24} color={on ? MARIGOLD : theme.colors.lineStrong} filled={on} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 0.75,
    borderTopColor: theme.colors.border,
  },
  title: {
    flexShrink: 1,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.3,
    color: theme.colors.navy,
  },
  stars: { flexDirection: "row", flexShrink: 0 },
  star: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { transform: [{ scale: 0.9 }] },
});
