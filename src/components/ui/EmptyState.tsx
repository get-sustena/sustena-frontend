// src/components/ui/EmptyState.tsx

import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";

type Props = {
  icon?: string;
  iconName?: IconName;
  title?: string;
  message: string;
};

export function EmptyState({ icon, iconName, title, message }: Props) {
  return (
    <View style={styles.container}>
      {iconName ? (
        <View style={styles.iconWrap}>
          <Icon
            name={iconName}
            size={27}
            color={theme.colors.textMutedAlt}
            strokeWidth={1.7}
          />
        </View>
      ) : icon ? (
        <AppText style={styles.icon}>{icon}</AppText>
      ) : null}

      {title ? <AppText style={styles.title}>{title}</AppText> : null}

      <AppText style={styles.message}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing["2xl"],
    paddingVertical: 40,
    alignItems: "center",
  },
  icon: {
    fontSize: 48,
    opacity: 0.5,
    marginBottom: theme.spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    marginBottom: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.navy,
    marginBottom: theme.spacing.xs,
  },
  message: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
});
