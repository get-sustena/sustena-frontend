// app/support.tsx

import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../src/components/ui/AppText";
import { Icon } from "../src/components/ui/Icon";
import { theme } from "../src/theme/theme";

const HOW_TO = [
  {
    question: "Generate a budget meal plan",
    answer:
      'Go to the Planner tab, set the total budget for the complete plan, and tap "Generate My Plan". Tap the plan summary card first if you want to change the number of days or which meals are included.',
  },
  {
    question: "Swap a meal in your plan",
    answer:
      "On any generated meal plan, tap the swap icon next to a meal to trade it with any other meal, from any day or meal category.",
  },
  {
    question: "Add a recipe's ingredients to your shopping list",
    answer:
      'Open any recipe and tap "Add to Shopping List" to create a new list with everything you need.',
  },
  {
    question: "Add items to a shopping list yourself",
    answer:
      'Open a shopping list and tap the + button in the header, or the "Add ingredients" button, to search or type in items.',
  },
  {
    question: "Find recipes from ingredients you already have",
    answer:
      "On the Recipes tab, use \"Match My Kitchen\": select what you have and we'll suggest recipes that use it.",
  },
  {
    question: "Share a shopping list",
    answer:
      'Open a list, tap the menu button, then "Share Shopping List" to generate an image you can save or send.',
  },
];

const FAQS = [
  {
    question: "Is Sustena free to use?",
    answer: "It is free to use for now, during the MVP stage.",
  },
  {
    question: "How does Sustena pick recipes for me?",
    answer:
      "Recommendations use your saved preferences (goals, serving size, and budget) to prioritize recipes that fit.",
  },
  {
    question: "Can I change my default units or serving size?",
    answer:
      "Yes, under Profile › Preferences you can set your default measurement system and serving size at any time.",
  },
  {
    question: "What happens to my shopping list once I check items off?",
    answer:
      'Checked items stay on the list with a strikethrough so you can track progress. Use "Clear Checked Items" in the list menu to remove them.',
  },
  {
    question: "Can I have more than one shopping list?",
    answer:
      "Yes, create as many as you like from the Shopping tab, and rename or delete them anytime.",
  },
  {
    question: "How do I update my date of birth?",
    answer:
      "Go to Profile › Profile Details and edit it directly. Changes save immediately.",
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(52, insets.top + 5) },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="chevronLeft" size={19} color={theme.colors.text} />
        </Pressable>

        <AppText style={styles.headerTitle}>Help & Support</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AppText style={styles.sectionTitle}>How To</AppText>
        {HOW_TO.map((item) => (
          <FaqRow
            key={item.question}
            question={item.question}
            answer={item.answer}
          />
        ))}

        <AppText style={[styles.sectionTitle, styles.faqTitle]}>
          Frequently Asked Questions
        </AppText>
        {FAQS.map((item) => (
          <FaqRow
            key={item.question}
            question={item.question}
            answer={item.answer}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Animated.View layout={LinearTransition} style={styles.faqRow}>
      <Pressable
        onPress={() => setIsOpen((current) => !current)}
        style={({ pressed }) => [
          styles.faqQuestionRow,
          pressed && styles.pressed,
        ]}
      >
        <AppText style={styles.faqQuestion}>{question}</AppText>
        <View
          style={[
            styles.faqChevron,
            isOpen && styles.faqChevronOpen,
          ]}
        >
          <Icon
            name="chevronDown"
            size={16}
            color={theme.colors.textMuted}
          />
        </View>
      </Pressable>

      {isOpen ? (
        <Animated.View entering={FadeInDown.duration(180)}>
          <AppText style={styles.faqAnswer}>{answer}</AppText>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.cream,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.85,
  },
  headerTitle: {
    flex: 1,
    paddingHorizontal: 10,
    textAlign: "center",
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    color: theme.colors.navy,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 120,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  faqTitle: {
    marginTop: 22,
  },
  faqRow: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  faqQuestionRow: {
    minHeight: 54,
    paddingHorizontal: 2,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14.5,
    lineHeight: 20,
    color: theme.colors.text,
  },
  faqChevron: {
    transform: [{ rotate: "0deg" }],
  },
  faqChevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
  faqAnswer: {
    paddingHorizontal: 2,
    paddingBottom: 16,
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    lineHeight: 22,
    color: theme.colors.textMedium,
  },
});
