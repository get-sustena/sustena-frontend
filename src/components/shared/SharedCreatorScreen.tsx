import type { Href } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { socialCopy } from "../../lib/socialCopy";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { SavedPhoto } from "../ui/SavedPhoto";
import { SharedLinkActions } from "./SharedLinkActions";

type Props = {
  link: Href;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
};

// A shared creator profile opened signed out (PRD v6.9 section 20, C5): the
// photo, name and handle, which is all the public card has.
export function SharedCreatorScreen({ link, displayName, handle, avatarUrl }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.band}>
        <View style={styles.avatar} role="img" aria-label="Creator photo">
          {avatarUrl ? (
            <SavedPhoto url={avatarUrl} contentFit="cover" style={StyleSheet.absoluteFill} />
          ) : (
            <AppText style={styles.initials}>{initials(displayName)}</AppText>
          )}
        </View>
      </View>
      <View style={[styles.body, { paddingBottom: insets.bottom + 28 }]}>
        <AppText style={styles.label}>{socialCopy.sharedWithYou}</AppText>
        <AppText role="heading" style={styles.name}>{displayName}</AppText>
        <AppText style={styles.handle}>@{handle}</AppText>
        <AppText style={styles.copy}>{socialCopy.sharedCreatorBody(displayName)}</AppText>
        <View style={styles.spacer} />
        <SharedLinkActions link={link} signUpLabel={socialCopy.sharedCreatorSignUp} />
      </View>
    </ScrollView>
  );
}

function initials(value: string) { return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: { flexGrow: 1 },
  band: {
    height: 230,
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: theme.colors.cream2,
  },
  avatar: {
    width: 112,
    height: 112,
    marginBottom: -40,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 1,
  },
  initials: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 36,
    lineHeight: 36,
    color: theme.colors.onDark,
  },
  body: { flex: 1, alignItems: "center", paddingTop: 58, paddingHorizontal: 20 },
  label: {
    marginBottom: 8,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12.5,
    color: theme.colors.textMedium,
  },
  name: {
    fontFamily: theme.fontFamily.displayExtraBold,
    fontSize: 30,
    lineHeight: 30 * 1.05,
    letterSpacing: 30 * -0.03,
    textAlign: "center",
    color: theme.colors.navy,
  },
  handle: { marginTop: 6, fontSize: 14, color: theme.colors.textMedium },
  copy: {
    maxWidth: 300,
    marginTop: 16,
    fontSize: 15,
    lineHeight: 15 * 1.5,
    textAlign: "center",
    color: theme.colors.text,
  },
  spacer: { flex: 1, minHeight: 28 },
});
