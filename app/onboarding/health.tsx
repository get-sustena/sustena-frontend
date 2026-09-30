
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
  const hasCompletedOnboarding = usePreferencesStore(
    (state) => state.hasCompletedOnboarding
  );

  function handleNext() {
    if (hasCompletedOnboarding) {
      router.back();
      return;
    }

    router.push("/onboarding/preferences");
  }

  return (
    <OnboardingLayout
      stepLabel="Step 1 of 2"
      title="Any health conditions?"
      subtitle="We’ll tailor your meal suggestions to keep you feeling your best."
      heroIcon="ncd"
      activeStep={1}
      footer={
        <View style={styles.actions}>
          <Button title="Skip" variant="ghost" onPress={handleNext} />
          <Button
            title="Continue"
            style={styles.primaryButton}
            onPress={handleNext}
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
