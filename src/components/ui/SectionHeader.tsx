import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";

type Props = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, actionLabel, onActionPress }: Props) {
  return (
    <View style={styles.container}>
      <AppText style={styles.title}>{title}</AppText>

      {actionLabel ? (
        <Pressable onPress={onActionPress}>
          <AppText style={styles.action}>{actionLabel}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 20,
    color: theme.colors.navy,
  },
  action: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.orange,
  },
});
