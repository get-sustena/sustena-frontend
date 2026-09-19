import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { closeSheet, useUIStore } from "../../store/uiStore";
import { theme } from "../../theme/theme";

export function BottomSheetHost() {
  const content = useUIStore((state) => state.sheetContent);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const progress = useSharedValue(0);
  const isOpen = content !== null;

  useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [isOpen, progress]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
      onShow={() => setIsKeyboardVisible(Keyboard.isVisible())}
      onRequestClose={closeSheet}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.panelFrame, panelStyle]}>
            {isKeyboardVisible && Platform.OS !== "web" ? (
              <View pointerEvents="none" style={styles.keyboardBridge} />
            ) : null}
            <View style={styles.panel}>
              <SafeAreaView edges={isKeyboardVisible ? [] : ["bottom"]} style={styles.safeArea}>
                <View style={styles.handle} />
                {content}
              </SafeAreaView>
            </View>
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
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.black,
  },
  keyboardAvoider: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  panelFrame: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "100%",
    flexShrink: 1,
  },
  panel: {
    width: "100%",
    maxHeight: "100%",
    flexShrink: 1,
    overflow: "hidden",
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  keyboardBridge: {
    position: "absolute",
    right: 0,
    bottom: -24,
    left: 0,
    height: 24,
    backgroundColor: theme.colors.card,
  },
  safeArea: {
    flexShrink: 1,
    minHeight: 0,
    maxHeight: "100%",
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
