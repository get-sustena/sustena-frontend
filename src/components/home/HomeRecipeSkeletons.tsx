import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../../theme/theme";

export function RecommendationCardSkeleton() {
  return (
    <SkeletonPulse
      accessibilityLabel="Loading recommendation"
      style={styles.recommendationCard}
    >
      <View style={[styles.block, styles.recommendationTag]} />

      <View style={styles.recommendationContent}>
        <View style={[styles.block, styles.recommendationTitle]} />

        <View style={styles.metaRow}>
          <View style={[styles.block, styles.metaChip]} />
          <View style={[styles.block, styles.metaChip]} />
          <View style={[styles.block, styles.metaChipShort]} />
        </View>

        <View style={[styles.block, styles.recommendationButton]} />
      </View>
    </SkeletonPulse>
  );
}

export function QuickRecipeCardsSkeleton() {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading quick and easy recipes"
      style={styles.quickViewport}
    >
      <View style={styles.quickRow}>
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonPulse key={index} style={styles.quickCard}>
            <View style={[styles.block, styles.quickTag]} />

            <View style={styles.quickContent}>
              <View style={[styles.block, styles.quickTitle]} />
              <View style={[styles.block, styles.quickTitleShort]} />

              <View style={styles.quickMetaRow}>
                <View style={[styles.block, styles.quickMeta]} />
                <View style={[styles.block, styles.quickMetaShort]} />
              </View>
            </View>
          </SkeletonPulse>
        ))}
      </View>
    </View>
  );
}

function SkeletonPulse({
  children,
  style,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style: object;
  accessibilityLabel?: string;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 900,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.58 + pulse.value * 0.42,
  }));

  return (
    <Animated.View
      accessibilityRole={accessibilityLabel ? "progressbar" : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  recommendationCard: {
    height: 300,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: theme.colors.card2,
  },
  recommendationTag: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 74,
    height: 28,
    borderRadius: 999,
  },
  recommendationContent: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 20,
  },
  recommendationTitle: {
    width: "68%",
    height: 25,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 20,
  },
  metaChip: {
    width: 68,
    height: 27,
    borderRadius: 999,
  },
  metaChipShort: {
    width: 54,
    height: 27,
    borderRadius: 999,
  },
  recommendationButton: {
    alignSelf: "center",
    width: 184,
    height: 40,
    borderRadius: 999,
  },
  quickViewport: {
    overflow: "hidden",
    paddingBottom: 18,
  },
  quickRow: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 20,
  },
  quickCard: {
    width: 190,
    height: 236,
    flexShrink: 0,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: theme.colors.card2,
  },
  quickTag: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 68,
    height: 27,
    borderRadius: 999,
  },
  quickContent: {
    position: "absolute",
    left: 13,
    right: 13,
    bottom: 14,
  },
  quickTitle: {
    width: "90%",
    height: 17,
    marginBottom: 7,
  },
  quickTitleShort: {
    width: "64%",
    height: 17,
    marginBottom: 10,
  },
  quickMetaRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickMeta: {
    width: 58,
    height: 13,
  },
  quickMetaShort: {
    width: 42,
    height: 13,
  },
  block: {
    borderRadius: 6,
    backgroundColor: "#C9D8BE",
  },
});
