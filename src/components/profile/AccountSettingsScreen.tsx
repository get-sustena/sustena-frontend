import { Href, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLogoutMutation } from "../../hooks/api/useAuth";
import { usePreferencesQuery, useUpdatePreferencesMutation } from "../../hooks/api/usePreferences";
import { useProfileAnswersQuery } from "../../hooks/api/useProfileAnswers";
import { useFavoriteRecipes } from "../../hooks/useFavoriteRecipes";
import { markWelcomeSeen } from "../../db/appMetadataRepository";
import { countAnsweredProfileFields, PROFILE_COMPLETION_FIELD_COUNT } from "../../lib/profileCompletion";
import { usePreferencesStore } from "../../store/preferencesStore";
import { useProfileAnswersStore } from "../../store/profileAnswersStore";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import type { UnitMode } from "../../data/recipes";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { OrdersSheet } from "./OrdersSheet";
import { ProfileCompletionCard } from "./ProfileCompletionCard";
import { ProfileDetailsSheet } from "./ProfileDetailsSheet";
import { RecipesTriedSheet } from "./ProfileActivitySheet";
import { ServingSizeSheet } from "./ServingSizeSheet";
import { SettingsRow } from "./SettingsRow";
import { SignOutSheet } from "./SignOutSheet";
import { UnitPickerSheet } from "./UnitPickerSheet";

export function AccountSettingsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const logoutMutation = useLogoutMutation();
  const updatePreferences = useUpdatePreferencesMutation();
  const preferences = usePreferencesStore();
  const answers = useProfileAnswersStore();
  const { favoriteRecipes } = useFavoriteRecipes();
  const answered = countAnsweredProfileFields(answers);
  usePreferencesQuery();
  useProfileAnswersQuery();

  function saveUnits(value: UnitMode) {
    preferences.setDefaultUnitMode(value);
    updatePreferences.mutate({
      healthConditions: preferences.healthConditions,
      dietaryPreference: preferences.dietaryPreference,
      defaultUnitMode: value,
      defaultServingSize: preferences.defaultServingSize,
    });
    closeSheet();
    showToast("Default units saved", "success");
  }

  function saveServings(value: number) {
    preferences.setDefaultServingSize(value);
    updatePreferences.mutate({
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
          <SettingsRow icon="profile" label="Profile Details" subtitle="Full name, email & date of birth" onPress={() => openSheet(<ProfileDetailsSheet />)} />
          <View style={styles.completionCard}>
            <ProfileCompletionCard answered={answered} total={PROFILE_COMPLETION_FIELD_COUNT} onPress={() => router.push("/profile-complete" as Href)} />
          </View>
          <SettingsRow icon="lock" label="Password and security" subtitle="Keep your account secure." onPress={() => router.push("/password-security" as Href)} showDivider={false} />
        </Section>

        <Section title="Your activity">
          <SettingsRow icon="chart" label="Recipes Tried" value="47" valueColor="#1B211C" onPress={() => openSheet(<RecipesTriedSheet />)} showChevron={false} />
          <SettingsRow icon="bookmark" label="Saved" value={String(favoriteRecipes.length)} onPress={() => router.push("/saved-recipes" as Href)} showChevron={false} />
          <SettingsRow icon="shop" label="Orders" value="8" valueColor="#8a5f13" onPress={() => openSheet(<OrdersSheet />)} showDivider={false} showChevron={false} />
        </Section>

        <Section title="Cooking preferences">
          <SettingsRow icon="settings" label="Default Units" subtitle="Measurement preference" value={formatUnitMode(preferences.defaultUnitMode)} onPress={() => openSheet(<UnitPickerSheet value={preferences.defaultUnitMode} onSelect={saveUnits} />)} showChevron={false} />
          <SettingsRow icon="servings" label="Default Serving Size" subtitle="Pre-set for scaling" value={`${preferences.defaultServingSize} ${preferences.defaultServingSize === 1 ? "person" : "people"}`} onPress={() => openSheet(<ServingSizeSheet value={preferences.defaultServingSize} onSave={saveServings} />)} showDivider={false} showChevron={false} />
        </Section>

        <Section title="Sustena Plus">
          <SettingsRow icon="star" iconBackground="#FBF0D8" iconColor="#C68A2E" label="Sustena Plus" subtitle="You are on the Free plan" onPress={() => router.push("/subscription" as Href)} showDivider={false} />
        </Section>

        <Section title="App Settings" compact>
          <SettingsRow icon="notification" label="Meal Reminders" subtitle="Daily push notifications" rightElement={<ToggleSwitch value={preferences.mealRemindersEnabled} onChange={preferences.toggleMealReminders} />} />
          <SettingsRow icon="settings" label="Haptic Feedback" subtitle="Vibrate on interactions" rightElement={<ToggleSwitch value={preferences.hapticsEnabled} onChange={preferences.toggleHaptics} />} />
          <SettingsRow icon="offline" label="Data Saver Mode" subtitle="Reduces image quality on 3G" rightElement={<ToggleSwitch value={preferences.dataSaverEnabled} onChange={preferences.toggleDataSaver} />} showDivider={false} />
        </Section>

        <Section title="Support" compact>
          <SettingsRow icon="help" label="Help & Support" subtitle="FAQs and how-to guides" onPress={() => router.push("/support" as Href)} showDivider={false} />
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
  headerButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#D8E3CA", backgroundColor: "#FBFBF7", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, paddingHorizontal: 10, fontFamily: theme.fontFamily.display, fontSize: 18, letterSpacing: -0.18, textAlign: "center", color: "#17291E" },
  headerSpacer: { width: 44, height: 44 },
  content: {},
  section: { paddingHorizontal: 20, paddingTop: 20 },
  firstSection: { paddingTop: 6 },
  compactSection: { paddingTop: 14 },
  sectionTitle: { marginBottom: 6, fontFamily: theme.fontFamily.monoBold, fontSize: 12, letterSpacing: 1.44, textTransform: "uppercase", color: "#8a9187" },
  completionCard: { marginVertical: 14 },
  signOut: { marginHorizontal: 20, marginTop: 20, paddingVertical: 14, borderRadius: 999, borderWidth: 1.5, borderColor: "#D8E3CA", backgroundColor: "transparent", alignItems: "center" },
  signOutText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: "#C0392E" },
});
