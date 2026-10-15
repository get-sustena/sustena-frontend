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

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        <Section title="Account & creator profile" first>
          <SettingsRow icon="chefHat" label="Edit creator profile" subtitle="Update your public name, photo, handle and bio." onPress={() => router.push("/creator/edit-profile" as Href)} />
          <SettingsRow icon="profile" label="Profile details" subtitle="Full name, email & date of birth" onPress={() => openSheet(<ProfileDetailsSheet />)} />
          <ConfirmEmailRow />
          <View style={styles.completionCard}>
            <ProfileCompletionCard answered={answered} total={PROFILE_COMPLETION_FIELD_COUNT} onPress={() => router.push("/profile-complete" as Href)} />
          </View>
          <SettingsRow icon="lock" label="Password and security" subtitle="Keep your account secure." onPress={() => router.push("/password-security" as Href)} />
          <SettingsRow icon="trash" iconColor={theme.colors.red} label="Delete account" labelColor={theme.colors.red} subtitle="Remove your account and your data" onPress={() => router.push("/delete-account")} showDivider={false} />
        </Section>

        <Section title="Your activity">
          <SettingsRow icon="bookmark" label="Saved" value={String(favoriteRecipes.length)} onPress={() => router.push("/saved-recipes" as Href)} showDivider={false} showChevron={false} />
        </Section>

        <Section title="Cooking preferences">
          <SettingsRow icon="settings" label="Default Units" subtitle="Measurement preference" value={formatUnitMode(preferences.defaultUnitMode)} onPress={() => openSheet(<UnitPickerSheet value={preferences.defaultUnitMode} onSelect={saveUnits} />)} showChevron={false} />
          <SettingsRow icon="servings" label="Default Serving Size" subtitle="Pre-set for scaling" value={`${preferences.defaultServingSize} ${preferences.defaultServingSize === 1 ? "person" : "people"}`} onPress={() => openSheet(<ServingSizeSheet value={preferences.defaultServingSize} onSave={saveServings} />)} showDivider={false} showChevron={false} />
        </Section>

        <Section title="App Settings" compact>
          {/* Push reminders reach phones only, so the web app leaves this out. */}
          {Platform.OS !== "web" ? (
            <SettingsRow icon="notification" label="Meal Reminders" subtitle="Breakfast, lunch and dinner ideas at 8am, 1pm and 5pm" rightElement={<ToggleSwitch value={preferences.mealRemindersEnabled} onChange={() => void changeMealReminders()} />} />
          ) : null}
          <SettingsRow icon="settings" label="Haptic Feedback" subtitle="Vibrate on interactions" rightElement={<ToggleSwitch value={preferences.hapticsEnabled} onChange={preferences.toggleHaptics} />} />
          <SettingsRow icon="offline" label="Data Saver Mode" subtitle="Reduces image quality on 3G" rightElement={<ToggleSwitch value={preferences.dataSaverEnabled} onChange={preferences.toggleDataSaver} />} showDivider={false} />
        </Section>

        <Section title="Support" compact>
          <SettingsRow icon="help" label="Help & Support" subtitle="FAQs and how-to guides" onPress={() => router.push("/support" as Href)} showDivider={false} />
        </Section>

        <Section title="Legal" compact>
          <SettingsRow icon="fileText" label="Terms of Service" subtitle={agreedOn} onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "terms" } })} />
          <SettingsRow icon="shieldCheck" label="Privacy Policy" subtitle={agreedOn} onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "privacy" } })} showDivider={false} />
        </Section>

        <Pressable disabled={logoutMutation.isPending} onPress={() => openSheet(<SignOutSheet pending={logoutMutation.isPending} onCancel={closeSheet} onConfirm={signOut} />)} style={styles.signOut}>
          <AppText style={styles.signOutText}>Sign Out</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, first = false, compact = false }: { title: string; children: React.ReactNode; first?: boolean; compact?: boolean }) {
  return <View style={[styles.section, first && styles.firstSection, compact && styles.compactSection]}><AppText style={styles.sectionTitle}>{title}</AppText>{children}</View>;
}

function formatUnitMode(value: string) {
  return value === "cups" ? "Nigerian Market Units" : value[0].toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, paddingHorizontal: 10, fontFamily: theme.fontFamily.display, fontSize: 18, letterSpacing: -0.18, textAlign: "center", color: "#17291E" },
  headerSpacer: { width: 44, height: 44 },
  content: {},
  section: { paddingHorizontal: 20, paddingTop: 20 },
  firstSection: { paddingTop: 6 },
  compactSection: { paddingTop: 14 },
  sectionTitle: { marginBottom: 8, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: "#8a9187" },
  completionCard: { marginVertical: 14 },
  signOut: { marginHorizontal: 20, marginTop: 20, paddingVertical: 14, borderRadius: 999, borderWidth: 0.75, borderColor: theme.colors.border, backgroundColor: "transparent", alignItems: "center" },
  signOutText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: "#C0392E" },
});
