import { Pressable, StyleSheet } from "react-native";
import { socialCopy } from "../../lib/socialCopy";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { SkeletonBlock, SkeletonGroup } from "../ui/Skeleton";

type Props = {
  following: boolean;
  // While the server hasn't said yet whether you follow this creator.
  loading?: boolean;
  onPress: () => void;
};

// Follow beside the creator on a recipe (PRD v6.9 section 20, A1). The button
// changing to Following is the only feedback: no toast.
export function FollowButton({ following, loading = false, onPress }: Props) {
  if (loading) {
    return (
      <SkeletonGroup label="Loading">
        <SkeletonBlock width={98} height={34} radius={999} />
      </SkeletonGroup>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      aria-pressed={following}
      hitSlop={{ top: 5, bottom: 5 }}
      style={({ pressed }) => [styles.button, following && styles.following, pressed && styles.pressed]}
    >
      <Icon
        name={following ? "check" : "userPlus"}
        size={16}
        color={following ? theme.colors.navy : theme.colors.onDark}
        strokeWidth={following ? 2.2 : 2}
      />
      <AppText style={[styles.label, following && styles.followingLabel]}>
        {following ? socialCopy.following : socialCopy.follow}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 0.75,
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  following: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.lineStrong,
  },
  pressed: { transform: [{ scale: 0.96 }] },
  label: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    lineHeight: 13,
    color: theme.colors.onDark,
  },
  followingLabel: { color: theme.colors.navy },
});
