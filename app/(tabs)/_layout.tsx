
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { BlurView } from "expo-blur";
import { router, Tabs } from "expo-router";
import { useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { UnsavedChangesNotice } from "../../src/components/sync/UnsavedChangesNotice";
import { AppText } from "../../src/components/ui/AppText";
import { Icon, IconName } from "../../src/components/ui/Icon";
import { useToastLift } from "../../src/hooks/useToastLift";
import { useShoppingListStore } from "../../src/store/shoppingListStore";
import { theme } from "../../src/theme/theme";

const TAB_ICONS: Record<string, IconName> = {
  home: "home",
  planner: "pantry",
  recipes: "cook",
  shopping: "shop",
  profile: "profile",
};

// The tab bar floats this far above the bottom of the screen.
const TAB_BAR_GAP = Platform.select({ ios: 22, default: 16 });

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="planner" options={{ title: "Pantry" }} />
      <Tabs.Screen name="recipes" options={{ title: "Recipes" }} />
      <Tabs.Screen name="shopping" options={{ title: "Shopping" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [barWidth, setBarWidth] = useState(0);
  const tabCount = state.routes.length;
  const segmentWidth = Math.max(barWidth - 16, 0) / tabCount;
  const cartCount = useShoppingListStore((s) =>
    s.items.filter((item) => !item.checked).length
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [
      {
        translateX: withTiming(segmentWidth * state.index, {
          duration: 320,
          easing: Easing.out(Easing.back(1.4)),
        }),
      },
    ],
  }));

  const liftToast = useToastLift(TAB_BAR_GAP);

  function handleLayout(event: LayoutChangeEvent) {
    setBarWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none" onLayout={liftToast}>
      <UnsavedChangesNotice />
      <View style={styles.barShadow}>
        <View style={styles.bar} onLayout={handleLayout}>
          {/* v6.8: an 86% navy layer over a 20px blur (intensity 100 on web). */}
          <BlurView
            intensity={100}
            tint="default"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.tint} />

          {barWidth > 0 ? (
            <Animated.View style={[styles.indicator, indicatorStyle]} />
          ) : null}

          <View style={styles.row}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              const label =
                typeof options.title === "string" ? options.title : route.name;
              const iconName = TAB_ICONS[route.name] ?? "home";
              const showCartBadge = route.name === "shopping" && cartCount > 0;

              function handlePress() {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (event.defaultPrevented) return;

                if (route.name === "planner") {
                  router.navigate("/(tabs)/planner");
                } else if (!isFocused) {
                  navigation.navigate(route.name);
                }
              }

              return (
                <Pressable
                  key={route.key}
                  onPress={handlePress}
                  style={styles.tab}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      isFocused && styles.iconWrapActive,
                    ]}
                  >
                    <Icon
                      name={iconName}
                      size={20}
                      color={
                        isFocused ? theme.colors.onDark : theme.colors.textDim
                      }
                    />

                    {showCartBadge ? (
                      <View style={styles.cartBadge}>
                        <AppText style={styles.cartBadgeText}>
                          {cartCount > 9 ? "9+" : cartCount}
                        </AppText>
                      </View>
                    ) : null}
                  </View>

                  <AppText
                    style={[styles.label, isFocused && styles.labelActive]}
                  >
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: TAB_BAR_GAP,
  },
  // The shadow sits outside the clipped bar so the rounded clip can't cut it.
  barShadow: {
    borderRadius: 24,
    boxShadow: "0px 24px 46px -14px rgba(10,18,13,0.55)",
  },
  bar: {
    height: 60,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
  },
  tint: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    backgroundColor: "rgba(19,34,25,0.86)",
    boxShadow: "inset 0px 1px 0px rgba(255,255,255,0.07)",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    padding: 8,
  },
  indicator: {
    position: "absolute",
    top: 8,
    bottom: 8,
    left: 8,
    borderRadius: 18,
    backgroundColor: "rgba(122,180,120,0.26)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    zIndex: 1,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    transform: [{ scale: 1.14 }, { translateY: -1 }],
  },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -9,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.orange,
    borderWidth: 2,
    borderColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.navy,
  },
  label: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 10.5,
    color: theme.colors.textDim,
    opacity: 0.9,
  },
  labelActive: {
    color: theme.colors.onDark,
    opacity: 1,
  },
});
