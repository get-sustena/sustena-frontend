import { ReactNode } from "react";
import { ScrollView, StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../theme/theme";

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
};

export function Screen({
  children,
  scroll = false,
  style,
  contentContainerStyle,
}: Props) {
  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, style]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={[styles.safe, style]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  // v6.8's recipe, saved recipes and profile pages sit on white (--st-surface).
  safe: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scrollContent: {
    paddingBottom: 110,
  },
});
