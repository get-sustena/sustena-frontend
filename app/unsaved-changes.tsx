import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "../src/components/ui/AppText";
import { Icon } from "../src/components/ui/Icon";
import { Screen } from "../src/components/ui/Screen";
import { useUnsavedChanges } from "../src/hooks/useUnsavedChanges";
import type { UnsavedChange } from "../src/lib/sync/outboxRepair";
import { theme } from "../src/theme/theme";

// "Changes not saved" (F02): changes the server refused, and the changes
// waiting on them. Retry sends one again; Discard drops it and undoes it on
// this phone.
export default function UnsavedChangesScreen() {
  const { changes, retry, discard } = useUnsavedChanges();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, action: (id: string) => Promise<void>) {
    setBusyId(id);
    try {
      await action(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevronLeft" size={19} color={theme.colors.text} />
        </Pressable>

        <AppText style={styles.headerTitle}>Changes not saved</AppText>

        <View style={styles.headerButton} />
      </View>

      {changes.length === 0 ? (
        <View style={styles.empty}>
          <AppText style={styles.emptyTitle}>All your changes are saved</AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <AppText style={styles.intro}>
            These changes didn&apos;t reach your account. Retry one to send it again, or discard it
            to undo it on this phone.
          </AppText>

          {changes.map((change) => (
            <ChangeRow
              key={change.id}
              change={change}
              busy={busyId === change.id}
              onRetry={() => run(change.id, retry)}
              onDiscard={() => run(change.id, discard)}
            />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function ChangeRow({
  change,
  busy,
  onRetry,
  onDiscard,
}: {
  change: UnsavedChange;
  busy: boolean;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const waiting = change.waitingOn !== null;

  return (
    <View style={[styles.row, waiting && styles.rowWaiting]}>
      <AppText style={styles.title}>{change.title}</AppText>
      <AppText style={styles.reason}>
        {waiting ? "Waits for the change above." : change.reason}
      </AppText>

      {waiting ? null : (
        <View style={styles.actions}>
          <Pressable
            onPress={onRetry}
            disabled={busy}
            style={[styles.action, styles.retry]}
            accessibilityRole="button"
            accessibilityLabel={`Retry: ${change.title}`}
          >
            <AppText style={styles.retryText}>Retry</AppText>
          </Pressable>
          <Pressable
            onPress={onDiscard}
            disabled={busy}
            style={[styles.action, styles.discard]}
            accessibilityRole="button"
            accessibilityLabel={`Discard: ${change.title}`}
          >
            <AppText style={styles.discardText}>Discard</AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: -0.19,
    color: theme.colors.navy,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  intro: {
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    lineHeight: 22.5,
    color: theme.colors.textMedium,
    marginBottom: 4,
  },
  row: {
    padding: 16,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  rowWaiting: {
    marginLeft: 16,
  },
  title: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.navy,
  },
  reason: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textMedium,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  action: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  retry: {
    backgroundColor: theme.colors.navy,
  },
  retryText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.onDark,
  },
  discard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  discardText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.danger,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 21,
    lineHeight: 25,
    letterSpacing: -0.25,
    color: theme.colors.navy,
  },
});
