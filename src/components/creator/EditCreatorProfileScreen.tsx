import { Image } from "expo-image";
import { Href, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthoringVocabularyQuery } from "../../hooks/api/useCreatorRecipes";
import { useCreatorHandleAvailabilityQuery, useMyCreatorProfileQuery, useUpsertCreatorProfileMutation } from "../../hooks/api/useCreators";
import { getApiErrorMessage } from "../../lib/api/errors";
import { suggestedCreatorHandle } from "../../lib/creators/profileDefaults";
import { pickAndUploadImage } from "../../lib/media/uploadImage";
import { useAuthStore } from "../../store/authStore";
import { useCreatorProfileEditStore } from "../../store/creatorProfileEditStore";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { DiscardProfileChangesSheet } from "./DiscardProfileChangesSheet";
import { ProfilePhotoSheet } from "./ProfilePhotoSheet";

type SelectedAvatar = { url: string | null; assetId: string | null | undefined };

export function EditCreatorProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const profileQuery = useMyCreatorProfileQuery();
  const vocabularyQuery = useAuthoringVocabularyQuery();
  const saveMutation = useUpsertCreatorProfileMutation();
  const initialized = useRef(false);
  const initialSpecialities = useRef<string[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const specialities = useCreatorProfileEditStore((state) => state.specialities);
  const hydrateEditStore = useCreatorProfileEditStore((state) => state.hydrate);
  const setPreview = useCreatorProfileEditStore((state) => state.setPreview);
  const [avatar, setAvatar] = useState<SelectedAvatar>({ url: null, assetId: undefined });
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [debouncedHandle, setDebouncedHandle] = useState("");

  useEffect(() => {
    if (initialized.current || profileQuery.isLoading) return;
    const profile = profileQuery.data;
    const fallbackName = user?.fullName?.trim() || "";
    initialized.current = true;
    setDisplayName(profile?.displayName ?? fallbackName);
    setHandle(profile?.handle ?? suggestedCreatorHandle(fallbackName, user?.email));
    setBio(profile?.bio ?? "");
    const nextSpecialities = profile?.specialities ?? [];
    const nextAvatarUrl = profile?.avatarUrl ?? null;
    initialSpecialities.current = nextSpecialities;
    hydrateEditStore({
      displayName: profile?.displayName ?? fallbackName,
      handle: profile?.handle ?? suggestedCreatorHandle(fallbackName, user?.email),
      bio: profile?.bio ?? "",
      avatarUrl: nextAvatarUrl,
      specialities: nextSpecialities,
    });
    setAvatar({ url: nextAvatarUrl, assetId: undefined });
  }, [hydrateEditStore, profileQuery.data, profileQuery.isLoading, user?.email, user?.fullName]);

  useEffect(() => {
    if (!initialized.current) return;
    if (specialities.join("\u0000") !== initialSpecialities.current.join("\u0000")) setDirty(true);
  }, [specialities]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHandle(handle), 500);
    return () => clearTimeout(timer);
  }, [handle]);

  const handleError = validateHandle(handle);
  const unchangedHandle = handle === profileQuery.data?.handle;
  const availabilityQuery = useCreatorHandleAvailabilityQuery(debouncedHandle, !handleError && !unchangedHandle && debouncedHandle === handle);
  const handleAvailable = unchangedHandle || availabilityQuery.data?.available === true;
  const cuisineOptions = useMemo(() => vocabularyQuery.data?.cuisines ?? [], [vocabularyQuery.data?.cuisines]);
  const canSave = Boolean(displayName.trim() && bio.length <= 160 && !handleError && handleAvailable && !saveMutation.isPending && !uploading);

  function updateName(value: string) { setDisplayName(value); setDirty(true); }
  function updateHandle(value: string) { setHandle(value.replace(/^@/, "").toLowerCase()); setDirty(true); }
  function updateBio(value: string) { setBio(value); setDirty(true); }

  async function choosePhoto(source: "library" | "camera") {
    closeSheet();
    try {
      setUploading(true);
      const image = await pickAndUploadImage("creator_avatar", [1, 1], source);
      if (image) {
        setAvatar({ url: image.localUri, assetId: image.assetId });
        setDirty(true);
      }
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    } finally {
      setUploading(false);
    }
  }

  function openPhotoMenu() {
    openSheet(<ProfilePhotoSheet onTakePhoto={() => choosePhoto("camera")} onChoosePhoto={() => choosePhoto("library")} onRemovePhoto={() => { setAvatar({ url: null, assetId: null }); setDirty(true); closeSheet(); }} />);
  }

  function openSpecialities() {
    router.push("/creator/specialities" as Href);
  }

  function previewProfile() {
    setPreview({ displayName, handle, bio, avatarUrl: avatar.url });
    router.push("/creator/profile-preview" as Href);
  }

  function discard() {
    if (!dirty) {
      router.back();
      return;
    }
    openSheet(<DiscardProfileChangesSheet onKeepEditing={closeSheet} onDiscard={() => { closeSheet(); router.back(); }} />);
  }

  async function save() {
    setAttemptedSave(true);
    if (!canSave) return;
    try {
      await saveMutation.mutateAsync({ displayName: displayName.trim(), handle, bio: bio.trim() || null, avatarAssetId: avatar.assetId, specialities });
      setDirty(false);
      showToast("Profile updated", "success");
      router.back();
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  if (profileQuery.isLoading) return <View style={styles.screen} />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Go back" onPress={discard} style={styles.headerButton}><Icon name="chevronLeft" size={19} /></Pressable>
        <AppText style={styles.headerTitle}>Edit profile</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {avatar.url ? <Image source={{ uri: avatar.url }} contentFit="cover" style={StyleSheet.absoluteFill} /> : <AppText style={styles.initials}>{initials(displayName)}</AppText>}
            {uploading ? <View style={styles.uploading}><ActivityIndicator color="#FBFBF7" /></View> : null}
          </View>
          <Pressable disabled={uploading} onPress={openPhotoMenu}><AppText style={styles.photoAction}>Profile photo</AppText></Pressable>
        </View>

        <View style={styles.field}>
          <AppText style={styles.label}>Display name</AppText>
          <TextInput value={displayName} onChangeText={updateName} style={styles.input} />
          <AppText style={styles.helper}>Use the public name people will recognise you by.</AppText>
          {attemptedSave && !displayName.trim() ? <AppText style={styles.error}>Enter your display name.</AppText> : null}
        </View>

        <View style={styles.handleField}>
          <AppText style={styles.label}>Handle</AppText>
          <View style={styles.handleInputWrap}>
            <AppText style={styles.at}>@</AppText>
            <TextInput autoCapitalize="none" autoCorrect={false} value={handle} onChangeText={updateHandle} style={styles.handleInput} />
          </View>
          <AppText style={styles.helper}>Use 3–30 letters, numbers, underscores or full stops. Handles are not case-sensitive.</AppText>
          <HandleStatus handle={handle} localError={handleError} unchanged={unchangedHandle} checking={availabilityQuery.isFetching || (debouncedHandle !== handle && !handleError)} available={handleAvailable} reason={availabilityQuery.data?.reason} />
        </View>

        <View style={styles.bioField}>
          <AppText style={styles.label}>Bio</AppText>
          <TextInput value={bio} onChangeText={updateBio} multiline maxLength={220} textAlignVertical="top" style={styles.bioInput} />
          <View style={styles.bioHelperRow}>
            <AppText style={styles.bioHelper}>Tell people what you cook in 160 characters or fewer.</AppText>
            <AppText style={styles.bioCount}>{bio.length}/160</AppText>
          </View>
          {bio.length > 160 ? <AppText style={styles.error}>Keep your bio to 160 characters or fewer.</AppText> : null}
        </View>

        <View style={styles.specialitiesField}>
          <Pressable onPress={openSpecialities}>
            <View style={[styles.specialitiesHeading, specialities.length > 0 && styles.specialitiesHeadingSelected]}>
              <AppText style={styles.specialitiesLabel}>Choose specialities</AppText>
              <Icon name="chevronRight" size={16} color="#8a9187" />
            </View>
            {specialities.length ? <View style={styles.chips}>{specialities.map((value) => <AppText key={value} style={styles.chip}>{cuisineOptions.find((item) => item.id === value)?.label ?? value}</AppText>)}</View> : null}
          </Pressable>
          <AppText style={styles.specialitiesHelper}>Choose up to 3 Cuisine / Tribe leaf values.</AppText>
        </View>

        <Pressable onPress={previewProfile} style={styles.preview}><AppText style={styles.previewText}>Preview public profile</AppText></Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable onPress={discard} style={styles.discardButton}><AppText style={styles.discardText}>Discard changes</AppText></Pressable>
        <Pressable disabled={saveMutation.isPending || uploading} onPress={save} style={styles.saveButton}><AppText style={styles.saveText}>Save changes</AppText></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function HandleStatus({ handle, localError, unchanged, checking, available, reason }: { handle: string; localError: string | null; unchanged: boolean; checking: boolean; available: boolean; reason?: "available" | "taken" | "reserved" | "invalid" }) {
  let message = localError;
  let tone = styles.error;
  if (!message && checking && !unchanged) { message = "Checking availability…"; tone = styles.handleChecking; }
  else if (!message && available) { message = `@${handle} is available`; tone = styles.handleAvailable; }
  else if (!message && reason === "taken") message = "That handle is already taken. Try another one.";
  else if (!message && reason === "reserved") message = "That handle is already taken. Try another one.";
  else if (!message && reason === "invalid") message = "Use only letters, numbers, underscores or full stops.";
  return message ? <AppText style={tone}>{message}</AppText> : null;
}

function validateHandle(value: string) {
  if (!value) return "Enter a handle.";
  if (value.length < 3) return "Use at least 3 characters for your handle.";
  if (value.length > 30) return "Keep your handle to 30 characters or fewer.";
  if (!/^[a-z0-9][a-z0-9_.]*$/.test(value) || /\.\.|\.$/.test(value)) return "Use only letters, numbers, underscores or full stops.";
  return null;
}

function initials(value: string) { return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "S"; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  headerButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#FBFBF7", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, paddingHorizontal: 10, fontFamily: theme.fontFamily.display, fontSize: 18, letterSpacing: -0.18, textAlign: "center", color: "#17291E" },
  headerSpacer: { width: 44, height: 44 },
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  avatarSection: { alignItems: "center", paddingTop: 20, paddingBottom: 10 },
  avatar: { width: 88, height: 88, marginBottom: 10, borderRadius: 44, overflow: "hidden", backgroundColor: "#17291E", alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 28, color: "#FBFBF7" },
  uploading: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(23,41,30,0.55)", alignItems: "center", justifyContent: "center" },
  photoAction: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: "#1f7048" },
  field: { marginBottom: 18 },
  handleField: { marginBottom: 4 },
  bioField: { marginTop: 14, marginBottom: 18 },
  label: { marginBottom: 6, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: "#1B211C" },
  input: { width: "100%", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF", fontFamily: theme.fontFamily.body, fontSize: 14.5, color: "#1B211C" },
  helper: { marginTop: 6, fontSize: 12, lineHeight: 16.8, color: "#8a9187" },
  error: { marginTop: 6, fontSize: 12.5, color: "#C0392E" },
  handleChecking: { marginTop: 6, fontSize: 12.5, color: "#8a9187" },
  handleAvailable: { marginTop: 6, fontSize: 12.5, color: "#1f7048" },
  handleInputWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF" },
  at: { fontSize: 14.5, color: "#8a9187" },
  handleInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 14, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: "#1B211C" },
  bioInput: { width: "100%", minHeight: 84, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF", fontFamily: theme.fontFamily.body, fontSize: 14.5, color: "#1B211C" },
  bioHelperRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 6 },
  bioHelper: { flex: 1, fontSize: 12, color: "#8a9187" },
  bioCount: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.textMuted },
  specialitiesField: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E1E1E1" },
  specialitiesHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  specialitiesHeadingSelected: { marginBottom: 8 },
  specialitiesLabel: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: "#1B211C" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#EEF2E7", fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, color: "#1f7048" },
  specialitiesHelper: { marginTop: 6, fontSize: 12, lineHeight: 16.2, color: "#8a9187" },
  preview: { paddingVertical: 10, alignItems: "center" },
  previewText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13.5, color: "#1f7048" },
  footer: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E1E1E1" },
  discardButton: { flex: 1, paddingVertical: 14, borderRadius: 999, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF", alignItems: "center" },
  discardText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: "#1B211C" },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 999, backgroundColor: "#17291E", alignItems: "center" },
  saveText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14.5, color: "#FBFBF7" },
});
