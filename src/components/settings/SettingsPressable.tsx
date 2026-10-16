import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { theme } from "../../theme/theme";

type Props = Omit<PressableProps, "style" | "children"> & {
  // Rows and tiles highlight; buttons and cards shrink a little.
  feedback: "highlight" | "shrink";
  // Ink tiles highlight lighter instead of the usual light wash.
  highlightColor?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

// The Settings v6.9.2 states (PRD §21): rows and tiles highlight on press and
// hover, buttons and cards scale to .96 (not with reduced motion), and all
// show a focus ring.
export function SettingsPressable({ feedback, highlightColor = theme.colors.pressed, style, children, onFocus, onBlur, ...props }: Props) {
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      {...props}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={({ pressed, hovered }) => [
        style,
        feedback === "highlight" && (pressed || hovered) && { backgroundColor: highlightColor },
        feedback === "shrink" && pressed && !reduceMotion && styles.shrink,
        focused && styles.focused,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shrink: { transform: [{ scale: 0.96 }] },
  focused: { outlineWidth: 2, outlineStyle: "solid", outlineColor: theme.colors.focusRing, outlineOffset: 2 },
});
