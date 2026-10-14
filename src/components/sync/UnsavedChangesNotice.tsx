import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

// Above the tab bar while any change the server refused is waiting (F02).
export function UnsavedChangesNotice() {
  const { changes } = useUnsavedChanges();
  const refused = changes.filter((change) => !change.waitingOn).length;
  if (refused === 0) return null;

  return (
    <Pressable
      onPress={() => router.push("/unsaved-changes")}
      style={styles.notice}
      accessibilityRole="button"
      accessibilityLabel={`${refused === 1 ? "1 change" : `${refused} changes`} not saved. Review`}
    >
      <Icon name="close" size={13} color={theme.colors.onDark} strokeWidth={2.6} />
      <AppText style={styles.text}>
        {refused === 1 ? "1 change not saved" : `${refused} changes not saved`}
      </AppText>
      <AppText style={styles.action}>Review</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.danger,
  },
  text: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    lineHeight: 17,
    color: theme.colors.onDark,
  },
  action: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    lineHeight: 17,
    color: theme.colors.onDark,
    textDecorationLine: "underline",
  },
});
