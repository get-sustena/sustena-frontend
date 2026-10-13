import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { SkeletonBlock, SkeletonGroup } from "../ui/Skeleton";

export function RecommendationCardSkeleton() {
  return (
    <SkeletonGroup
      label="Loading recommendation"
      style={styles.recommendationCard}
    >
      <SkeletonBlock
        tone="deep"
        width={74}
        height={28}
        radius={999}
        style={styles.recommendationTag}
      />

      <View style={styles.recommendationContent}>
        <SkeletonBlock
          tone="deep"
          width="68%"
          height={25}
          style={styles.recommendationTitle}
        />

        <View style={styles.metaRow}>
          <SkeletonBlock tone="deep" width={68} height={27} radius={999} />
          <SkeletonBlock tone="deep" width={68} height={27} radius={999} />
          <SkeletonBlock tone="deep" width={54} height={27} radius={999} />
        </View>

        <SkeletonBlock
          tone="deep"
          width={184}
          height={40}
          radius={999}
          style={styles.recommendationButton}
        />
      </View>
    </SkeletonGroup>
  );
}

export function QuickRecipeCardsSkeleton() {
  return (
    <SkeletonGroup
      label="Loading quick and easy recipes"
      style={styles.quickViewport}
    >
      <View style={styles.quickRow}>
        {Array.from({ length: 3 }, (_, index) => (
          <View key={index} style={styles.quickCard}>
            <SkeletonBlock
              tone="deep"
              width={68}
              height={27}
              radius={999}
              style={styles.quickTag}
            />

            <View style={styles.quickContent}>
              <SkeletonBlock tone="deep" width="90%" height={17} style={styles.quickTitle} />
              <SkeletonBlock tone="deep" width="64%" height={17} style={styles.quickTitleShort} />

              <View style={styles.quickMetaRow}>
                <SkeletonBlock tone="deep" width={58} height={13} />
                <SkeletonBlock tone="deep" width={42} height={13} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  recommendationCard: {
    height: 300,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: theme.colors.skeleton,
  },
  recommendationTag: {
    position: "absolute",
    top: 14,
    left: 14,
  },
  recommendationContent: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 20,
  },
  recommendationTitle: {
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 20,
  },
  recommendationButton: {
    alignSelf: "center",
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
    backgroundColor: theme.colors.skeleton,
  },
  quickTag: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  quickContent: {
    position: "absolute",
    left: 13,
    right: 13,
    bottom: 14,
  },
  quickTitle: {
    marginBottom: 7,
  },
  quickTitleShort: {
    marginBottom: 10,
  },
  quickMetaRow: {
    flexDirection: "row",
    gap: 8,
  },
});
