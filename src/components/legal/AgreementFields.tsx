import { router } from "expo-router";
import { useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { getLagosDay } from "../../lib/lagosDay";
import { isTeen, MINIMUM_AGE, readDateOfBirth, type AgreementForm, type DateOfBirthBoxes } from "../../lib/legal/agreement";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { LegalCheckRow } from "./LegalCheckRow";

type Props = {
  form: AgreementForm;
  onChange: (form: AgreementForm) => void;
  // The sign-up screen's error from the last tap, cleared as the person
  // changes something.
  error: string | null;
  // Sign-up also asks about marketing emails; the agreement screen doesn't.
  marketing?: { value: boolean; onChange: (value: boolean) => void };
};

const BOXES: { key: keyof DateOfBirthBoxes; placeholder: string; label: string; length: number; flex: number; autoComplete: "birthdate-day" | "birthdate-month" | "birthdate-year" }[] = [
  { key: "d", placeholder: "DD", label: "Day of birth", length: 2, flex: 1, autoComplete: "birthdate-day" },
  { key: "m", placeholder: "MM", label: "Month of birth", length: 2, flex: 1, autoComplete: "birthdate-month" },
  { key: "y", placeholder: "YYYY", label: "Year of birth", length: 4, flex: 1.5, autoComplete: "birthdate-year" },
];

// v6.9's date of birth (day, month and year boxes) and its ticks. The parent
// or guardian tick shows as soon as the date makes the person 13 to 17.
export function AgreementFields({ form, onChange, error, marketing }: Props) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const today = getLagosDay();
  const teen = isTeen(form.dob, today);
  // After a tap on the button, the boxes go red while the date is what stops it.
  const read = readDateOfBirth(form.dob, today);
  const dobError = Boolean(error) && (read.state !== "ok" || read.age < MINIMUM_AGE);

  function setBox(index: number, text: string) {
    const box = BOXES[index];
    const value = text.replace(/\D/g, "").slice(0, box.length);
    const dob = { ...form.dob, [box.key]: value };
    onChange({ ...form, dob, parent: isTeen(dob, today) && form.parent });
    if (value.length === box.length && index < BOXES.length - 1) inputs.current[index + 1]?.focus();
  }

  return (
    <View>
      <AppText style={styles.label} nativeID="dob-label">Date of birth</AppText>
      <View style={styles.dob} accessibilityLabelledBy="dob-label">
        {BOXES.map((box, index) => (
          <View key={box.key} style={[styles.box, { flex: box.flex }, dobError && styles.boxError]}>
            <TextInput
              ref={(input) => {
                inputs.current[index] = input;
              }}
              value={form.dob[box.key]}
              onChangeText={(text) => setBox(index, text)}
              placeholder={box.placeholder}
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={box.length}
              autoComplete={box.autoComplete}
              accessibilityLabel={box.label}
              style={styles.input}
            />
          </View>
        ))}
      </View>
      <AppText style={styles.hint}>You need to be 13 or older to use Sustena.</AppText>

      {teen ? (
        <LegalCheckRow checked={form.parent} onToggle={() => onChange({ ...form, parent: !form.parent })}>
          My parent or guardian agrees to me using Sustena.
        </LegalCheckRow>
      ) : null}
      <LegalCheckRow checked={form.terms} onToggle={() => onChange({ ...form, terms: !form.terms })}>
        I agree to the <DocumentLink doc="terms" name="Terms of Service" /> and I’ve read the <DocumentLink doc="privacy" name="Privacy Policy" />.
      </LegalCheckRow>
      {marketing ? (
        <LegalCheckRow checked={marketing.value} onToggle={() => marketing.onChange(!marketing.value)}>
          Email me news, offers and tips (optional).
        </LegalCheckRow>
      ) : null}
      {error ? (
        <AppText accessibilityRole="alert" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function DocumentLink({ doc, name }: { doc: "terms" | "privacy"; name: string }) {
  return (
    <AppText accessibilityRole="link" onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc } })} style={styles.link}>
      {name}
    </AppText>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: theme.colors.textMuted },
  dob: { flexDirection: "row", gap: 8 },
  box: {
    minWidth: 0,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 0.75,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  boxError: { borderColor: theme.colors.red },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 15,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.navy,
    fontVariant: ["tabular-nums"],
  },
  hint: { marginTop: 8, fontFamily: theme.fontFamily.body, fontSize: 12.5, lineHeight: 18.1, color: theme.colors.textMedium },
  link: { fontFamily: theme.fontFamily.bodySemiBold, color: theme.colors.navy, textDecorationLine: "underline" },
  error: { marginTop: 12, fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, lineHeight: 18.2, color: theme.colors.red },
});
