import { Image } from "expo-image";
import { Dispatch, SetStateAction } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import {
  getClassificationValues,
  RecipeEditorState,
  setClassificationValues,
} from "../../../lib/creatorRecipes/editorState";
import { theme } from "../../../theme/theme";
import { RecipeAuthoringVocabulary } from "../../../types/api";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";
import {
  EditorField,
  EditorGroupCard,
  EditorGroupLabel,
  EditorTextInput,
  formatVocabularyValues,
  openVocabularyPicker,
  SelectionField,
  StageRequirementNote,
} from "./EditorCommon";

type Props = {
  state: RecipeEditorState;
  setState: Dispatch<SetStateAction<RecipeEditorState>>;
  vocabulary: RecipeAuthoringVocabulary;
  coverUrl: string | null;
  uploadingCover: boolean;
  onChooseCover: () => void;
};

export function StageBasics({
  state,
  setState,
  vocabulary,
  coverUrl,
  uploadingCover,
  onChooseCover,
}: Props) {
  const categories = getClassificationValues(state, "category");
  const bases = getClassificationValues(state, "main_ingredient_base");
  const cuisines = getClassificationValues(state, "cuisine");

  return (
    <>
      <StageRequirementNote />

      <EditorField
        label="Cover photo"
        helper="Recommended · Use a clear landscape photo of the finished dish."
      >
        <Pressable
          disabled={uploadingCover}
          onPress={onChooseCover}
          style={({ pressed }) => [styles.cover, pressed && styles.pressed]}
        >
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              contentFit="cover"
              style={StyleSheet.absoluteFillObject}
            />
          ) : (
            <View style={styles.coverFallback}>
              <Icon
                name="image"
                size={28}
                color={theme.colors.textMedium}
                strokeWidth={1.2}
              />
              <AppText style={styles.coverTitle}>Add cover photo</AppText>
            </View>
          )}
          {uploadingCover ? (
            <View style={styles.uploading}>
              <ActivityIndicator color={theme.colors.white} />
            </View>
          ) : null}
        </Pressable>
      </EditorField>

      <EditorField label="Recipe name" required helper="80 characters maximum">
        <EditorTextInput
          value={state.name}
          onChangeText={(name) => setState((current) => ({ ...current, name }))}
          maxLength={80}
          placeholder="e.g. Smoky party jollof rice"
        />
      </EditorField>

      <EditorField
        label="Short recipe description"
        required
        helper="Describe the taste and when someone might enjoy it."
        count={`${state.description?.length ?? 0}/240`}
      >
        <EditorTextInput
          value={state.description ?? ""}
          onChangeText={(description) =>
            setState((current) => ({ ...current, description }))
          }
          maxLength={240}
          multiline
          placeholder="e.g. A smoky, richly spiced rice dish that’s perfect for parties and weekend meals."
        />
      </EditorField>

      <EditorGroupLabel>Classification</EditorGroupLabel>
      <EditorGroupCard>
        <SelectionField
          label="Categories"
          required
          values={formatVocabularyValues(categories, vocabulary.categories)}
          placeholder="Choose categories"
          helper="e.g. Soup, Rice dish, Snack. Pick every category that fits."
          onPress={() =>
            openVocabularyPicker({
              title: "Choose recipe categories",
              options: vocabulary.categories,
              selected: categories,
              onDone: (values) =>
                setState((current) =>
                  setClassificationValues(current, "category", values)
                ),
            })
          }
        />

        <SelectionField
          label="Main ingredient bases"
          values={formatVocabularyValues(bases, vocabulary.mainIngredientBases)}
          placeholder="Choose ingredient bases"
          helper="The core ingredients this dish is built around. You’ll add exact quantities later, in Ingredients."
          onPress={() =>
            openVocabularyPicker({
              title: "Choose main ingredient bases",
              options: vocabulary.mainIngredientBases,
              selected: bases,
              showGroups: false,
              onDone: (values) =>
                setState((current) =>
                  setClassificationValues(
                    current,
                    "main_ingredient_base",
                    values
                  )
                ),
            })
          }
        />

        <SelectionField
          label="Cuisine or tribe"
          required
          values={formatVocabularyValues(cuisines, vocabulary.cuisines)}
          placeholder="Choose cuisines"
          helper="The cuisines or ethnic traditions this recipe belongs to."
          onPress={() =>
            openVocabularyPicker({
              title: "Choose cuisine or tribe",
              options: vocabulary.cuisines,
              selected: cuisines,
              groupSeparator: " > ",
              onDone: (values) =>
                setState((current) =>
                  setClassificationValues(current, "cuisine", values)
                ),
            })
          }
        />
      </EditorGroupCard>
    </>
  );
}

const styles = StyleSheet.create({
  cover: {
    aspectRatio: 16 / 9,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.25)",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  coverFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  coverTitle: {
    maxWidth: "90%",
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.textMedium,
  },
  coverBrowse: {
    fontSize: 11,
    color: theme.colors.textMedium,
    textDecorationLine: "underline",
  },
  uploading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(23,41,30,0.7)",
  },
  pressed: { opacity: 0.84 },
});
