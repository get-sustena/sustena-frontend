import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";

export type ConfirmationSheetAction = {
  label: string;
  onPress: () => void | Promise<void>;
  primary?: boolean;
};

export function ConfirmationSheet({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: ConfirmationSheetAction[];
}) {
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>{title}</AppText>
      <AppText style={styles.description}>{description}</AppText>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={[styles.action, action.primary && styles.primaryAction]}
          >
            <AppText
              style={[
                styles.actionLabel,
                action.primary && styles.primaryActionLabel,
              ]}
            >
              {action.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 18,
  },
  title: {
    marginBottom: 8,
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    color: "#17291E",
  },
  description: {
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 21,
    color: "#5C6459",
  },
  actions: {
    gap: 10,
  },
  action: {
    alignItems: "center",
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#D8E3CA",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  primaryAction: {
    borderColor: "#17291E",
    backgroundColor: "#17291E",
  },
  actionLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: "#17291E",
  },
  primaryActionLabel: {
    color: "#FBFBF7",
  },
});
