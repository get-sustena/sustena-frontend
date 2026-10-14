import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type ViewStyle } from "react-native";
import { MAX_SERVINGS, MIN_SERVINGS, parseServingsInput, stepServings } from "../../lib/servings";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";
import { Icon } from "./Icon";

type Props = {
  value: number;
  onChange: (servings: number) => void;
  // The word after the number, such as "servings" or "people".
  unit?: (servings: number) => string;
  style?: ViewStyle;
};

const servingsUnit = (servings: number) => (servings === 1 ? "serving" : "servings");

// Servings anywhere in the app (SRV-01): − and + for small steps, and the
// number itself can be typed, from 1 to 500. Something that isn't a whole
// number in range shows a short message and is left as typed.
export function ServingsStepper({ value, onChange, unit = servingsUnit, style }: Props) {
  const [text, setText] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  // A change made outside the field (− and +, or a new recipe) shows in it.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setText(String(value));
    setError(null);
  }

  function handleChangeText(next: string) {
    setText(next);
    const parsed = parseServingsInput(next);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setShown(parsed.value);
    onChange(parsed.value);
  }

  function step(direction: 1 | -1) {
    onChange(stepServings(value, direction));
  }

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.card, error ? styles.cardError : null]}>
        <Pressable
          onPress={() => step(-1)}
          disabled={value <= MIN_SERVINGS}
          style={[styles.button, value <= MIN_SERVINGS && styles.buttonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Fewer servings"
        >
          <Icon name="minus" size={20} color={theme.colors.text} />
        </Pressable>

        <View style={styles.valueWrap}>
          <TextInput
            value={text}
            onChangeText={handleChangeText}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={4}
            selectTextOnFocus
            accessibilityLabel="Servings"
            accessibilityHint={`A whole number from ${MIN_SERVINGS} to ${MAX_SERVINGS}`}
            style={styles.value}
          />
          <AppText style={styles.unit}>{unit(value)}</AppText>
        </View>

        <Pressable
          onPress={() => step(1)}
          disabled={value >= MAX_SERVINGS}
          style={[styles.button, value >= MAX_SERVINGS && styles.buttonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="More servings"
        >
          <Icon name="plus" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      {error ? (
        <AppText style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
  },
  card: {
    width: 220,
    backgroundColor: theme.colors.white,
    borderWidth: 0.5,
    borderColor: "#E2E2E0",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardError: {
    borderColor: theme.colors.danger,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  valueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
  },
  value: {
    minWidth: 28,
    maxWidth: 56,
    padding: 0,
    textAlign: "center",
    fontFamily: theme.fontFamily.display,
    fontSize: 22,
    color: theme.colors.navy,
  },
  unit: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: "#545B53",
  },
  error: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.danger,
    textAlign: "center",
  },
});
