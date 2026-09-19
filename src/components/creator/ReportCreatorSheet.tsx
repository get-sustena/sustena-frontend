import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useReportCreatorMutation } from "../../hooks/api/useCreators";
import { getApiErrorMessage } from "../../lib/api/errors";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import type { CreatorReportRequest } from "../../types/api";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

const REASONS: { label: string; value: CreatorReportRequest["reason"] }[] = [
  { label: "Spam", value: "spam" },
  { label: "Misleading content", value: "misleading" },
  { label: "Inappropriate content", value: "inappropriate" },
  { label: "Something else", value: "other" },
];

export function ReportCreatorSheet({ creatorId }: { creatorId: string }) {
  const [reason, setReason] = useState<CreatorReportRequest["reason"] | null>(null);
  const [notes, setNotes] = useState("");
  const mutation = useReportCreatorMutation(creatorId);

  async function submit() {
    if (!reason) return;
    try {
      await mutation.mutateAsync({ reason, notes: notes.trim() || null });
      closeSheet();
      setTimeout(() => openSheet(<ReportSubmittedSheet />), 300);
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Report this profile?</AppText>
      {REASONS.map((option) => {
        const selected = reason === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => setReason(option.value)}
            style={styles.reason}
          >
            <View
              style={[styles.radio, selected && styles.radioSelected]}
            />
            <AppText style={styles.reasonText}>{option.label}</AppText>
          </Pressable>
        );
      })}
      <TextInput value={notes} onChangeText={setNotes} multiline placeholder="Tell us more (optional)" placeholderTextColor="#8a9187" style={styles.notes} />
      <View style={styles.actions}>
        <Pressable onPress={closeSheet} style={styles.cancel}><AppText style={styles.cancelText}>Cancel</AppText></Pressable>
        <Pressable disabled={!reason || mutation.isPending} onPress={submit} style={[styles.submit, !reason && styles.submitDisabled]}><AppText style={styles.submitText}>Submit report</AppText></Pressable>
      </View>
    </View>
  );
}

function ReportSubmittedSheet() {
  return (
    <View style={styles.success}>
      <View style={styles.successIcon}><Icon name="check" size={24} color="#1f7048" strokeWidth={3} /></View>
      <AppText style={styles.successTitle}>Report submitted</AppText>
      <AppText style={styles.successCopy}>Thanks. We’ll review this profile.</AppText>
      <Pressable onPress={closeSheet} style={styles.done}><AppText style={styles.doneText}>Done</AppText></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 18 },
  title: { marginBottom: 14, fontFamily: theme.fontFamily.display, fontSize: 18, color: "#17291E" },
  reason: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#E1E1E1" },
  radioSelected: { borderColor: "#17291E", backgroundColor: "#17291E" },
  reasonText: { fontSize: 14, color: "#17291E" },
  notes: { width: "100%", minHeight: 70, marginTop: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF", fontFamily: theme.fontFamily.body, fontSize: 13.5, color: "#17291E", textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancel: { flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF", alignItems: "center" },
  cancelText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: "#17291E" },
  submit: { flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: "#17291E", alignItems: "center" },
  submitDisabled: { backgroundColor: "#8a9187", opacity: 0.6 },
  submitText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: "#FBFBF7" },
  success: { alignItems: "center", paddingTop: 8, paddingBottom: 18 },
  successIcon: { width: 56, height: 56, marginBottom: 14, borderRadius: 28, backgroundColor: "#EEF2E7", alignItems: "center", justifyContent: "center" },
  successTitle: { marginBottom: 6, fontFamily: theme.fontFamily.display, fontSize: 18, color: "#17291E" },
  successCopy: { marginBottom: 18, fontSize: 14, color: "#5C6459" },
  done: { width: "100%", paddingVertical: 13, borderRadius: 999, backgroundColor: "#17291E", alignItems: "center" },
  doneText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: "#FBFBF7" },
});
