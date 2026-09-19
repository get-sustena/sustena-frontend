import { Image } from "expo-image";
import { Dispatch, SetStateAction } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { RecipeEditorState } from "../../../lib/creatorRecipes/editorState";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";
import {
  EditorField,
  EditorStageIntro,
  EditorTextInput,
} from "./EditorCommon";

type Props = {
  state: RecipeEditorState;
  setState: Dispatch<SetStateAction<RecipeEditorState>>;
  coverUrl: string | null;
  uploadingCover: boolean;
  onChooseCover: () => void;
};

export function StageBasics({
  state,
  setState,
  coverUrl,
  uploadingCover,
  onChooseCover,
}: Props) {
  return (
    <>
      <EditorStageIntro eyebrow="Start" title="Start your recipe">
        Give it a name. Add a photo now or come back to it later.
      </EditorStageIntro>

      <EditorField
        label="Cover photo"
        meta="Optional"
        helper="Use a clear landscape photo of the finished dish."
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
              style={StyleSheet.absoluteFill}
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
          placeholder="Smoky party jollof rice"
        />
      </EditorField>

      <EditorField
        label="Short recipe description"
        meta="Optional"
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

    </>
  );
}

const styles = StyleSheet.create({
  cover: {
    aspectRatio: 16 / 10,
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#C7C7C7",
    backgroundColor: "#F2F2F2",
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
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(23,41,30,0.7)",
  },
  pressed: { opacity: 0.84 },
});
