import { use, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { LearnStep } from "../../lib/learnMode/learnSteps";
import { formatTimerLength, type StartedTimers } from "../../lib/learnMode/learnTimers";
import { theme } from "../../theme/theme";
import { IngredientImage } from "../ingredient/IngredientImage";
import { AppText } from "../ui/AppText";
import { Icon, type IconName } from "../ui/Icon";
import { learnColors } from "./learnColors";
import { ReadyLayoutContext } from "./LearnPage";
import { PopIn } from "./PopIn";
import { StepTimers, type TimerActions } from "./StepTimers";

type Props = {
  index: number;
  step: LearnStep;
  nextStepName: string | null;
  started: StartedTimers;
  now: number;
  openNotes: ReadonlySet<string>;
  speaking: boolean;
  canSpeak: boolean;
  ready: boolean;
  timerActions: TimerActions;
  onToggleNote: (key: string) => void;
  onSpeak: () => void;
  onNext: () => void;
};

// One step's card (v6.8 lmCardBody). A part with no data doesn't show.
export function LearnStepCard({
  index,
  step,
  nextStepName,
  started,
  now,
  openNotes,
  speaking,
  canSpeak,
  ready,
  timerActions,
  onToggleNote,
  onSpeak,
  onNext,
}: Props) {
  const onReadyLayout = use(ReadyLayoutContext);
  const tipKey = `tip-${index}`;
  const mistakeKey = `mistake-${index}`;
  const isLastStep = nextStepName === null;

  return (
    <>
      <View style={styles.head}>
        <AppText style={styles.eyebrow}>{`Step ${index + 1}`}</AppText>
        <View style={styles.icons}>
          {step.tip ? (
            <NoteIcon
              icon="bulb"
              label="Tip"
              open={openNotes.has(tipKey)}
              tone="tip"
              onPress={() => onToggleNote(tipKey)}
            />
          ) : null}
          {step.mistake ? (
            <NoteIcon
              icon="alertTriangle"
              label="Common mistake"
              open={openNotes.has(mistakeKey)}
              tone="mistake"
              onPress={() => onToggleNote(mistakeKey)}
            />
          ) : null}
          {canSpeak ? (
            <Pressable
              onPress={onSpeak}
              style={({ pressed }) => [
                styles.icon,
                speaking && styles.speakOn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Read this step aloud"
              accessibilityState={{ selected: speaking }}
            >
              <Icon
                name="volume"
                size={22}
                strokeWidth={2}
                color={speaking ? theme.colors.onDark : theme.colors.navy}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <AppText style={styles.name} accessibilityRole="header">
        {step.name}
      </AppText>
      <StepText step={step} onStartTimer={(timer) => timerActions.start(index, timer)} />

      {step.tip && openNotes.has(tipKey) ? (
        <PopIn style={[styles.note, styles.tip]}>
          <AppText style={[styles.noteTitle, styles.tipTitle]}>Tip</AppText>
          <AppText style={styles.noteText}>{step.tip}</AppText>
        </PopIn>
      ) : null}
      {step.mistake && openNotes.has(mistakeKey) ? (
        <PopIn style={[styles.note, styles.mistake]}>
          <AppText style={[styles.noteTitle, styles.mistakeTitle]}>Common mistake</AppText>
          <AppText style={styles.noteText}>{step.mistake}</AppText>
        </PopIn>
      ) : null}

      <StepTimers step={index} timers={step.timers} started={started} now={now} actions={timerActions} />

      {ready ? (
        <View
          onLayout={(event: LayoutChangeEvent) =>
            onReadyLayout(event.nativeEvent.layout.y + event.nativeEvent.layout.height)
          }
        >
          <PopIn style={styles.ready}>
            <View style={styles.readyTitleRow}>
              <Icon name="check" size={20} strokeWidth={2.25} color={theme.colors.onDark} />
              <AppText style={styles.readyTitle}>
                {isLastStep ? "Timer done" : "Time for the next step"}
              </AppText>
            </View>
            <AppText style={styles.readyText}>
              {isLastStep ? "That was the last step." : `Step ${index + 2}: ${nextStepName}`}
            </AppText>
            <Pressable
              onPress={onNext}
              style={({ pressed }) => [styles.readyButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <AppText style={styles.readyButtonText}>{isLastStep ? "Finish" : "Next step"}</AppText>
            </Pressable>
          </PopIn>
        </View>
      ) : null}

      {step.ingredients.length ? (
        <View style={styles.ingredients}>
          <AppText style={styles.ingredientsTitle}>Ingredients in this step</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ingredientRow}
          >
            {step.ingredients.map((ingredient) => (
              <View key={ingredient.id} style={styles.ingredient}>
                <IngredientImage
                  ingredientId={ingredient.ingredientId}
                  name={ingredient.name}
                  size={46}
                  style={styles.ingredientImage}
                />
                <AppText style={styles.ingredientName}>
                  {ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1)}
                </AppText>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}

// The step text with each timer's time highlighted; tapping a time starts
// its timer.
function StepText({ step, onStartTimer }: { step: LearnStep; onStartTimer: (timer: number) => void }) {
  const marks = step.timers
    .flatMap((timer, index) => timer.ranges.map((range) => ({ ...range, index, timer })))
    .sort((left, right) => left.start - right.start);

  const parts: ReactNode[] = [];
  let at = 0;
  for (const mark of marks) {
    if (mark.start < at) continue;
    parts.push(step.text.slice(at, mark.start));
    parts.push(
      <AppText
        key={mark.start}
        style={styles.time}
        onPress={() => onStartTimer(mark.index)}
        accessibilityRole="button"
        accessibilityLabel={`Start ${formatTimerLength(mark.timer.minSeconds, mark.timer.maxSeconds)} timer`}
      >
        {step.text.slice(mark.start, mark.end)}
      </AppText>
    );
    at = mark.end;
  }
  parts.push(step.text.slice(at));

  return <AppText style={styles.text}>{parts}</AppText>;
}

// The tip and common mistake icons. A filled colour means the note is open.
function NoteIcon({
  icon,
  label,
  open,
  tone,
  onPress,
}: {
  icon: IconName;
  label: string;
  open: boolean;
  tone: "tip" | "mistake";
  onPress: () => void;
}) {
  const color =
    tone === "tip"
      ? open
        ? theme.colors.white
        : theme.colors.navy3
      : open
        ? theme.colors.navy
        : learnColors.amberInk;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.icon,
        tone === "tip" ? (open ? styles.tipOpen : styles.tipIcon) : open ? styles.mistakeOpen : styles.mistakeIcon,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open }}
    >
      <Icon name={icon} size={20} strokeWidth={2} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    marginTop: 2,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    lineHeight: 19.5,
    color: theme.colors.navy3,
  },
  icons: {
    flexDirection: "row",
    gap: 8,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: learnColors.panel,
  },
  tipIcon: {
    backgroundColor: learnColors.greenSoft,
  },
  tipOpen: {
    backgroundColor: theme.colors.navy3,
  },
  mistakeIcon: {
    backgroundColor: learnColors.amberSoft,
  },
  mistakeOpen: {
    backgroundColor: learnColors.amber,
  },
  speakOn: {
    backgroundColor: theme.colors.navy3,
  },
  name: {
    marginTop: 4,
    fontFamily: theme.fontFamily.display,
    fontSize: 30,
    lineHeight: 32.4,
    letterSpacing: -0.75,
    color: theme.colors.navy,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24.8,
    color: theme.colors.navy,
  },
  // v6.8 .lm-time is Inter 650; 600 is the nearest weight the app loads.
  time: {
    fontFamily: theme.fontFamily.bodySemiBold,
    color: theme.colors.navy3,
    backgroundColor: learnColors.greenSoft,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  note: {
    marginTop: 16,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderRadius: 18,
  },
  tip: {
    backgroundColor: learnColors.greenSoft,
  },
  mistake: {
    backgroundColor: learnColors.amberSoft,
  },
  noteTitle: {
    marginBottom: 3,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 16,
    lineHeight: 19.2,
  },
  tipTitle: {
    color: theme.colors.navy3,
  },
  mistakeTitle: {
    color: learnColors.amberInk,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20.3,
    color: theme.colors.navy,
  },
  ready: {
    marginTop: 16,
    padding: 16,
    gap: 10,
    borderRadius: 18,
    backgroundColor: theme.colors.navy3,
  },
  readyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  readyTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    lineHeight: 21.6,
    color: theme.colors.onDark,
  },
  readyText: {
    fontSize: 14,
    lineHeight: 19.6,
    color: theme.colors.onDark,
  },
  readyButton: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.onDark,
  },
  readyButtonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.navy3,
  },
  ingredients: {
    marginTop: 18,
    marginHorizontal: -8,
    paddingVertical: 12,
    paddingLeft: 12,
    borderRadius: 20,
    backgroundColor: learnColors.panel,
  },
  ingredientsTitle: {
    marginBottom: 10,
    marginLeft: 2,
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 18.2,
    color: theme.colors.textMedium,
  },
  ingredientRow: {
    gap: 6,
    paddingRight: 12,
  },
  ingredient: {
    width: 58,
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: 3,
    paddingBottom: 10,
    borderRadius: 14,
    backgroundColor: learnColors.card,
  },
  ingredientImage: {
    borderRadius: 23,
    backgroundColor: theme.colors.white,
  },
  ingredientName: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 15,
    textAlign: "center",
    color: theme.colors.navy,
  },
  pressed: {
    opacity: 0.85,
  },
});
