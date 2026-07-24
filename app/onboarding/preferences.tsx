// app/onboarding/preferences.tsx

import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { Button } from "../../src/components/ui/Button";
import { PreferenceChip } from "../../src/components/ui/PreferenceChip";
import { DIETARY_PREFERENCE_OPTIONS } from "../../src/data/preferenceOptions";
import { usePreferencesStore } from "../../src/store/preferencesStore";
import { theme } from "../../src/theme/theme";

export default function DietaryPreferencesOnboardingScreen() {
  const dietaryPreference = usePreferencesStore(
    (state) => state.dietaryPreference
  );
  const setDietaryPreference = usePreferencesStore(
    (state) => state.setDietaryPreference
  );
  const completeOnboarding = usePreferencesStore(
    (state) => state.completeOnboarding
  );
  const hasCompletedOnboarding = usePreferencesStore(
    (state) => state.hasCompletedOnboarding
  );

  function handleFinish() {
    // Editing from Profile after onboarding is already done: just return there.
    if (hasCompletedOnboarding) {
      router.back();
      return;
    }

    completeOnboarding();
    router.replace("/(tabs)/home");
  }

  return (
    <OnboardingLayout
      stepLabel="Step 2 of 2"
      title="Your food style?"
      subtitle="Tell us how you eat and we’ll find the perfect Nigerian and continental recipes for you."
      heroIcon="vegetarian"
      activeStep={2}
      footer={
        <View style={styles.actions}>
          <Button
            title="Back"
            variant="ghost"
            onPress={() => router.back()}
          />
          <Button
            title="Get Started"
            style={styles.primaryButton}
            onPress={handleFinish}
          />
        </View>
      }
    >
      <View style={styles.chipGrid}>
        {DIETARY_PREFERENCE_OPTIONS.map((option) => (
          <PreferenceChip
            key={option.value}
            label={option.label}
            selected={dietaryPreference === option.value}
            onPress={() => setDietaryPreference(option.value)}
          />
        ))}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  primaryButton: {
    flex: 1,
  },
});
