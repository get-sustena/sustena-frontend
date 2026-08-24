// src/components/ui/ToggleSwitch.tsx

import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";

type Props = {
  value: boolean;
  onChange: () => void;
};

export function ToggleSwitch({ value, onChange }: Props) {
  return (
    <Pressable
      onPress={onChange}
      style={[styles.track, value && styles.trackOn]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.border,
    padding: 3,
    justifyContent: "center",
  },
  trackOn: {
    backgroundColor: theme.colors.navy,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.white,
  },
  thumbOn: {
    transform: [{ translateX: 20 }],
  },
});
