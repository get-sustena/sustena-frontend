import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";
import { Icon } from "./Icon";

type InlineNoticeProps = {
  message: string;
  tone: "error" | "success";
  title?: string;
};

export function InlineNotice({
  message,
  tone,
  title,
}: InlineNoticeProps) {
  const isSuccess = tone === "success";

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.card,
        isSuccess ? styles.successCard : styles.errorCard,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          isSuccess ? styles.successIcon : styles.errorIcon,
        ]}
      >
        <Icon
          name={isSuccess ? "check" : "close"}
          size={14}
          color={theme.colors.onDark}
          strokeWidth={2.6}
        />
      </View>

      <View style={styles.copy}>
        {title ? (
          <AppText
            style={[styles.title, isSuccess && styles.successCardText]}
          >
            {title}
          </AppText>
        ) : null}
        <AppText
          style={[styles.message, isSuccess && styles.successCardText]}
        >
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  errorCard: {
    backgroundColor: "rgba(192,57,46,0.08)",
    borderColor: "rgba(192,57,46,0.28)",
  },
  successCard: {
    backgroundColor: theme.colors.navy,
    borderColor: theme.colors.navy,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  errorIcon: {
    backgroundColor: theme.colors.red,
  },
  successIcon: {
    backgroundColor: theme.colors.green,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    marginBottom: 2,
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  message: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMedium,
  },
  successCardText: {
    color: theme.colors.onDark,
  },
});
