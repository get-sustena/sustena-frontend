import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getUnitPickerLabel } from "../../../lib/unitConversion";
import { useRecipeUnitPickerStore } from "../../../store/recipeUnitPickerStore";
import { theme } from "../../../theme/theme";
import type { Unit } from "../../../types/api";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";

const GROUPS = [
  "Metric",
  "U.S. customary",
  "Imperial",
  "Nigerian units",
  "Count and descriptive",
] as const;

export function RecipeUnitPickerScreen() {
  const insets = useSafeAreaInsets();
  const config = useRecipeUnitPickerStore((state) => state.config);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (config?.units ?? []).filter(
      (unit) =>
        !query ||
        formatUnitName(unit).toLowerCase().includes(query) ||
        unit.name.toLowerCase().includes(query) ||
        unit.id.toLowerCase().includes(query)
    );
  }, [config?.units, search]);

  if (!config) {
    return (
      <View style={styles.unavailable}>
        <AppText style={styles.emptyText}>This unit picker is unavailable.</AppText>
        <Pressable onPress={() => router.back()} style={styles.backAction}>
          <AppText style={styles.backActionText}>Go back</AppText>
        </Pressable>
      </View>
    );
  }

  function choose(unitId: string | null) {
    config?.onSelect(unitId);
    router.back();
  }

  const recommended = filtered.find((unit) => unit.id === config.recommended);
  const groups = GROUPS.map((name) => ({
    name,
    units: filtered.filter((unit) => getUnitGroup(unit) === name),
  })).filter((group) => group.units.length > 0);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Icon name="chevronLeft" size={19} color={theme.colors.text} />
          </Pressable>
          <AppText style={styles.title}>Choose a unit</AppText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.searchBox}>
          <Icon name="discover" size={17} color={theme.colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Search units"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
          />
          {search ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => setSearch("")}>
              <Icon name="close" size={15} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {!filtered.length ? (
          <AppText style={styles.emptyText}>
            No compatible units are available for this ingredient.
          </AppText>
        ) : null}

        {recommended ? (
          <View>
            <GroupLabel>Recommended</GroupLabel>
            <UnitRow
              unit={recommended}
              selected={config.selected === recommended.id}
              onPress={() => choose(recommended.id)}
            />
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.name}>
            <GroupLabel>{group.name}</GroupLabel>
            {group.units.map((unit) => (
              <UnitRow
                key={unit.id}
                unit={unit}
                selected={config.selected === unit.id}
                onPress={() => choose(unit.id)}
              />
            ))}
          </View>
        ))}

        <Pressable onPress={() => choose(null)} style={styles.clearButton}>
          <AppText style={styles.clearText}>Clear unit</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function GroupLabel({ children }: { children: string }) {
  return <AppText style={styles.groupLabel}>{children}</AppText>;
}

function UnitRow({
  unit,
  selected,
  onPress,
}: {
  unit: Unit;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.unitRow}>
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected ? (
          <Icon name="check" size={13} color={theme.colors.onDark} strokeWidth={3} />
        ) : null}
      </View>
      <AppText style={styles.unitName}>{formatUnitName(unit)}</AppText>
    </Pressable>
  );
}

function formatUnitName(unit: Unit) {
  const label = getUnitPickerLabel(unit);
  if (
    unit.isApproximate &&
    Number(unit.baseFactorMin) !== Number(unit.baseFactorMax)
  ) {
    return `${label} (approx. ${Number(unit.baseFactorMin).toLocaleString()} to ${Number(unit.baseFactorMax).toLocaleString()} ${unit.baseUnit})`;
  }
  return label;
}

function getUnitGroup(unit: Unit): (typeof GROUPS)[number] {
  const id = unit.id.toLowerCase();
  if (unit.context === "count") return "Count and descriptive";
  if (id.startsWith("us_")) return "U.S. customary";
  if (
    id === "oz" ||
    id === "lb" ||
    id.startsWith("imp_") ||
    id.startsWith("imperial_") ||
    id.endsWith("_oz") ||
    id.endsWith("_lb")
  ) {
    return "Imperial";
  }
  if (
    id.includes("milk_cup") ||
    id.includes("derica") ||
    id.includes("congo") ||
    id.includes("paint_rubber") ||
    id.includes("custard_rubber") ||
    id.includes("_bag_")
  ) {
    return "Nigerian units";
  }
  return "Metric";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.white },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.cream },
  title: { position: "absolute", left: 70, right: 70, textAlign: "center", fontFamily: theme.fontFamily.display, fontSize: 16, color: theme.colors.navy },
  headerSpacer: { width: 42 },
  searchBox: { minHeight: 48, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.surface2 },
  searchInput: { flex: 1, paddingVertical: 0, fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.text },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  groupLabel: { marginTop: 8, marginBottom: 8, fontFamily: theme.fontFamily.body, fontSize: 11.5, letterSpacing: 0.92, textTransform: "uppercase", color: theme.colors.textMuted },
  unitRow: { minHeight: 52, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  check: { width: 22, height: 22, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.colors.border, borderRadius: 6 },
  checkSelected: { borderColor: theme.colors.navy, backgroundColor: theme.colors.navy },
  unitName: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text },
  clearButton: { minHeight: 54, alignItems: "center", justifyContent: "center" },
  clearText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.red },
  emptyText: { paddingVertical: 40, textAlign: "center", fontSize: 14, color: theme.colors.textMuted },
  unavailable: { flex: 1, padding: 20, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: theme.colors.white },
  backAction: { minHeight: 48, alignSelf: "stretch", alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: theme.colors.navy },
  backActionText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.onDark },
});
