import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { BudgetPlannerPane } from "../../src/components/planner/BudgetPlannerPane";
import { KitchenPlannerPane } from "../../src/components/planner/KitchenPlannerPane";
import { PlannerTabButton } from "../../src/components/planner/PlannerTabButton";
import { AppText } from "../../src/components/ui/AppText";
import { theme } from "../../src/theme/theme";
import { PlannerTab } from "../../src/types/planner";

const PLANNER_TABS: {
  label: string;
  value: PlannerTab;
}[] = [
  {
    label: "Budget",
    value: "budget",
  },
  {
    label: "Kitchen",
    value: "kitchen",
  },
];

export default function PlannerScreen() {
  const insets = useSafeAreaInsets();
  const { tab, category } = useLocalSearchParams<{
    tab?: string;
    category?: string;
  }>();
  const requestedTab = isPlannerTab(tab) ? tab : "budget";
  const [activeTab, setActiveTab] = useState<PlannerTab>(requestedTab);
  const [trackWidth, setTrackWidth] = useState(0);
  const [kitchenLoadMoreSignal, setKitchenLoadMoreSignal] = useState(0);
  const didLoadDuringScrollGesture = useRef(false);
  const activeIndex = Math.max(
    0,
    PLANNER_TABS.findIndex((tab) => tab.value === activeTab)
  );
  const indicatorPosition = useSharedValue(0);
  const segmentWidth =
    trackWidth > 0 ? (trackWidth - 10) / PLANNER_TABS.length : 0;

  useEffect(() => {
    indicatorPosition.value = withTiming(activeIndex * segmentWidth, {
      duration: 320,
    });
  }, [activeIndex, indicatorPosition, segmentWidth]);

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
  }));

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (activeTab !== "kitchen") {
      return;
    }

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromEnd =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromEnd < 120 && !didLoadDuringScrollGesture.current) {
      didLoadDuringScrollGesture.current = true;
      setKitchenLoadMoreSignal((current) => current + 1);
    }
  }

  return (
    <View style={styles.screen}>
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top, 52) }]}
      >
        <AppText style={styles.title}>What&apos;s your goal?</AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          didLoadDuringScrollGesture.current = false;
        }}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 100 },
        ]}
      >
        <View
          style={styles.tabsWrapper}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        >
          {trackWidth > 0 ? (
            <Animated.View
              style={[styles.indicator, { width: segmentWidth }, indicatorStyle]}
            />
          ) : null}

          {PLANNER_TABS.map((plannerTab) => (
            <PlannerTabButton
              key={plannerTab.value}
              label={plannerTab.label}
              value={plannerTab.value}
              active={activeTab === plannerTab.value}
              onPress={setActiveTab}
            />
          ))}
        </View>

        {activeTab === "budget" ? <BudgetPlannerPane /> : null}

        {activeTab === "kitchen" ? (
          <KitchenPlannerPane
            initialCategory={category}
            loadMoreSignal={kitchenLoadMoreSignal}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function isPlannerTab(value?: string): value is PlannerTab {
  return value === "budget" || value === "kitchen";
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.white,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 26,
    color: theme.colors.navy,
  },
  scrollContent: {
    backgroundColor: theme.colors.white,
  },
  tabsWrapper: {
    position: "relative",
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 5,
    borderRadius: 16,
    backgroundColor: "#EDF2E3",
    flexDirection: "row",
  },
  indicator: {
    position: "absolute",
    top: 5,
    bottom: 5,
    left: 5,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
});
