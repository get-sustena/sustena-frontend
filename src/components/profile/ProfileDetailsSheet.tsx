import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useUpdateMeMutation } from "../../hooks/api/useAuth";
import { useSettingsCommands } from "../../hooks/useSettingsCommands";
import { getApiErrorMessage } from "../../lib/api/errors";
import { isEmailAddress } from "../../lib/emailAddress";
import { useAuthStore } from "../../store/authStore";
import { useProfileAnswersStore } from "../../store/profileAnswersStore";
import { closeSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { ProfileDatePickerModal } from "./ProfileDatePickerModal";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function ProfileDetailsSheet() {
  const user = useAuthStore((state) => state.user);
  const answers = useProfileAnswersStore();
  const updateMe = useUpdateMeMutation();
  const settings = useSettingsCommands();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [month, setMonth] = useState(answers.birthdayMonth ?? 1);
  const [day, setDay] = useState(answers.birthdayDay ?? 1);
  const [picker, setPicker] = useState<"month" | "day" | null>(null);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});

  async function save() {
    const nextErrors: typeof errors = {};
    if (!fullName.trim()) nextErrors.fullName = "Enter your full name.";
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    else if (!isEmailAddress(email)) nextErrors.email = "Enter a valid email address.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await updateMe.mutateAsync({ fullName: fullName.trim(), email: email.trim() });
      await settings.saveProfileAnswers({ birthdayMonth: month, birthdayDay: day });
      showToast("Profile details updated", "success");
      closeSheet();
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  const pending = updateMe.isPending;
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Profile Details</AppText>
      <Field label="Full name" error={errors.fullName}><TextInput value={fullName} onChangeText={setFullName} style={styles.input} /></Field>
      <Field label="Email" error={errors.email}><TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} /></Field>
      <View style={styles.dobField}>
        <AppText style={styles.label}>Date of birth</AppText>
        <View style={styles.dateRow}>
          <Pressable onPress={() => setPicker("month")} style={[styles.dateInput, styles.monthInput]}><AppText style={styles.dateText}>{MONTHS[month - 1]}</AppText><Icon name="chevronDown" size={13} color="#8a9187" /></Pressable>
          <Pressable onPress={() => setPicker("day")} style={styles.dateInput}><AppText style={styles.dateText}>{day}</AppText><Icon name="chevronDown" size={13} color="#8a9187" /></Pressable>
        </View>
      </View>
      <Pressable disabled={pending} onPress={save} style={styles.save}><AppText style={styles.saveText}>Save changes</AppText></Pressable>
      <ProfileDatePickerModal visible={picker === "month"} values={MONTHS.map((label, index) => ({ value: index + 1, label }))} selected={month} onSelect={setMonth} onClose={() => setPicker(null)} />
      <ProfileDatePickerModal visible={picker === "day"} values={Array.from({ length: 31 }, (_, index) => ({ value: index + 1, label: String(index + 1) }))} selected={day} onSelect={setDay} onClose={() => setPicker(null)} />
    </View>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <View style={styles.field}><AppText style={styles.label}>{label}</AppText>{children}{error ? <AppText style={styles.error}>{error}</AppText> : null}</View>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 18 },
  title: { marginBottom: 16, fontFamily: theme.fontFamily.display, fontSize: 19, color: "#17291E" },
  field: { marginBottom: 16 },
  dobField: { marginBottom: 4 },
  label: { marginBottom: 8, fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.text },
  input: { width: "100%", paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#EEF2E7", fontFamily: theme.fontFamily.body, fontSize: 14.5, color: "#17291E" },
  error: { marginTop: 6, fontSize: 12.5, color: "#C0392E" },
  dateRow: { flexDirection: "row", gap: 10 },
  dateInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#EEF2E7", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthInput: { flex: 1.4 },
  dateText: { fontSize: 14.5, color: "#17291E" },
  save: { width: "100%", marginTop: 20, paddingVertical: 14, borderRadius: 999, backgroundColor: "#17291E", alignItems: "center" },
  saveText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: "#FBFBF7" },
});
