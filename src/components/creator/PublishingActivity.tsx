import { StyleSheet, View } from "react-native";
import type { RecipeDraft } from "../../types/api";

const WEEKS = 10;
const DAYS = 7;

export function PublishingActivity({ recipes }: { recipes: RecipeDraft[] }) {
  const today = startOfDay(new Date());
  const start = new Date(today);
  start.setDate(today.getDate() - (WEEKS * DAYS - 1));
  const counts = new Map<string, number>();
  recipes.forEach((recipe) => {
    if (!recipe.publishedAt) return;
    const key = dayKey(new Date(recipe.publishedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return (
    <View style={styles.calendar}>
      {Array.from({ length: WEEKS }, (_, week) => (
        <View key={week} style={styles.week}>
          {Array.from({ length: DAYS }, (_, day) => {
            const date = new Date(start);
            date.setDate(start.getDate() + week * DAYS + day);
            const count = counts.get(dayKey(date)) ?? 0;
            return <View key={day} style={[styles.cell, { backgroundColor: count >= 3 ? "#1f7048" : count === 2 ? "#279a5f" : count === 1 ? "#a8dbb8" : "#EEF2E7" }]} />;
          })}
        </View>
      ))}
    </View>
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

const styles = StyleSheet.create({
  calendar: { height: 62, marginBottom: 20, flexDirection: "row", gap: 3 },
  week: { flex: 1, gap: 3 },
  cell: { flex: 1, borderRadius: 2 },
});
