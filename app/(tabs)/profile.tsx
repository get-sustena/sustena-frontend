// app/(tabs)/profile.tsx

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SettingsRow } from "../../src/components/profile/SettingsRow";
import { AppText } from "../../src/components/ui/AppText";
import { Icon } from "../../src/components/ui/Icon";
import { ToggleSwitch } from "../../src/components/ui/ToggleSwitch";
import { useFavoriteRecipes } from "../../src/hooks/useFavoriteRecipes";
import { useLogoutMutation } from "../../src/hooks/api/useAuth";
import {
  usePreferencesQuery,
  useUpdatePreferencesMutation,
} from "../../src/hooks/api/usePreferences";
import { useAuthStore } from "../../src/store/authStore";
import { useProfileAnswersQuery } from "../../src/hooks/api/useProfileAnswers";
import {
  PROFILE_COMPLETION_FIELD_COUNT,
  countAnsweredProfileFields,
} from "../../src/lib/profileCompletion";
import { usePreferencesStore } from "../../src/store/preferencesStore";
import { useProfileAnswersStore } from "../../src/store/profileAnswersStore";
import { closeSheet, openSheet, showToast } from "../../src/store/uiStore";
import { theme } from "../../src/theme/theme";
import { UnitMode } from "../../src/data/recipes";

function getInitials(fullName: string | undefined) {
  if (!fullName) return "CE";

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CE";

  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";

  return (first + last).toUpperCase();
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutMutation();
  const { favoriteRecipes } = useFavoriteRecipes();
  const updatePreferencesMutation = useUpdatePreferencesMutation();
  usePreferencesQuery();
  useProfileAnswersQuery();

  const profileAnswers = useProfileAnswersStore((state) => state);
  const answeredFieldCount = countAnsweredProfileFields(profileAnswers);
  const profileCompletionPercent = Math.round(
    (answeredFieldCount / PROFILE_COMPLETION_FIELD_COUNT) * 100
  );
  const isProfileComplete =
    answeredFieldCount >= PROFILE_COMPLETION_FIELD_COUNT;

  const healthConditions = usePreferencesStore(
    (state) => state.healthConditions
  );
  const dietaryPreference = usePreferencesStore(
    (state) => state.dietaryPreference
  );
  const defaultUnitMode = usePreferencesStore((state) => state.defaultUnitMode);
  const defaultServingSize = usePreferencesStore(
    (state) => state.defaultServingSize
  );
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);
  const dataSaverEnabled = usePreferencesStore(
    (state) => state.dataSaverEnabled
  );
  const mealRemindersEnabled = usePreferencesStore(
    (state) => state.mealRemindersEnabled
  );

  const setDefaultUnitMode = usePreferencesStore(
    (state) => state.setDefaultUnitMode
  );
  const setDefaultServingSize = usePreferencesStore(
    (state) => state.setDefaultServingSize
  );
  const toggleHaptics = usePreferencesStore((state) => state.toggleHaptics);
  const toggleDataSaver = usePreferencesStore((state) => state.toggleDataSaver);
  const toggleMealReminders = usePreferencesStore(
    (state) => state.toggleMealReminders
  );
  function saveUnitMode(nextUnitMode: UnitMode) {
    updatePreferencesMutation.mutate({
      healthConditions,
      dietaryPreference,
      defaultUnitMode: nextUnitMode,
      defaultServingSize,
    });
    setDefaultUnitMode(nextUnitMode);
    closeSheet();
    showToast(
      `Default units set to ${formatUnitMode(nextUnitMode)}`,
      "success"
    );
  }

  function saveServingSize(next: number) {
    updatePreferencesMutation.mutate({
      healthConditions,
      dietaryPreference,
      defaultUnitMode,
      defaultServingSize: next,
    });
    setDefaultServingSize(next);
    closeSheet();
    showToast("Default serving size saved", "success");
  }

  function openUnitSheet() {
    openSheet(
      <UnitPickerSheet value={defaultUnitMode} onSelect={saveUnitMode} />
    );
  }

  function openServingSheet() {
    openSheet(
      <ServingSizeSheet
        value={defaultServingSize}
        onSave={saveServingSize}
      />
    );
  }

  function openProfileDetailsSheet() {
    const birthday =
      profileAnswers.birthdayMonth && profileAnswers.birthdayDay
        ? `${profileAnswers.birthdayMonth}/${profileAnswers.birthdayDay}`
        : "Not added";

    openSheet(
      <View style={styles.sheetContent}>
        <AppText style={styles.sheetTitle}>Profile Details</AppText>
        <ProfileField label="Full Name" value={user?.fullName ?? "Sustena User"} />
        <ProfileField
          label="Email"
          value={user?.email ?? "No email available"}
        />
        <ProfileField label="Date of Birth" value={birthday} />
        <Pressable
          onPress={() => {
            closeSheet();
            router.push("/profile-complete");
          }}
          style={styles.sheetPrimaryButton}
        >
          <AppText style={styles.sheetPrimaryButtonText}>Edit Details</AppText>
        </Pressable>
      </View>
    );
  }

  function openAvatarSheet() {
    openSheet(
      <View style={styles.avatarSheet}>
        <AppText style={styles.avatarSheetTitle}>
          Upload Profile Picture
        </AppText>
        <AppText style={styles.avatarSheetText}>
          Profile photo uploads are coming soon.
        </AppText>
        <View style={styles.avatarSheetPreview}>
          <AppText style={styles.avatarSheetInitials}>
            {getInitials(user?.fullName)}
          </AppText>
        </View>
        <Pressable onPress={closeSheet} style={styles.sheetPrimaryButton}>
          <AppText style={styles.sheetPrimaryButtonText}>Done</AppText>
        </Pressable>
      </View>
    );
  }

  async function handleSignOut() {
    await logoutMutation.mutateAsync();
    router.replace("/welcome");
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#244733", "#173223"]}
          style={[
            styles.hero,
            { paddingTop: Math.max(30, insets.top + 8) },
          ]}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <AppText style={styles.avatarText}>
                {getInitials(user?.fullName)}
              </AppText>
            </View>

            <Pressable
              onPress={openAvatarSheet}
              style={({ pressed }) => [
                styles.avatarEditButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit profile picture"
            >
              <Icon name="pencil" size={12} color={theme.colors.onDark} />
            </Pressable>
          </View>

          <AppText style={styles.name} numberOfLines={2}>
            {user?.fullName ?? "Sustena User"}
          </AppText>
          <View style={styles.planBadge}>
            <AppText style={styles.planBadgeText}>Free Plan</AppText>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <AppText style={styles.statValue}>0</AppText>
            <AppText style={styles.statLabel}>Recipes Tried</AppText>
          </View>

          <View style={styles.statCard}>
            <AppText style={styles.statValueGreen}>
              {favoriteRecipes.length}
            </AppText>
            <AppText style={styles.statLabel}>Saved</AppText>
          </View>

          <View style={styles.statCard}>
            <AppText style={styles.statValueGold}>0</AppText>
            <AppText style={styles.statLabel}>Orders</AppText>
          </View>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Account</AppText>
          <SettingsRow
            icon="profile"
            label="Profile Details"
            subtitle="Name, email & date of birth"
            onPress={openProfileDetailsSheet}
            showDivider={false}
          />
        </View>

        <View style={styles.section}>
          {isProfileComplete ? (
            <Pressable
              onPress={() => router.push("/profile-complete")}
              style={({ pressed }) => [
                styles.completeCardFlat,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.completeCardFlatIcon}>
                <Icon
                  name="check"
                  size={18}
                  color={theme.colors.white}
                  strokeWidth={2.6}
                />
              </View>

              <View style={styles.completeCardFlatInfo}>
                <AppText style={styles.completeCardFlatTitle}>
                  Profile complete
                </AppText>
                <AppText style={styles.completeCardFlatSubtitle}>
                  Tap to review your answers
                </AppText>
              </View>

              <Icon
                name="chevronRight"
                size={16}
                color={theme.colors.textMuted}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/profile-complete")}
              style={({ pressed }) => [
                styles.completeCardPromo,
                pressed && styles.pressed,
              ]}
            >
              <LinearGradient
                colors={["#1D3327", "#152119"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.completeCardPromoHeader}>
                <AppText style={styles.completeCardPromoTitle}>
                  Complete your profile
                </AppText>
                <Icon name="chevronRight" size={17} color="#9FB0A3" />
              </View>

              <AppText style={styles.completeCardPromoSubtitle}>
                Better suggestions with every answer.
              </AppText>

              <View style={styles.completeCardPromoTrack}>
                <View
                  style={[
                    styles.completeCardPromoFill,
                    { width: `${profileCompletionPercent}%` },
                  ]}
                />
              </View>

              <AppText style={styles.completeCardPromoLabel}>
                {answeredFieldCount} of {PROFILE_COMPLETION_FIELD_COUNT} answered
              </AppText>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Preferences</AppText>
          <SettingsRow
            icon="settings"
            label="Default Units"
            subtitle="Measurement preference"
            value={formatUnitMode(defaultUnitMode)}
            onPress={openUnitSheet}
            showChevron={false}
          />
          <SettingsRow
            icon="servings"
            label="Default Serving Size"
            subtitle="Pre-set for scaling"
            value={`${defaultServingSize} ${
              defaultServingSize === 1 ? "person" : "people"
            }`}
            onPress={openServingSheet}
            showDivider={false}
            showChevron={false}
          />
        </View>

        <View style={styles.compactSection}>
          <AppText style={styles.sectionTitle}>App Settings</AppText>
          <SettingsRow
            icon="notification"
            label="Meal Reminders"
            subtitle="Daily push notifications"
            rightElement={
              <ToggleSwitch
                value={mealRemindersEnabled}
                onChange={toggleMealReminders}
              />
            }
          />
          <SettingsRow
            icon="settings"
            label="Haptic Feedback"
            subtitle="Vibrate on interactions"
            rightElement={
              <ToggleSwitch value={hapticsEnabled} onChange={toggleHaptics} />
            }
          />
          <SettingsRow
            icon="offline"
            label="Data Saver Mode"
            subtitle="Reduces image quality on 3G"
            rightElement={
              <ToggleSwitch
                value={dataSaverEnabled}
                onChange={toggleDataSaver}
              />
            }
            showDivider={false}
          />
        </View>

        <View style={styles.compactSection}>
          <AppText style={styles.sectionTitle}>Support</AppText>
          <SettingsRow
            icon="help"
            label="Help & Support"
            subtitle="FAQs and how-to guides"
            onPress={() => router.push("/support")}
            showDivider={false}
          />
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={handleSignOut}
            disabled={logoutMutation.isPending}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.pressed,
              logoutMutation.isPending && styles.disabled,
            ]}
          >
            <AppText style={styles.signOutText}>
              {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileField}>
      <AppText style={styles.profileFieldLabel}>{label}</AppText>
      <View style={styles.profileFieldValue}>
        <AppText style={styles.profileFieldText} numberOfLines={2}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function UnitPickerSheet({
  value,
  onSelect,
}: {
  value: UnitMode;
  onSelect: (value: UnitMode) => void;
}) {
  const options: { value: UnitMode; label: string }[] = [
    { value: "metric", label: "Metric" },
    { value: "imperial", label: "Imperial" },
    { value: "cups", label: "Nigerian Market Units" },
  ];

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>Default Units</AppText>
      {options.map((option, index) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[
              styles.sheetOption,
              index === options.length - 1 && styles.sheetOptionLast,
            ]}
          >
            <AppText
              style={[
                styles.sheetOptionText,
                selected && styles.sheetOptionTextSelected,
              ]}
            >
              {option.label}
            </AppText>
            {selected ? (
              <Icon name="check" size={18} color={theme.colors.green} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function ServingSizeSheet({
  value,
  onSave,
}: {
  value: number;
  onSave: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>Default Serving Size</AppText>
      <View style={styles.servingControl}>
        <Pressable
          onPress={() => setDraft((current) => Math.max(1, current - 1))}
          style={styles.servingButton}
          accessibilityRole="button"
          accessibilityLabel="Decrease serving size"
        >
          <Icon name="minus" size={20} color={theme.colors.text} />
        </Pressable>
        <View style={styles.servingValueWrap}>
          <AppText style={styles.servingValue}>{draft}</AppText>
          <AppText style={styles.servingLabel}>
            {draft === 1 ? "person" : "people"}
          </AppText>
        </View>
        <Pressable
          onPress={() => setDraft((current) => Math.min(25, current + 1))}
          style={styles.servingButton}
          accessibilityRole="button"
          accessibilityLabel="Increase serving size"
        >
          <Icon name="plus" size={20} color={theme.colors.text} />
        </Pressable>
      </View>
      <Pressable
        onPress={() => onSave(draft)}
        style={styles.sheetPrimaryButton}
      >
        <AppText style={styles.sheetPrimaryButtonText}>Save</AppText>
      </Pressable>
    </View>
  );
}

function formatUnitMode(unitMode: string) {
  if (unitMode === "metric") return "Metric";
  if (unitMode === "cups") return "Nigerian";
  if (unitMode === "imperial") return "Imperial";

  return unitMode;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 34,
    alignItems: "center",
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: theme.colors.green,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarEditButton: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: theme.colors.onDark,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 24,
    color: theme.colors.onDark,
  },
  name: {
    fontFamily: theme.fontFamily.displaySemiBold,
    fontSize: 30,
    lineHeight: 33,
    color: theme.colors.onDark,
    textAlign: "center",
    marginBottom: 10,
    maxWidth: 320,
  },
  planBadge: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  planBadgeText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0,
    color: theme.colors.onDark,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: -22,
    zIndex: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 11,
    elevation: 3,
  },
  statValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 22,
    color: theme.colors.text,
  },
  statValueGreen: {
    fontFamily: theme.fontFamily.display,
    fontSize: 22,
    color: theme.colors.navy3,
  },
  statValueGold: {
    fontFamily: theme.fontFamily.display,
    fontSize: 22,
    color: theme.colors.goldText,
  },
  statLabel: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11,
    color: theme.colors.textMedium,
    textAlign: "center",
    marginTop: 3,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  compactSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.55,
  },
  completeCardFlat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.card2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 15,
  },
  completeCardFlatIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  completeCardFlatInfo: {
    flex: 1,
  },
  completeCardFlatTitle: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.navy,
  },
  completeCardFlatSubtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.textMedium,
    marginTop: 2,
  },
  completeCardPromo: {
    borderRadius: 18,
    padding: 18,
    paddingBottom: 16,
    overflow: "hidden",
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 13,
    elevation: 4,
  },
  completeCardPromoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  completeCardPromoTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 17,
    color: theme.colors.onDark,
  },
  completeCardPromoSubtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    color: "#9FB0A3",
    lineHeight: 18,
    marginBottom: 14,
  },
  completeCardPromoTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  completeCardPromoFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.green,
  },
  completeCardPromoLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12,
    color: "#9FB0A3",
    marginTop: 9,
    letterSpacing: 0,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  signOutButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: theme.colors.red,
  },
  sheetContent: {
    paddingBottom: 24,
  },
  sheetTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    color: theme.colors.text,
    marginBottom: 14,
  },
  profileField: {
    marginBottom: 16,
  },
  profileFieldLabel: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  profileFieldValue: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card2,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  profileFieldText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14.5,
    lineHeight: 20,
    color: theme.colors.text,
  },
  sheetPrimaryButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetPrimaryButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: theme.colors.onDark,
  },
  sheetOption: {
    minHeight: 52,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetOptionLast: {
    borderBottomWidth: 0,
  },
  sheetOptionText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 15,
    color: theme.colors.text,
  },
  sheetOptionTextSelected: {
    fontFamily: theme.fontFamily.bodyBold,
    color: theme.colors.navy,
  },
  servingControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  servingButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  servingValueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
  },
  servingValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 32,
    color: theme.colors.text,
  },
  servingLabel: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textMedium,
  },
  avatarSheet: {
    alignItems: "center",
    paddingBottom: 24,
  },
  avatarSheetTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  avatarSheetText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: theme.colors.textMedium,
    textAlign: "center",
    marginBottom: 20,
  },
  avatarSheetPreview: {
    width: 140,
    height: 140,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  avatarSheetInitials: {
    fontFamily: theme.fontFamily.display,
    fontSize: 36,
    color: theme.colors.navy,
  },
});
