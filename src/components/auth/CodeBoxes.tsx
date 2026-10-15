import { useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { theme } from "../../theme/theme";

const CODE_LENGTH = 6;

export function emptyCode() {
  return Array<string>(CODE_LENGTH).fill("");
}

// The six one-digit boxes of an emailed code (password reset and email
// confirmation). Typing moves to the next box, Backspace on an empty box goes
// back, and a pasted or autofilled code fills the boxes from where it lands.
export function CodeBoxes({
  code,
  onChange,
  invalid,
  autoFocus,
}: {
  code: string[];
  onChange: (code: string[]) => void;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const inputRefs = useRef<(TextInput | null)[]>([]);

  function handleDigitChange(index: number, value: string) {
    const digits = value.replace(/[^0-9]/g, "");

    if (digits.length > 1) {
      const next = [...code];
      let cursor = index;

      for (const digit of digits) {
        if (cursor >= CODE_LENGTH) break;
        next[cursor] = digit;
        cursor += 1;
      }

      onChange(next);
      inputRefs.current[Math.min(cursor, CODE_LENGTH - 1)]?.focus();
      return;
    }

    const next = [...code];
    next[index] = digits;
    onChange(next);

    if (digits && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={styles.row}>
      {code.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          value={digit}
          onChangeText={(value) => handleDigitChange(index, value)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
          keyboardType="number-pad"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          textContentType={index === 0 ? "oneTimeCode" : "none"}
          autoFocus={autoFocus && index === 0}
          accessibilityLabel={`Digit ${index + 1} of ${CODE_LENGTH}`}
          style={[styles.box, invalid && styles.boxInvalid]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 8,
  },
  box: {
    width: 46,
    minWidth: 36,
    flexShrink: 1,
    height: 56,
    textAlign: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 0.75,
    borderColor: "#E1E1E1",
    borderRadius: 14,
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 22,
    color: theme.colors.navy,
  },
  boxInvalid: {
    borderColor: theme.colors.red,
  },
});
