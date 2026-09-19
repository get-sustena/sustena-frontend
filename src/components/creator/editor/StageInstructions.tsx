import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { createLocalId } from "../../../lib/id";
import {
  describeTimer,
  RecipeEditorState,
  syncInstructionTimers,
} from "../../../lib/creatorRecipes/editorState";
import { openSheet } from "../../../store/uiStore";
import { theme } from "../../../theme/theme";
import { RecipeInstructionInput, RecipeTimerInput } from "../../../types/api";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";
import {
  EditorField,
  EditorStageIntro,
  EditorTextInput,
  moveArrayItem,
} from "./EditorCommon";
import { RecipeEditorActionSheet } from "./RecipeEditorActionSheet";
import { RecipeStepGuidanceButton } from "./RecipeStepGuidanceButton";
import { RecipeStepGuidanceField } from "./RecipeStepGuidanceField";
import { RecipeTimerDurationSheet } from "./RecipeTimerDurationSheet";

type Props = {
  state: RecipeEditorState;
  setState: Dispatch<SetStateAction<RecipeEditorState>>;
};

export function StageInstructions({ state, setState }: Props) {
  useEffect(() => {
    if (state.instructions.length) return;
    setState((current) => ({
      ...current,
      instructions: [newInstruction(1)],
    }));
  }, [setState, state.instructions.length]);

  function addStep() {
    setState((current) => ({
      ...current,
      instructions: [
        ...current.instructions,
        newInstruction(current.instructions.length + 1),
      ],
    }));
  }

  function updateStep(clientId: string, next: RecipeInstructionInput) {
    setState((current) => ({
      ...current,
      instructions: current.instructions.map((instruction) =>
        instruction.clientId === clientId ? next : instruction
      ),
    }));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setState((current) => ({
      ...current,
      instructions: moveArrayItem(current.instructions, index, direction).map(
        (instruction, stepIndex) => ({
          ...instruction,
          stepNumber: stepIndex + 1,
        })
      ),
    }));
  }

  function duplicateStep(index: number) {
    setState((current) => {
      const source = current.instructions[index];
      const next = [...current.instructions];
      next.splice(index + 1, 0, {
        ...source,
        clientId: createLocalId("step"),
        timers: (source.timers ?? []).map((timer) => ({ ...timer })),
      });
      return {
        ...current,
        instructions: next.map((instruction, stepIndex) => ({
          ...instruction,
          stepNumber: stepIndex + 1,
        })),
      };
    });
  }

  function deleteStep(index: number) {
    setState((current) => ({
      ...current,
      instructions: current.instructions
        .filter((_, stepIndex) => stepIndex !== index)
        .map((instruction, stepIndex) => ({
          ...instruction,
          stepNumber: stepIndex + 1,
        })),
    }));
  }

  return (
    <>
      <EditorStageIntro eyebrow="Method" title="Write the method">
        Use one clear action per step. Add a timer, warning or tip only where it helps.
      </EditorStageIntro>

      {state.instructions.length ? (
        state.instructions.map((instruction, index) => (
          <InstructionCard
            key={instruction.clientId ?? index}
            instruction={instruction}
            index={index}
            canMoveUp={index > 0}
            canMoveDown={index < state.instructions.length - 1}
            isLast={index === state.instructions.length - 1}
            onUpdate={(next) =>
              updateStep(instruction.clientId ?? "", next)
            }
            onMove={(direction) => moveStep(index, direction)}
            onDuplicate={() => duplicateStep(index)}
            onDelete={() => deleteStep(index)}
          />
        ))
      ) : null}

      <Pressable onPress={addStep} style={styles.addStepButton}>
        <Icon name="plus" size={15} color={theme.colors.navy3} />
        <AppText style={styles.addStepText}>Add cooking step</AppText>
      </Pressable>
    </>
  );
}

function InstructionCard({
  instruction,
  index,
  canMoveUp,
  canMoveDown,
  isLast,
  onUpdate,
  onMove,
  onDuplicate,
  onDelete,
}: {
  instruction: RecipeInstructionInput;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isLast: boolean;
  onUpdate: (instruction: RecipeInstructionInput) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [showMistake, setShowMistake] = useState(Boolean(instruction.commonMistake));
  const [showTip, setShowTip] = useState(Boolean(instruction.helpfulTip));
  const timers = instruction.timers ?? [];

  function openStepMenu() {
    openSheet(
      <RecipeEditorActionSheet
        actions={[
          { label: "Duplicate step", onPress: onDuplicate },
          { label: "Move up", disabled: !canMoveUp, onPress: () => onMove(-1) },
          { label: "Move down", disabled: !canMoveDown, onPress: () => onMove(1) },
          { label: "Delete step", danger: true, onPress: onDelete },
        ]}
      />
    );
  }

  function updateTimer(timerIndex: number, patch: Partial<RecipeTimerInput>) {
    onUpdate({
      ...instruction,
      timers: timers.map((timer, indexValue) =>
        indexValue === timerIndex ? { ...timer, ...patch } : timer
      ),
    });
  }

  function removeTimer(timerIndex: number) {
    onUpdate({
      ...instruction,
      timers: timers
        .filter((_, indexValue) => indexValue !== timerIndex)
        .map((timer, position) => ({ ...timer, position })),
    });
  }

  return (
    <View style={styles.stepItem}>
      <View style={styles.rail}>
        <View style={styles.numberCircle}><AppText style={styles.numberText}>{index + 1}</AppText></View>
        {!isLast ? <View style={styles.railLine} /> : null}
      </View>
      <View style={styles.stepContent}>
      <View style={styles.header}>
        <AppText style={styles.stepLabel}>Step {index + 1}</AppText>
        <Pressable
          accessibilityLabel={`More options for step ${index + 1}`}
          onPress={openStepMenu}
          style={styles.moreButton}
        >
          <Icon name="moreH" size={17} color={theme.colors.text} />
        </Pressable>
      </View>

      <EditorField label="What happens">
        <EditorTextInput
          value={instruction.stepName ?? ""}
          onChangeText={(stepName) => onUpdate({ ...instruction, stepName })}
          maxLength={200}
          placeholder="Parboil the rice"
        />
      </EditorField>

      <EditorField
        label="Instructions"
      >
        <EditorTextInput
          value={instruction.text}
          onChangeText={(text) =>
            onUpdate(syncInstructionTimers(instruction, text))
          }
          maxLength={10_000}
          multiline
          placeholder="Describe this action clearly enough for a first-time cook."
          style={styles.instructionInput}
        />
      </EditorField>

      {timers.length ? (
        <View style={styles.timerList}>
          <AppText style={styles.timerHeading}>Timers</AppText>
          {timers.map((timer, timerIndex) => (
            <View key={`${timer.sourceText ?? "manual"}-${timerIndex}`} style={styles.timerCard}>
              <View style={styles.timerIcon}>
                <Icon name="timer" size={16} color={theme.colors.navy3} />
              </View>
              <View style={styles.timerCopy}>
                <AppText style={styles.timerTitle}>{describeTimer(timer)}</AppText>
                <AppText style={styles.timerMeta}>
                  {timer.sourceText
                    ? `Detected from “${timer.sourceText}”`
                    : "Manually added timer"}
                </AppText>
              </View>
              {timer.resolutionStatus === "detected" ? (
                <View style={styles.timerActions}>
                  <Pressable
                    onPress={() =>
                      updateTimer(timerIndex, { resolutionStatus: "confirmed" })
                    }
                    style={[styles.timerAction, styles.timerConfirm]}
                  >
                    <AppText style={styles.timerConfirmText}>Use</AppText>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      updateTimer(timerIndex, { resolutionStatus: "ignored" })
                    }
                    style={styles.timerAction}
                  >
                    <AppText style={styles.timerIgnoreText}>Ignore</AppText>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityLabel="Remove timer"
                  onPress={() => removeTimer(timerIndex)}
                  style={styles.removeTimer}
                >
                  <Icon name="close" size={14} color={theme.colors.textMuted} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() =>
          openManualTimerSheet((timer) =>
            onUpdate({
              ...instruction,
              timers: [...timers, { ...timer, position: timers.length }],
            })
          )
        }
        style={styles.addTimerButton}
      >
        <Icon name="timer" size={14} color={theme.colors.navy3} />
        <AppText style={styles.addTimerText}>Add timer</AppText>
      </Pressable>

      {!showMistake && !showTip ? (
        <View style={styles.guidanceButtons}>
          <RecipeStepGuidanceButton
            kind="mistake"
            onPress={() => setShowMistake(true)}
          />
          <RecipeStepGuidanceButton
            kind="tip"
            onPress={() => setShowTip(true)}
          />
        </View>
      ) : (
        <View style={styles.guidanceFields}>
          {showMistake ? (
            <RecipeStepGuidanceField
              kind="mistake"
              value={instruction.commonMistake ?? ""}
              onChange={(commonMistake) =>
                onUpdate({ ...instruction, commonMistake })
              }
              onClose={() => setShowMistake(false)}
            />
          ) : (
            <RecipeStepGuidanceButton
              kind="mistake"
              onPress={() => setShowMistake(true)}
              full
            />
          )}
          {showTip ? (
            <RecipeStepGuidanceField
              kind="tip"
              value={instruction.helpfulTip ?? ""}
              onChange={(helpfulTip) =>
                onUpdate({ ...instruction, helpfulTip })
              }
              onClose={() => setShowTip(false)}
            />
          ) : (
            <RecipeStepGuidanceButton
              kind="tip"
              onPress={() => setShowTip(true)}
              full
            />
          )}
        </View>
      )}

      {!instruction.text.trim() ? (
        <AppText style={styles.stepError}>
          A recipe needs at least one cooking step.
        </AppText>
      ) : null}
      </View>
    </View>
  );
}

function openManualTimerSheet(onAdd: (timer: RecipeTimerInput) => void) {
  openSheet(<RecipeTimerDurationSheet onSave={onAdd} />);
}

function newInstruction(stepNumber: number): RecipeInstructionInput {
  return {
    clientId: createLocalId("step"),
    stepNumber,
    stepName: "",
    text: "",
    commonMistake: null,
    helpfulTip: null,
    timers: [],
  };
}

const styles = StyleSheet.create({
  stepItem: { position: "relative", paddingBottom: 28, flexDirection: "row", gap: 11 },
  rail: { width: 34, alignItems: "center" },
  numberCircle: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#17291E", zIndex: 1 },
  numberText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12, color: theme.colors.onDark },
  railLine: { position: "absolute", top: 36, bottom: -28, width: 1, backgroundColor: "#D7D7D7" },
  stepContent: { flex: 1, minWidth: 0, paddingBottom: 4 },
  header: { height: 34, marginBottom: 10, flexDirection: "row", alignItems: "center" },
  stepLabel: { flex: 1, fontFamily: theme.fontFamily.display, fontSize: 16, color: theme.colors.text },
  moreButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  instructionInput: { minHeight: 88 },
  timerList: { gap: 8 },
  timerHeading: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5 },
  timerCard: { padding: 10, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 11, backgroundColor: theme.colors.surface2 },
  timerIcon: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: theme.colors.white },
  timerCopy: { flex: 1 },
  timerTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12 },
  timerMeta: { marginTop: 2, fontSize: 9.5, color: theme.colors.textMuted },
  timerActions: { gap: 5 },
  timerAction: { minWidth: 48, paddingHorizontal: 7, paddingVertical: 5, alignItems: "center", borderRadius: 7, borderWidth: 1, borderColor: theme.colors.border },
  timerConfirm: { borderColor: theme.colors.navy, backgroundColor: theme.colors.navy },
  timerConfirmText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 9.5, color: theme.colors.white },
  timerIgnoreText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 9.5, color: theme.colors.textMedium },
  removeTimer: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  addTimerButton: { alignSelf: "flex-start", paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 6 },
  addTimerText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, color: theme.colors.navy3 },
  guidanceButtons: { marginTop: 10, flexDirection: "row", gap: 8 },
  guidanceFields: { marginTop: 2, gap: 10 },
  stepError: { marginTop: -5, fontSize: 10.5, color: theme.colors.textMuted },
  addStepButton: { minHeight: 44, marginBottom: 8, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  addStepText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, color: theme.colors.navy3 },
});
