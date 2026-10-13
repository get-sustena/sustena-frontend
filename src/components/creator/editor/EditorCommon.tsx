import { Href, router } from "expo-router";
import { ReactNode, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { setRecipeVocabularyPicker } from "../../../store/recipeVocabularyPickerStore";
import { theme } from "../../../theme/theme";
import { RecipeVocabularyItem } from "../../../types/api";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";

export function EditorStageIntro({
  eyebrow: _eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.intro}>
      <AppText style={styles.stageTitle}>{title}</AppText>
      <AppText style={styles.stageCopy}>{children}</AppText>
    </View>
  );
}

export function EditorSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title ? <AppText style={styles.sectionTitle}>{title}</AppText> : null}
      {description ? (
        <AppText style={styles.sectionDescription}>{description}</AppText>
      ) : null}
      {children}
    </View>
  );
}

export function EditorField({
  label,
  helper,
  required,
  meta,
  count,
  children,
}: {
  label: string;
  helper?: string;
  required?: boolean;
  meta?: string;
  count?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <AppText style={styles.label}>{label}</AppText>
        {required || meta ? (
          <AppText style={styles.labelMeta}>{required ? "Required" : meta}</AppText>
        ) : null}
      </View>
      {children}
      {helper || count ? (
        <View style={styles.fieldMeta}>
          {helper ? <AppText style={styles.helper}>{helper}</AppText> : <View />}
          {count ? <AppText style={styles.count}>{count}</AppText> : null}
        </View>
      ) : null}
    </View>
  );
}

export function EditorTextInput(props: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={theme.colors.textMuted}
      {...props}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      style={[
        styles.input,
        props.multiline && styles.multiline,
        props.style,
        focused && styles.inputFocused,
      ]}
    />
  );
}

export function SelectionField({
  label,
  helper,
  values,
  placeholder,
  required,
  last,
  onPress,
}: {
  label: string;
  helper?: string;
  values: string[];
  placeholder: string;
  required?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={placeholder}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selection,
        last && styles.selectionLast,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.selectionCopy}>
        <AppText style={styles.selectionLabel}>{label}</AppText>
        {values.length ? (
          <View style={styles.selectionValues}>
            {values.map((value) => (
              <View key={value} style={styles.valueChip}>
                <Icon
                  name="check"
                  size={12}
                  color={theme.colors.onDark}
                  strokeWidth={3}
                />
                <AppText style={styles.valueChipText}>{value}</AppText>
              </View>
            ))}
          </View>
        ) : null}
        {helper ? <AppText style={styles.selectionHelper}>{helper}</AppText> : null}
        {required ? null : null}
      </View>
      <Icon name="chevronRight" size={15} color={theme.colors.textMuted} />
    </Pressable>
  );
}

export function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choiceRow}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.choice,
              selected && styles.choiceSelected,
            ]}
          >
            <AppText
              style={[
                styles.choiceText,
                selected && styles.choiceTextSelected,
              ]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function openVocabularyPicker({
  title,
  description,
  options,
  selected,
  single = false,
  max,
  showGroups = true,
  groupSeparator,
  onDone,
}: {
  title: string;
  description?: string;
  options: RecipeVocabularyItem[];
  selected: string[];
  single?: boolean;
  max?: number;
  showGroups?: boolean;
  groupSeparator?: string;
  onDone: (values: string[]) => void;
}) {
  setRecipeVocabularyPicker({
    title,
    description,
    options,
    selected,
    single,
    max,
    showGroups,
    groupSeparator,
    onDone,
  });
  router.push("/creator/vocabulary-picker" as Href);
}

export function formatVocabularyValues(
  values: string[],
  options: RecipeVocabularyItem[]
) {
  const labels = new Map(options.map((option) => [option.id, option.label]));
  return values.map((value) => labels.get(value) ?? formatLabel(value));
}

export function moveArrayItem<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function formatLabel(value: string) {
  return value
    .split(/[-_]/)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");
}

const styles = StyleSheet.create({
  intro: { paddingTop: 8, paddingBottom: 24 },
  stageTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.8,
    color: theme.colors.navy,
  },
  stageCopy: { marginTop: 9, fontSize: 13, lineHeight: 20, color: theme.colors.textMedium },
  section: { marginBottom: 26, paddingBottom: 26, gap: 13, borderBottomWidth: 1, borderBottomColor: "#D9D9D9" },
  // v6.8 .cr-section-heading > div.
  sectionTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    letterSpacing: -0.32,
    color: theme.colors.navy,
  },
  sectionDescription: { marginTop: -7, fontSize: 12, lineHeight: 18, color: theme.colors.textMuted },
  field: { marginBottom: 20 },
  labelRow: { marginBottom: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  labelMeta: { fontSize: 11, color: theme.colors.textMuted },
  fieldMeta: { marginTop: 6, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  count: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.textMuted },
  helper: { flex: 1, fontSize: 12, lineHeight: 17, color: theme.colors.textMuted },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    backgroundColor: theme.colors.white,
    color: theme.colors.text,
    fontFamily: theme.fontFamily.body,
    fontSize: 14.5,
  },
  inputFocused: { borderColor: "#777777" },
  multiline: { minHeight: 104, paddingTop: 13, textAlignVertical: "top" },
  selection: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  selectionCopy: { flex: 1 },
  selectionLast: { borderBottomWidth: 0 },
  selectionLabel: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: theme.colors.text },
  selectionValues: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  selectionHelper: { marginTop: 6, fontSize: 12, lineHeight: 16, color: theme.colors.textMuted },
  valueChip: { paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: theme.colors.navy, borderRadius: 999, backgroundColor: theme.colors.navy },
  valueChipText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, color: theme.colors.onDark },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { flexGrow: 1, minWidth: 82, minHeight: 42, paddingHorizontal: 10, paddingVertical: 11, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, backgroundColor: theme.colors.white },
  choiceSelected: { borderColor: theme.colors.navy, backgroundColor: theme.colors.navy },
  choiceText: { fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.textMedium },
  choiceTextSelected: { color: theme.colors.white },
  card: { marginBottom: 12, padding: 13, gap: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, backgroundColor: theme.colors.white },
  pressed: { opacity: 0.82 },
});
