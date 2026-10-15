import { Redirect, useLocalSearchParams } from "expo-router";
import { LegalDocumentScreen, type LegalDocumentId } from "../../src/components/legal/LegalDocumentScreen";

export default function LegalDocumentRoute() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  if (doc !== "terms" && doc !== "privacy") return <Redirect href="/" />;
  return <LegalDocumentScreen doc={doc satisfies LegalDocumentId} />;
}
