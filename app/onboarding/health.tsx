// app/onboarding/health.tsx

import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { Button } from "../../src/components/ui/Button";
import { PreferenceChip } from "../../src/components/ui/PreferenceChip";
import { HEALTH_CONDITION_OPTIONS } from "../../src/data/preferenceOptions";
import { usePreferencesStore } from "../../src/store/preferencesStore";
import { theme } from "../../src/theme/theme";

export default function HealthOnboardingScreen() {
  const healthConditions = usePreferencesStore(
    (state) => state.healthConditions
  );
  const toggleHealthCondition = usePreferencesStore(
    (state) => state.toggleHealthCondition
  );
  const completeOnboarding = usePreferencesStore(
    (state) => state.completeOnboarding
  );

  function handleSkip() {
    completeOnboarding();
    router.replace("/(tabs)/home");
  }

  return (
    <OnboardingLayout
      stepLabel="Step 1 of 2"
      title="Any health conditions?"
      subtitle="We’ll tailor your meal suggestions to keep you feeling your best."
      heroEmoji="🏥"
      heroIcon="💊"
      activeStep={1}
      footer={
        <View style={styles.actions}>
          <Button title="Skip" variant="ghost" onPress={handleSkip} />
          <Button
            title="Continue →"
            style={styles.primaryButton}
            onPress={() => router.push("/onboarding/preferences")}
          />
        </View>
      }
    >
      <View style={styles.chipGrid}>
        {HEALTH_CONDITION_OPTIONS.map((option) => (
          <PreferenceChip
            key={option.value}
            label={option.label}
            selected={healthConditions.includes(option.value)}
            onPress={() => toggleHealthCondition(option.value)}
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
