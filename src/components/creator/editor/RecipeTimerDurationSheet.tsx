import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { closeSheet } from "../../../store/uiStore";
import { theme } from "../../../theme/theme";
import { RecipeTimerInput } from "../../../types/api";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";

type TimerUnit = "minutes" | "hours";

export function RecipeTimerDurationSheet({
  onSave,
}: {
  onSave: (timer: RecipeTimerInput) => void;
}) {
  const [value, setValue] = useState("10");
  const [unit, setUnit] = useState<TimerUnit>("minutes");
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [showError, setShowError] = useState(false);
  const duration = Number(value);

  function save() {
    if (!Number.isFinite(duration) || duration <= 0) {
      setShowError(true);
      return;
    }

    onSave({
      position: 0,
      label: null,
      durationMinSeconds: duration * (unit === "hours" ? 3600 : 60),
      durationMaxSeconds: null,
      sourceText: null,
      sourceStart: null,
      sourceEnd: null,
      resolutionStatus: "confirmed",
    });
    closeSheet();
  }

  return (
    <View style={styles.sheet}>
      <AppText style={styles.title}>Timer duration</AppText>

      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="Timer duration"
          value={value}
          onChangeText={(nextValue) => {
            setValue(nextValue.replace(/[^0-9.]/g, ""));
            setShowError(false);
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={styles.durationInput}
        />

        <View style={styles.unitWrap}>
          <Pressable
            accessibilityLabel="Timer unit"
            accessibilityRole="button"
            onPress={() => setUnitMenuOpen((current) => !current)}
            style={styles.unitButton}
          >
            <AppText style={styles.unitButtonText}>
              {unit === "minutes" ? "Minutes" : "Hours"}
            </AppText>
            <Icon name="chevronDown" size={14} color={theme.colors.textMedium} />
          </Pressable>

          {unitMenuOpen ? (
            <View style={styles.unitMenu}>
              {(["minutes", "hours"] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setUnit(option);
                    setUnitMenuOpen(false);
                  }}
                  style={styles.unitOption}
                >
                  <AppText style={styles.unitOptionText}>
                    {option === "minutes" ? "Minutes" : "Hours"}
                  </AppText>
                  {unit === option ? (
                    <Icon name="check" size={14} color={theme.colors.navy} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {showError ? (
        <AppText style={styles.error}>
          Enter a timer longer than 0 minutes.
        </AppText>
      ) : null}

      <Pressable onPress={save} style={styles.saveButton}>
        <AppText style={styles.saveButtonText}>Save</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 24 },
  title: {
    marginBottom: 14,
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    color: theme.colors.text,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, zIndex: 2 },
  durationInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.text,
  },
  unitWrap: { width: 126, zIndex: 3 },
  unitButton: {
    minHeight: 48,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
  },
  unitButtonText: { fontSize: 14, color: theme.colors.text },
  unitMenu: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    shadowColor: theme.colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  unitOption: {
    minHeight: 42,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  unitOptionText: { fontSize: 13.5, color: theme.colors.text },
  error: { marginTop: 8, fontSize: 12, color: theme.colors.red },
  saveButton: {
    minHeight: 48,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: theme.colors.navy,
  },
  saveButtonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14.5,
    color: theme.colors.onDark,
  },
});
