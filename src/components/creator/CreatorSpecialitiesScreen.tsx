import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthoringVocabularyQuery } from "../../hooks/api/useCreatorRecipes";
import { useCreatorProfileEditStore } from "../../store/creatorProfileEditStore";
import { showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function CreatorSpecialitiesScreen() {
  const insets = useSafeAreaInsets();
  const cuisineItems = useAuthoringVocabularyQuery().data?.cuisines;
  const options = useMemo(() => cuisineItems ?? [], [cuisineItems]);
  const selected = useCreatorProfileEditStore((state) => state.specialities);
  const setSelected = useCreatorProfileEditStore((state) => state.setSpecialities);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((item) => `${item.label} ${item.group ?? ""}`.toLowerCase().includes(normalized));
  }, [options, query]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      setSelected(selected.filter((item) => item !== value));
      return;
    }
    if (selected.length >= 3) {
      showToast("Choose up to 3 specialities.");
      return;
    }
    setSelected([...selected, value]);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}><Icon name="chevronLeft" size={19} /></Pressable>
          <AppText style={styles.title}>Choose specialities</AppText>
        </View>
        <View style={styles.search}>
          <Icon name="discover" size={17} color="#9aa298" />
          <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Search specialities" placeholderTextColor="#9aa298" style={styles.searchInput} />
          {query ? <Pressable accessibilityLabel="Clear search" onPress={() => setQuery("")} style={styles.clear}><Icon name="close" size={12} color="#5C6459" strokeWidth={2} /></Pressable> : null}
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {selected.length ? (
          <View>
            <AppText style={styles.sectionTitle}>Selected</AppText>
            <View style={styles.chips}>
              {selected.map((value) => <Pressable key={value} accessibilityLabel={`Remove ${labelFor(options, value)}`} onPress={() => toggle(value)}><AppText style={styles.chip}>{labelFor(options, value)} ×</AppText></Pressable>)}
            </View>
          </View>
        ) : null}
        {shown.length ? shown.map((option) => {
          const active = selected.includes(option.id);
          return (
            <Pressable key={option.id} onPress={() => toggle(option.id)} style={styles.row}>
              <View style={[styles.checkbox, active && styles.checkboxActive]}>{active ? <Icon name="check" size={13} color="#FBFBF7" strokeWidth={3} /> : null}</View>
              <View style={styles.rowCopy}>
                <AppText style={styles.label}>{option.label}</AppText>
                {option.group ? <AppText style={styles.group}>{option.group}</AppText> : null}
              </View>
            </Pressable>
          );
        }) : <AppText style={styles.empty}>No cuisine or tribe found</AppText>}
      </ScrollView>

      <View style={[styles.doneBar, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.done}><AppText style={styles.doneText}>{selected.length ? `Done · ${selected.length} selected` : "Done"}</AppText></Pressable>
      </View>
    </View>
  );
}

function labelFor(options: { id: string; label: string }[], value: string) {
  return options.find((item) => item.id === value)?.label ?? value;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  backButton: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#FBFBF7", alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: theme.fontFamily.display, fontSize: 16, color: "#17291E" },
  search: { minHeight: 44, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#EEF2E7" },
  searchInput: { flex: 1, paddingVertical: 0, fontFamily: theme.fontFamily.body, fontSize: 14, color: "#1B211C" },
  clear: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E1E1E1", alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  sectionTitle: { marginTop: 6, marginBottom: 8, fontFamily: theme.fontFamily.monoBold, fontSize: 11.5, letterSpacing: 0.92, textTransform: "uppercase", color: "#8a9187" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 10 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#EEF2E7", fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, color: "#1f7048" },
  row: { minHeight: 58, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#E1E1E1" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#E1E1E1", alignItems: "center", justifyContent: "center" },
  checkboxActive: { borderColor: "#17291E", backgroundColor: "#17291E" },
  rowCopy: { flex: 1 },
  label: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: "#1B211C" },
  group: { marginTop: 2, fontSize: 12, color: "#8a9187" },
  empty: { paddingVertical: 40, textAlign: "center", fontSize: 14, color: "#8a9187" },
  doneBar: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#E1E1E1", backgroundColor: "#FFFFFF", shadowColor: "#1B211C", shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 10 },
  done: { width: "100%", paddingVertical: 15, borderRadius: 999, backgroundColor: "#17291E", alignItems: "center" },
  doneText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: "#FBFBF7" },
});
