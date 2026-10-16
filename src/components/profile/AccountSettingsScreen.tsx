import { Href, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLogoutMutation } from "../../hooks/api/useAuth";
import { usePreferencesQuery } from "../../hooks/api/usePreferences";
import { useSettingsCommands } from "../../hooks/useSettingsCommands";
import { useProfileAnswersQuery } from "../../hooks/api/useProfileAnswers";
import { useFavoriteRecipes } from "../../hooks/useFavoriteRecipes";
import { markWelcomeSeen } from "../../db/appMetadataRepository";
import { disableMealReminders, enableMealReminders } from "../../lib/notifications/mealReminders";
import { agreedOnText } from "../../lib/legal/agreement";
import { countAnsweredProfileFields, PROFILE_COMPLETION_FIELD_COUNT } from "../../lib/profileCompletion";
import { useAuthStore } from "../../store/authStore";
import { usePreferencesStore } from "../../store/preferencesStore";
import { useProfileAnswersStore } from "../../store/profileAnswersStore";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import type { UnitMode } from "../../data/recipes";
import { SettingsCard, SettingsSection } from "../settings/SettingsLayout";
import { SettingsPressable } from "../settings/SettingsPressable";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { ConfirmEmailRow } from "./ConfirmEmailRow";
import { ProfileCompletionCard } from "./ProfileCompletionCard";
import { ProfileDetailsSheet } from "./ProfileDetailsSheet";
import { ServingSizeSheet } from "./ServingSizeSheet";
import { SettingsRow } from "./SettingsRow";
import { SignOutSheet } from "./SignOutSheet";
import { UnitPickerSheet } from "./UnitPickerSheet";

// Settings v6.9.2 (PRD §21): you at the top, tiles for activity and cooking,
// then cards of rows. Premium, orders, deliveries, addresses, dark mode and
// WhatsApp updates aren't in the app yet, so their rows are left out.
export function AccountSettingsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const logoutMutation = useLogoutMutation();
  const settings = useSettingsCommands();
  const preferences = usePreferencesStore();
  const answers = useProfileAnswersStore();
  const { favoriteRecipes } = useFavoriteRecipes();
  const answered = countAnsweredProfileFields(answers);
  // Unknown until /auth/me answers (an offline start), so left blank till then.
  const user = useAuthStore((state) => state.user);
  const agreedOn = user ? agreedOnText(user.termsAcceptedAt) : undefined;
  const name = user?.fullName?.trim() || [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const [mealRemindersBusy, setMealRemindersBusy] = useState(false);
  usePreferencesQuery();
  useProfileAnswersQuery();

  function saveUnits(value: UnitMode) {
    void settings.savePreferences({
      healthConditions: preferences.healthConditions,
      dietaryPreference: preferences.dietaryPreference,
      defaultUnitMode: value,
      defaultServingSize: preferences.defaultServingSize,
    });
    closeSheet();
    showToast("Default units saved", "success");
  }

  async function changeMealReminders() {
    if (mealRemindersBusy) return;
    setMealRemindersBusy(true);
    try {
      if (preferences.mealRemindersEnabled) {
        preferences.setMealRemindersEnabled(false);
        await disableMealReminders(db);
        return;
      }

      const result = await enableMealReminders(db);
      if (result === "enabled") {
        preferences.setMealRemindersEnabled(true);
        showToast("Meal reminders on. Your picks arrive at 8am, 1pm and 5pm.", "success");
      } else if (result === "denied") {
        showToast(
          "Notifications are off for Sustena. Turn them on in your phone settings.",
          "default",
          { label: "Open settings", onPress: () => void Linking.openSettings() }
        );
      } else {
        showToast("Couldn't turn on meal reminders. Check your connection and try again.", "danger");
      }
    } finally {
      setMealRemindersBusy(false);
    }
  }

  function saveServings(value: number) {
    void settings.savePreferences({
      healthConditions: preferences.healthConditions,
      dietaryPreference: preferences.dietaryPreference,
      defaultUnitMode: preferences.defaultUnitMode,
      defaultServingSize: value,
    });
    closeSheet();
    showToast("Default serving size saved", "success");
  }

  async function signOut() {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      await markWelcomeSeen(db).catch(() => undefined);
      closeSheet();
      router.replace("/auth");
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Back to profile" onPress={() => router.back()} style={styles.headerButton}><Icon name="chevronLeft" size={19} /></Pressable>
        <AppText style={styles.headerTitle}>Settings</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.me}>
          <View style={styles.meTop}>
            <View style={styles.avatar}><AppText style={styles.initials}>{initialsOf(name)}</AppText></View>
            <View style={styles.meText}>
              <AppText style={styles.name}>{name}</AppText>
              <AppText style={styles.email}>{user?.email ?? ""}</AppText>
            </View>
          </View>
          <View style={styles.meButtons}>
            <SettingsPressable feedback="shrink" accessibilityRole="button" onPress={() => router.push("/creator/edit-profile" as Href)} style={styles.pillButton}>
              <AppText style={styles.pillButtonText}>Edit creator profile</AppText>
            </SettingsPressable>
            <SettingsPressable feedback="shrink" accessibilityRole="button" onPress={() => openSheet(<ProfileDetailsSheet />)} style={styles.pillButton}>
              <AppText style={styles.pillButtonText}>Profile details</AppText>
            </SettingsPressable>
          </View>
        </View>

        <ConfirmEmailRow />

        <SettingsSection title="Your activity">
          <View style={styles.stats}>
            <SettingsPressable feedback="highlight" highlightColor={theme.colors.pressedInk} accessibilityRole="button" onPress={() => router.push("/saved-recipes" as Href)} style={styles.stat}>
              <AppText style={styles.statNumber}>{favoriteRecipes.length}</AppText>
              <AppText style={styles.statLabel}>Saved recipes</AppText>
            </SettingsPressable>
          </View>
        </SettingsSection>

        <SettingsSection title="Cooking">
          <View style={styles.cook}>
            <PreferenceTile label="Units" value={formatUnitMode(preferences.defaultUnitMode)} onPress={() => openSheet(<UnitPickerSheet value={preferences.defaultUnitMode} onSelect={saveUnits} />)} />
            <PreferenceTile label="Serving size" value={`${preferences.defaultServingSize} ${preferences.defaultServingSize === 1 ? "person" : "people"}`} onPress={() => openSheet(<ServingSizeSheet value={preferences.defaultServingSize} onSave={saveServings} />)} />
          </View>
        </SettingsSection>

        <View style={styles.completionCard}>
          <ProfileCompletionCard answered={answered} total={PROFILE_COMPLETION_FIELD_COUNT} onPress={() => router.push("/profile-complete" as Href)} />
        </View>

        <SettingsSection title="Account">
          <SettingsCard>
            <SettingsRow icon="lock" label="Password and security" onPress={() => router.push("/password-security" as Href)} showDivider={false} />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title="App">
          <SettingsCard>
            {/* Push reminders reach phones only, so the web app leaves this out. */}
            {Platform.OS !== "web" ? (
              <SettingsRow icon="notification" label="Meal reminders" rightElement={<ToggleSwitch value={preferences.mealRemindersEnabled} onChange={() => void changeMealReminders()} />} />
            ) : null}
            <SettingsRow icon="settings" label="Haptic feedback" rightElement={<ToggleSwitch value={preferences.hapticsEnabled} onChange={preferences.toggleHaptics} />} />
            <SettingsRow icon="offline" label="Data saver" rightElement={<ToggleSwitch value={preferences.dataSaverEnabled} onChange={preferences.toggleDataSaver} />} showDivider={false} />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title="Help and legal">
          <SettingsCard>
            <SettingsRow icon="help" label="Help and support" onPress={() => router.push("/support" as Href)} />
            <SettingsRow icon="fileText" label="Terms of Service" subtitle={agreedOn} onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "terms" } })} />
            <SettingsRow icon="shieldCheck" label="Privacy Policy" subtitle={agreedOn} onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "privacy" } })} showDivider={false} />
          </SettingsCard>
        </SettingsSection>

        <SettingsPressable feedback="shrink" accessibilityRole="button" disabled={logoutMutation.isPending} onPress={() => openSheet(<SignOutSheet pending={logoutMutation.isPending} onCancel={closeSheet} onConfirm={signOut} />)} style={styles.signOut}>
          <AppText style={styles.signOutText}>Sign out</AppText>
        </SettingsPressable>

        <SettingsCard style={styles.deleteCard}>
          <SettingsRow icon="trash" label="Delete account" danger onPress={() => router.push("/delete-account")} showDivider={false} />
        </SettingsCard>
      </ScrollView>
    </View>
  );
}

// v6.9.2's .sv2-pref: one cooking preference as a tile.
function PreferenceTile({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <SettingsPressable feedback="highlight" accessibilityRole="button" onPress={onPress} style={styles.pref}>
      <View style={styles.prefText}>
        <AppText style={styles.prefLabel}>{label}</AppText>
        <AppText style={styles.prefValue}>{value}</AppText>
      </View>
      <Icon name="chevronRight" size={16} color={theme.colors.textMuted} />
    </SettingsPressable>
  );
}

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function formatUnitMode(value: string) {
  return value === "cups" ? "Nigerian Market Units" : value[0].toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  header: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, paddingHorizontal: 10, fontFamily: theme.fontFamily.display, fontSize: 18, letterSpacing: -0.18, textAlign: "center", color: theme.colors.navy },
  headerSpacer: { width: 44, height: 44 },
  scroll: { flex: 1, backgroundColor: theme.colors.page },
  content: { paddingTop: 6, paddingHorizontal: 16 },
  me: { padding: 20, borderRadius: 22, borderWidth: 0.75, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  meTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.navy },
  initials: { fontFamily: theme.fontFamily.display, fontSize: 21, lineHeight: 21, color: theme.colors.onDark },
  meText: { flex: 1, minWidth: 0 },
  name: { fontFamily: theme.fontFamily.display, fontSize: 22, lineHeight: 22 * 1.1, letterSpacing: 22 * -0.02, color: theme.colors.navy },
  email: { marginTop: 4, fontFamily: theme.fontFamily.body, fontSize: 13, lineHeight: 13 * 1.3, color: theme.colors.textMedium },
  meButtons: { flexDirection: "row", gap: 8, marginTop: 16 },
  pillButton: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 0.75, borderColor: theme.colors.lineStrong, backgroundColor: theme.colors.surface },
  pillButtonText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, lineHeight: 13, color: theme.colors.navy },
  stats: { flexDirection: "row", borderRadius: 20, borderWidth: 0.75, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, overflow: "hidden" },
  // The first activity tile is ink; it's the only one the app has so far.
  stat: { flex: 1, minHeight: 96, padding: 16, gap: 6, justifyContent: "flex-end", backgroundColor: theme.colors.navy },
  statNumber: { fontFamily: theme.fontFamily.display, fontSize: 40, lineHeight: 40, letterSpacing: 40 * -0.03, color: theme.colors.orange },
  statLabel: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, lineHeight: 12 * 1.25, color: theme.colors.onDark, opacity: 0.8 },
  cook: { flexDirection: "row", gap: 10 },
  pref: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, padding: 16, borderRadius: 20, borderWidth: 0.75, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  prefText: { flex: 1, minWidth: 0 },
  prefLabel: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, lineHeight: 12 * 1.2, color: theme.colors.textMedium },
  prefValue: { marginTop: 6, fontFamily: theme.fontFamily.display, fontSize: 18, lineHeight: 18 * 1.1, color: theme.colors.navy },
  completionCard: { marginTop: 22 },
  signOut: { marginTop: 24, minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 0.75, borderColor: theme.colors.lineStrong, backgroundColor: theme.colors.surface },
  signOutText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, lineHeight: 15, color: theme.colors.red },
  deleteCard: { marginTop: 6 },
});
