import type { Href } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { socialCopy } from "../../lib/socialCopy";
import { theme } from "../../theme/theme";
import { RecipePhoto } from "../recipe/RecipePhoto";
import { AppText } from "../ui/AppText";
import { SharedLinkActions } from "./SharedLinkActions";

type Props = {
  link: Href;
  name: string;
  imageUrl: string | null;
};

// A shared recipe opened signed out (PRD v6.9 section 20, C4): its name and
// photo only, since recipes stay private outside the app.
export function SharedRecipeScreen({ link, name, imageUrl }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <RecipePhoto imageUrl={imageUrl} style={styles.photo} />
      <View style={[styles.body, { paddingBottom: insets.bottom + 28 }]}>
        <AppText style={styles.label}>{socialCopy.sharedWithYou}</AppText>
        <AppText role="heading" style={styles.name}>{name}</AppText>
        <AppText style={styles.copy}>{socialCopy.sharedRecipeBody}</AppText>
        <View style={styles.spacer} />
        <SharedLinkActions link={link} signUpLabel={socialCopy.sharedRecipeSignUp} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: { flexGrow: 1 },
  photo: { height: 300 },
  body: { flex: 1, paddingTop: 22, paddingHorizontal: 20 },
  label: {
    marginBottom: 8,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12.5,
    color: theme.colors.textMedium,
  },
  name: {
    fontFamily: theme.fontFamily.displayExtraBold,
    fontSize: 32,
    lineHeight: 32 * 1.05,
    letterSpacing: 32 * -0.035,
    color: theme.colors.navy,
  },
  copy: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 15 * 1.5,
    color: theme.colors.text,
  },
  spacer: { flex: 1, minHeight: 28 },
});
