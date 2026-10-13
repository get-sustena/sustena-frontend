import { StyleSheet } from "react-native";
import { SkeletonBlock, SkeletonGroup } from "../ui/Skeleton";
import { CREATOR_GRID_GAP, useCreatorGridCardWidth } from "./creatorGrid";

const CARDS = 6;

// Shaped like the Profile tab's recipe grid: square cards, three to a row,
// at the same width the grid uses.
export function CreatorRecipeGridSkeleton() {
  const cardWidth = useCreatorGridCardWidth();

  return (
    <SkeletonGroup label="Loading your recipes" style={styles.grid}>
      {Array.from({ length: CARDS }, (_, index) => (
        <SkeletonBlock key={index} width={cardWidth} height={cardWidth} radius={12} />
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: CREATOR_GRID_GAP, rowGap: 14 },
});
