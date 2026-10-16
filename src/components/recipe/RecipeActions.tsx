import { Pressable, StyleSheet, View } from "react-native";
import { socialCopy } from "../../lib/socialCopy";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

type Props = {
  saved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
};

// Save recipe and Share, under the creator (PRD v6.9 section 20, A2).
export function RecipeActions({ saved, onToggleSave, onShare }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggleSave}
        accessibilityRole="button"
        accessibilityState={{ selected: saved }}
        aria-pressed={saved}
        style={({ pressed }) => [styles.save, saved && styles.saveOn, pressed && styles.pressed]}
      >
        <Icon
          name={saved ? "check" : "bookmark"}
          size={18}
          color={saved ? theme.colors.navy3 : theme.colors.navy}
          strokeWidth={2}
        />
        <AppText style={[styles.saveLabel, saved && styles.saveLabelOn]}>
          {saved ? socialCopy.saved : socialCopy.saveRecipe}
        </AppText>
      </Pressable>
      <Pressable
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel="Share recipe"
        style={({ pressed }) => [styles.share, pressed && styles.pressed]}
      >
        <Icon name="share" size={19} color={theme.colors.navy} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, marginBottom: 18 },
  save: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 0.75,
    borderColor: theme.colors.lineStrong,
    backgroundColor: theme.colors.surface,
  },
  saveOn: {
    backgroundColor: theme.colors.cream2,
    borderColor: theme.colors.cream2,
  },
  saveLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14.5,
    lineHeight: 14.5,
    color: theme.colors.navy,
  },
  saveLabelOn: { color: theme.colors.navy3 },
  share: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 0.75,
    borderColor: theme.colors.lineStrong,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { transform: [{ scale: 0.96 }] },
});
