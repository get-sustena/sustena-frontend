// app/support.tsx
// Static How-To + FAQ screen. No backend needed.

import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../src/components/ui/AppText";
import { Icon, IconName } from "../src/components/ui/Icon";
import { Screen } from "../src/components/ui/Screen";
import { theme } from "../src/theme/theme";

const HOW_TO_CARDS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "budget",
    title: "Plan on a budget",
    body: "Open the Plan tab, enter what you have to spend, and Sustena builds a full meal plan that fits.",
  },
  {
    icon: "pantry",
    title: "Cook from your kitchen",
    body: "Use the Kitchen tab in Plan to select what you already have — we'll match it against recipes for you.",
  },
  {
    icon: "shop",
    title: "Build a shopping list",
    body: "Add ingredients straight from any recipe, or create your own list from the Shop tab.",
  },
];

const FAQS: { question: string; answer: string }[] = [
  {
    question: "Does Sustena work offline?",
    answer:
      "Yes. Recipes, your shopping list, and favorites are all stored on your device and sync automatically once you're back online.",
  },
  {
    question: "How do I change my dietary preferences?",
    answer:
      "Go to Profile → Preferences → Dietary Style. Your recipe suggestions update immediately.",
  },
  {
    question: "Can I scale a recipe for more people?",
    answer:
      "Yes — every recipe has a Serving Size control that scales ingredient amounts and estimated cost together.",
  },
  {
    question: "What is GoLemon?",
    answer:
      "GoLemon is our upcoming grocery checkout partner. Ordering directly from your shopping list is coming soon.",
  },
  {
    question: "Is my Complete Profile data shared anywhere?",
    answer:
      "No — those answers are stored only on this device for now, to personalize suggestions. They aren't sent to our servers yet.",
  },
];

export default function SupportScreen() {
  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Icon name="chevronLeft" size={19} color={theme.colors.text} />
        </Pressable>

        <AppText style={styles.headerTitle}>Help & FAQ</AppText>
        <View style={styles.backButton} />
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>How To</AppText>

        <View style={styles.howToGrid}>
          {HOW_TO_CARDS.map((card) => (
            <View key={card.title} style={styles.howToCard}>
              <View style={styles.howToIconWrap}>
                <Icon name={card.icon} size={20} color={theme.colors.primary} />
              </View>
              <AppText style={styles.howToTitle}>{card.title}</AppText>
              <AppText style={styles.howToBody}>{card.body}</AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>Frequently Asked Questions</AppText>

        <View style={styles.faqCard}>
          {FAQS.map((faq) => (
            <FaqRow key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.faqRow}>
      <Pressable
        onPress={() => setIsOpen((current) => !current)}
        style={styles.faqQuestionRow}
      >
        <AppText style={styles.faqQuestion}>{question}</AppText>
        <Icon
          name={isOpen ? "minus" : "plus"}
          size={16}
          color={theme.colors.textMuted}
        />
      </Pressable>

      {isOpen ? <AppText style={styles.faqAnswer}>{answer}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: theme.fontFamily.displaySemiBold,
    fontSize: 16,
    color: theme.colors.navy,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  howToGrid: {
    gap: theme.spacing.md,
  },
  howToCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  howToIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  howToTitle: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.navy,
    marginBottom: 4,
  },
  howToBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  faqCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  faqRow: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  faqQuestionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.text,
  },
  faqAnswer: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
});
