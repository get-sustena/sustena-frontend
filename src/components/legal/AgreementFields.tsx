import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { AgreementForm } from "../../lib/legal/agreement";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { LegalCheckRow } from "./LegalCheckRow";

type Props = {
  form: AgreementForm;
  onChange: (form: AgreementForm) => void;
  // The error from the last tap, cleared as the person changes something.
  error: string | null;
  // Sign-up also asks about marketing emails; the agreement screen doesn't.
  marketing?: { value: boolean; onChange: (value: boolean) => void };
};

// The age and agreement ticks under sign-up and on the agreement screen.
export function AgreementFields({ form, onChange, error, marketing }: Props) {
  return (
    <View>
      <LegalCheckRow checked={form.adult} onToggle={() => onChange({ ...form, adult: !form.adult })}>
        I confirm I’m at least 18 years old, or I have permission from a parent or guardian.
      </LegalCheckRow>
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
  link: { fontFamily: theme.fontFamily.bodySemiBold, color: theme.colors.navy, textDecorationLine: "underline" },
  error: { marginTop: 12, fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, lineHeight: 18.2, color: theme.colors.red },
});
