// src/components/ui/BottomSheet.tsx
// Single global bottom-sheet host, mounted once at the app root. Anywhere else
// in the app, call openSheet(content) / closeSheet() from src/store/uiStore
// to show/hide it imperatively — mirrors the mockup's generic sheet pattern
// used for pickers/menus/confirmations.

import { useEffect } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { closeSheet, useUIStore } from "../../store/uiStore";
import { theme } from "../../theme/theme";

export function BottomSheetHost() {
  const content = useUIStore((state) => state.sheetContent);
  const progress = useSharedValue(0);
  const isOpen = content !== null;

  useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [isOpen, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.45,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 40 }],
    opacity: progress.value,
  }));

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.panel, panelStyle]}>
            <SafeAreaView>
              <View style={styles.handle} />
              {content}
            </SafeAreaView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.black,
  },
  keyboardAvoider: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border2,
    marginBottom: theme.spacing.lg,
  },
});
