import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRecipeVocabularyPickerStore } from "../../../store/recipeVocabularyPickerStore";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";

export function RecipeVocabularyPickerScreen() {
  const insets = useSafeAreaInsets();
  const config = useRecipeVocabularyPickerStore((state) => state.config);
  const [values, setValues] = useState(config?.selected ?? []);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return config?.options ?? [];
    return (config?.options ?? []).filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.group?.toLowerCase().includes(query)
    );
  }, [config?.options, search]);

  if (!config) {
    return (
      <View style={styles.unavailable}>
        <AppText style={styles.unavailableText}>This picker is unavailable.</AppText>
        <Pressable onPress={() => router.back()} style={styles.doneButton}>
          <AppText style={styles.doneText}>Go back</AppText>
        </Pressable>
      </View>
    );
  }

  function toggle(value: string) {
    if (config?.single) {
      setValues([value]);
      return;
    }
    setValues((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }
      if (config?.max && current.length >= config.max) return current;
      return [...current, value];
    });
  }

  function finish() {
    config?.onDone(values);
    router.back();
  }

  const searchLabel = config.title
    .replace(/^Choose\s+/i, "")
    .replace(/^Recipe\s+/i, "")
    .toLowerCase();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="chevronLeft" size={18} color={theme.colors.text} />
        </Pressable>
        <AppText style={styles.title}>{config.title}</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        {config.description ? (
          <AppText style={styles.description}>{config.description}</AppText>
        ) : null}
        <View style={styles.searchBox}>
          <Icon name="discover" size={17} color={theme.colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={`Search ${searchLabel}`}
            placeholderTextColor="#9AA298"
            style={styles.searchInput}
          />
          {search ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => setSearch("")}>
              <Icon name="close" size={15} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {filtered.map((option) => {
            const selected = values.includes(option.id);
            return (
              <Pressable
                key={option.id}
                onPress={() => toggle(option.id)}
                style={styles.option}
              >
                <View style={[styles.check, selected && styles.checkSelected]}>
                  {selected ? (
                    <Icon name="check" size={13} color={theme.colors.onDark} strokeWidth={3} />
                  ) : null}
                </View>
                <View style={styles.optionCopy}>
                  <AppText style={styles.optionLabel}>{option.label}</AppText>
                  {config.showGroups !== false && option.group ? (
                    <AppText style={styles.optionGroup}>
                      {formatGroup(option.group, config.groupSeparator)}
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom) }]}>
        <Pressable onPress={finish} style={styles.doneButton}>
          <AppText style={styles.doneText}>
            Done{values.length ? ` · ${values.length} selected` : ""}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function formatGroup(group: string, separator?: string) {
  if (!separator) return group;
  return group.split(/\s*\/\s*/).join(separator);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.page },
  header: { paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.cream },
  title: { position: "absolute", left: 70, right: 70, bottom: 22, textAlign: "center", fontFamily: theme.fontFamily.display, fontSize: 15, color: theme.colors.navy },
  headerSpacer: { width: 42 },
  body: { flex: 1, paddingHorizontal: 20 },
  description: { marginBottom: 10, fontSize: 12, lineHeight: 17, color: theme.colors.textMuted },
  searchBox: { minHeight: 48, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.surface2 },
  searchInput: { flex: 1, paddingVertical: 0, fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.text },
  list: { paddingTop: 8, paddingBottom: 18 },
  option: { minHeight: 55, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  optionCopy: { flex: 1 },
  optionLabel: { fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text },
  optionGroup: { marginTop: 2, fontSize: 10.5, color: theme.colors.textMuted },
  check: { width: 22, height: 22, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.colors.border, borderRadius: 6 },
  checkSelected: { borderColor: theme.colors.navy, backgroundColor: theme.colors.navy },
  footer: { paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.page },
  doneButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: theme.colors.navy },
  doneText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.onDark },
  unavailable: { flex: 1, padding: 20, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: theme.colors.page },
  unavailableText: { fontSize: 13, color: theme.colors.textMuted },
});
