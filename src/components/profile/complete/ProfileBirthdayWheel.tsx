import { useEffect, useRef, type RefObject } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, StyleSheet, View } from "react-native";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const ROW_HEIGHT = 44;
const WHEEL_PADDING = 66;
const SETTLE_DELAY_MS = 120;

export function ProfileBirthdayWheel({ month, day, onChange }: { month: number; day: number; onChange: (month: number, day: number) => void }) {
  const monthRef = useRef<ScrollView>(null);
  const dayRef = useRef<ScrollView>(null);
  const initialMonth = useRef(month);
  const initialDay = useRef(day);
  const settleTimers = useRef<Map<RefObject<ScrollView | null>, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = settleTimers.current;
    const timer = setTimeout(() => {
      monthRef.current?.scrollTo({ y: (initialMonth.current - 1) * ROW_HEIGHT, animated: false });
      dayRef.current?.scrollTo({ y: (initialDay.current - 1) * ROW_HEIGHT, animated: false });
    }, 0);
    return () => {
      clearTimeout(timer);
      timers.forEach(clearTimeout);
    };
  }, []);

  function selectedIndex(event: NativeSyntheticEvent<NativeScrollEvent>, length: number) {
    return Math.max(0, Math.min(length - 1, Math.round(event.nativeEvent.contentOffset.y / ROW_HEIGHT)));
  }

  // snapToInterval only works on phones. On the web, once scrolling stops, settle on the row in the highlight.
  function settleOnRow(wheel: RefObject<ScrollView | null>, index: number) {
    if (Platform.OS !== "web") return;
    clearTimeout(settleTimers.current.get(wheel));
    settleTimers.current.set(wheel, setTimeout(() => wheel.current?.scrollTo({ y: index * ROW_HEIGHT, animated: true }), SETTLE_DELAY_MS));
  }

  // onScroll, not onMomentumScrollEnd: the web never fires momentum events and phones skip them after a slow drag.
  function onMonthScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = selectedIndex(event, MONTHS.length);
    onChange(index + 1, day);
    settleOnRow(monthRef, index);
  }

  function onDayScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = selectedIndex(event, DAYS.length);
    onChange(month, index + 1);
    settleOnRow(dayRef, index);
  }

  return <View style={styles.wrap}>
    <View pointerEvents="none" style={styles.highlight} />
    <View style={styles.wheels}>
      <ScrollView ref={monthRef} style={styles.monthWheel} contentContainerStyle={styles.wheelContent} showsVerticalScrollIndicator={false} snapToInterval={ROW_HEIGHT} decelerationRate="fast" scrollEventThrottle={16} onScroll={onMonthScroll}>
        {MONTHS.map((label) => <View key={label} style={styles.row}><AppText style={styles.value}>{label}</AppText></View>)}
      </ScrollView>
      <ScrollView ref={dayRef} style={styles.dayWheel} contentContainerStyle={styles.wheelContent} showsVerticalScrollIndicator={false} snapToInterval={ROW_HEIGHT} decelerationRate="fast" scrollEventThrottle={16} onScroll={onDayScroll}>
        {DAYS.map((value) => <View key={value} style={styles.row}><AppText style={styles.value}>{value}</AppText></View>)}
      </ScrollView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { position: "relative", height: 176, marginTop: 4 },
  highlight: { position: "absolute", top: WHEEL_PADDING, left: 0, right: 0, height: ROW_HEIGHT, borderRadius: 12, backgroundColor: theme.colors.card2 },
  wheels: { flexDirection: "row", gap: 8, height: 176 },
  monthWheel: { flex: 1.4 },
  dayWheel: { flex: 1 },
  wheelContent: { paddingVertical: WHEEL_PADDING },
  row: { height: ROW_HEIGHT, alignItems: "center", justifyContent: "center" },
  value: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 16.5, color: theme.colors.text },
});
