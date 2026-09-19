import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

const TRIED_RECIPES = ["Jollof Rice & Chicken", "Egusi Soup", "Fried Rice", "Pepper Soup"];
export function RecipesTriedSheet() {
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Recipes Tried</AppText>
      {TRIED_RECIPES.map((name) => (
        <View key={name} style={styles.row}>
          <View style={styles.check}><Icon name="check" size={14} color="#1f7048" /></View>
          <AppText style={styles.recipeName}>{name}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 18 },
  title: { marginBottom: 14, fontFamily: theme.fontFamily.display, fontSize: 18, color: "#17291E" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#E1E1E1" },
  check: { width: 34, height: 34, borderRadius: 9, backgroundColor: "#EEF2E7", alignItems: "center", justifyContent: "center" },
  recipeName: { fontSize: 14, color: "#17291E" },
});
