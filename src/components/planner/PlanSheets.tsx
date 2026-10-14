import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

// The sheets for saved meal plans (PRD v6.8 section 18), built like the
// shopping list sheets.

// "Save meal plan" and "Rename plan".
export function PlanNameSheet({
  title,
  initialName,
  placeholder,
  submitLabel,
  onSubmit,
}: {
  title: string;
  initialName: string;
  placeholder?: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const submit = () => {
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>{title}</AppText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textDim}
        style={styles.sheetInput}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
        accessibilityLabel="Plan name"
      />
      <Pressable
        onPress={submit}
        disabled={!name.trim()}
        style={[styles.sheetPrimaryButton, !name.trim() && styles.sheetPrimaryButtonDisabled]}
      >
        <AppText style={styles.sheetPrimaryButtonText}>{submitLabel}</AppText>
      </Pressable>
    </View>
  );
}

// The "…" menu on a saved plan: Rename plan, Add to shopping list (on the
// Saved meal plans screen) and Delete plan, which asks first.
export function PlanOptionsSheet({
  name,
  onRename,
  onAddToList,
  onDelete,
}: {
  name: string;
  onRename: (name: string) => void;
  onAddToList?: () => void;
  onDelete: () => void;
}) {
  const [step, setStep] = useState<"menu" | "rename" | "delete">("menu");

  if (step === "rename") {
    return <PlanNameSheet title="Rename plan" initialName={name} placeholder="Plan name" submitLabel="Save" onSubmit={onRename} />;
  }

  if (step === "delete") {
    return (
      <View style={styles.sheetContent}>
        <AppText style={styles.sheetTitle}>Delete “{name}”?</AppText>
        <AppText style={styles.sheetCopy}>This permanently removes the plan.</AppText>
        <View style={styles.confirmActions}>
          <Pressable onPress={() => setStep("menu")} style={styles.cancelButton}>
            <AppText style={styles.cancelText}>Cancel</AppText>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.deleteButton}>
            <AppText style={styles.sheetPrimaryButtonText}>Delete plan</AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.menuSheet}>
      <Pressable onPress={() => setStep("rename")} style={styles.menuRow}>
        <Icon name="pencil" size={19} color={theme.colors.navy} />
        <AppText style={styles.menuRowText}>Rename plan</AppText>
      </Pressable>
      {onAddToList ? (
        <Pressable onPress={onAddToList} style={styles.menuRow}>
          <Icon name="shop" size={19} color={theme.colors.navy} />
          <AppText style={styles.menuRowText}>Add to shopping list</AppText>
        </Pressable>
      ) : null}
      <Pressable onPress={() => setStep("delete")} style={styles.menuRow}>
        <Icon name="trash" size={19} color={theme.colors.red} />
        <AppText style={styles.menuRowDanger}>Delete plan</AppText>
      </Pressable>
    </View>
  );
}

// Making a new plan over one that isn't saved asks first, so a plan is
// never lost by mistake.
export function SavePlanFirstSheet({ onDontSave, onSave }: { onDontSave: () => void; onSave: () => void }) {
  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>Save this plan first?</AppText>
      <AppText style={styles.sheetCopy}>Your new plan will replace this one.</AppText>
      <View style={styles.confirmActions}>
        <Pressable onPress={onDontSave} style={styles.cancelButton}>
          <AppText style={styles.cancelText}>Don’t save</AppText>
        </Pressable>
        <Pressable onPress={onSave} style={styles.saveButton}>
          <AppText style={styles.sheetPrimaryButtonText}>Save plan</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContent: { paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
  menuSheet: { paddingBottom: theme.spacing.xl },
  menuRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuRowText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: theme.colors.navy },
  menuRowDanger: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: theme.colors.red },
  sheetCopy: { fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 21, color: theme.colors.textMedium },
  confirmActions: { flexDirection: "row", gap: 10 },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card2,
  },
  cancelText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: theme.colors.navy },
  deleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.red,
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.navy,
  },
  sheetTitle: { fontFamily: theme.fontFamily.display, fontSize: 20, color: theme.colors.navy, marginBottom: theme.spacing.sm },
  sheetInput: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.lg,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.text,
  },
  sheetPrimaryButton: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetPrimaryButtonDisabled: { opacity: 0.5 },
  sheetPrimaryButtonText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.onDark },
});
