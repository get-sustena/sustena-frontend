// src/components/auth/PasswordStrengthMeter.tsx

import { StyleSheet, View } from "react-native";
import {
  getPasswordCriteria,
  getPasswordLevel,
} from "../../lib/passwordStrength";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

const REQUIREMENTS: { key: keyof ReturnType<typeof getPasswordCriteria>; label: string }[] = [
  { key: "length", label: "At least 8 characters" },
  { key: "upper", label: "One uppercase letter (A-Z)" },
  { key: "lower", label: "One lowercase letter (a-z)" },
  { key: "number", label: "One number (0-9)" },
  { key: "symbol", label: "One symbol (!@#$...)" },
];

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const criteria = getPasswordCriteria(password);
  const level = getPasswordLevel(password);

  return (
    <View style={styles.container}>
      <View style={styles.segments}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.segment,
              index < level.segmentsLit && { backgroundColor: level.color },
            ]}
          />
        ))}
      </View>

      {level.label ? (
        <AppText style={[styles.levelLabel, { color: level.color }]}>
          {level.label}
        </AppText>
      ) : null}

      <View style={styles.requirements}>
        {REQUIREMENTS.map((requirement) => {
          const met = criteria[requirement.key];

          return (
            <View key={requirement.key} style={styles.requirementRow}>
              <View
                style={[
                  styles.requirementIcon,
                  met && styles.requirementIconMet,
                ]}
              >
                {met ? (
                  <Icon
                    name="check"
                    size={9}
                    color={theme.colors.onDark}
                    strokeWidth={3}
                  />
                ) : null}
              </View>

              <AppText
                style={[
                  styles.requirementText,
                  met && styles.requirementTextMet,
                ]}
              >
                {requirement.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -6,
    marginBottom: theme.spacing.lg,
  },
  segments: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#EDF2E3",
  },
  levelLabel: {
    fontFamily: theme.fontFamily.monoSemiBold,
    fontSize: 12.5,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  requirements: {
    gap: 6,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requirementIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  requirementIconMet: {
    borderWidth: 0,
    backgroundColor: theme.colors.green,
  },
  requirementText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.textMuted,
  },
  requirementTextMet: {
    color: theme.colors.navy,
  },
});
