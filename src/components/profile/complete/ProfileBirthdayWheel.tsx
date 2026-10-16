import { useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from "react-native";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const ROW_HEIGHT = 44;
const WHEEL_PADDING = 66;

export function ProfileBirthdayWheel({ month, day, onChange }: { month: number; day: number; onChange: (month: number, day: number) => void }) {
  const monthRef = useRef<ScrollView>(null);
  const dayRef = useRef<ScrollView>(null);
  const initialMonth = useRef(month);
  const initialDay = useRef(day);

  useEffect(() => {
    const timer = setTimeout(() => {
      monthRef.current?.scrollTo({ y: (initialMonth.current - 1) * ROW_HEIGHT, animated: false });
      dayRef.current?.scrollTo({ y: (initialDay.current - 1) * ROW_HEIGHT, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function selectedIndex(event: NativeSyntheticEvent<NativeScrollEvent>, length: number) {
    return Math.max(0, Math.min(length - 1, Math.round(event.nativeEvent.contentOffset.y / ROW_HEIGHT)));
  }

  return <View style={styles.wrap}>
    <View pointerEvents="none" style={styles.highlight} />
    <View style={styles.wheels}>
      {/* onScroll, not onMomentumScrollEnd: the web never fires momentum events and phones skip them after a slow drag. */}
      <ScrollView ref={monthRef} style={styles.monthWheel} contentContainerStyle={styles.wheelContent} showsVerticalScrollIndicator={false} snapToInterval={ROW_HEIGHT} decelerationRate="fast" scrollEventThrottle={16} onScroll={(event) => onChange(selectedIndex(event, MONTHS.length) + 1, day)}>
        {MONTHS.map((label) => <View key={label} style={styles.row}><AppText style={styles.value}>{label}</AppText></View>)}
      </ScrollView>
      <ScrollView ref={dayRef} style={styles.dayWheel} contentContainerStyle={styles.wheelContent} showsVerticalScrollIndicator={false} snapToInterval={ROW_HEIGHT} decelerationRate="fast" scrollEventThrottle={16} onScroll={(event) => onChange(month, selectedIndex(event, DAYS.length) + 1)}>
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
