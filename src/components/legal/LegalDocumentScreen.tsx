import { router } from "expo-router";
import { Fragment, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import legalDocuments from "../../data/legalDocuments.json";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export type LegalDocumentId = keyof typeof legalDocuments;
type Run = { text: string; bold?: boolean };
type Block = { kind: string; runs?: Run[]; rows?: { label: string; runs: Run[] }[][] };

const OTHER: Record<LegalDocumentId, LegalDocumentId> = { terms: "privacy", privacy: "terms" };

// v6.9's reading screen for the Terms of Service and the Privacy Policy
// (renderLegal): the text of the docs/legal drafts, with contents that jump
// to each section. The lawyer-reviewed text replaces it before release.
export function LegalDocumentScreen({ doc }: { doc: LegalDocumentId }) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const sectionTops = useRef<number[]>([]);
  const document = legalDocuments[doc];
  const other = OTHER[doc];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="chevronLeft" size={20} color={theme.colors.navy} />
        </Pressable>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
        <AppText accessibilityRole="header" style={styles.title}>{document.name}</AppText>
        <AppText style={styles.meta}>Last updated <Runs runs={document.updated} /></AppText>
        <View style={styles.intro}>
          <Blocks blocks={document.intro} />
        </View>

        <View style={styles.toc} accessibilityLabel="Contents">
          <AppText style={styles.tocTitle}>Contents</AppText>
          {document.sections.map((section, index) => {
            const [number, heading] = splitHeading(section.heading);
            return (
              <Pressable
                key={section.heading}
                accessibilityRole="button"
                onPress={() => scroll.current?.scrollTo({ y: (sectionTops.current[index] ?? 0) - 8, animated: true })}
                style={[styles.tocRow, index === document.sections.length - 1 && styles.tocRowLast]}
              >
                <AppText style={styles.tocNumber}>{number}</AppText>
                <AppText style={styles.tocText}>{heading}</AppText>
              </Pressable>
            );
          })}
        </View>

        {document.sections.map((section, index) => (
          <View
            key={section.heading}
            onLayout={(event) => {
              sectionTops.current[index] = event.nativeEvent.layout.y;
            }}
          >
            <AppText accessibilityRole="header" style={styles.heading}>{section.heading}</AppText>
            <Blocks blocks={section.blocks} />
          </View>
        ))}

        <AppText style={styles.alsoRead}>Also read</AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: "/legal/[doc]", params: { doc: other } })}
          style={styles.otherRow}
        >
          <Icon name={other === "terms" ? "fileText" : "shieldCheck"} size={20} color={theme.colors.navy3} />
          <View style={styles.otherMain}>
            <AppText style={styles.otherTitle}>{legalDocuments[other].name}</AppText>
            <AppText style={styles.otherSub}>Last updated <Runs runs={legalDocuments[other].updated} /></AppText>
          </View>
          <Icon name="chevronRight" size={16} color={theme.colors.navy} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function splitHeading(heading: string) {
  const match = heading.match(/^(\d+)\.\s+(.*)$/);
  return match ? [match[1], match[2]] : ["", heading];
}

function Runs({ runs }: { runs: Run[] }) {
  return runs.map((run, index) => (
    <Fragment key={index}>{run.bold ? <AppText style={styles.strong}>{run.text}</AppText> : run.text}</Fragment>
  ));
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return blocks.map((block, index) =>
    block.kind === "table" ? (
      <View key={index} style={styles.table}>
        {block.rows!.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.tableRow}>
            {row.map((cell, cellIndex) => (
              <Fragment key={cell.label}>
                <AppText style={[styles.cellLabel, cellIndex === 0 && styles.cellLabelFirst]}>{cell.label}</AppText>
                <AppText style={[styles.cellValue, cellIndex === 0 && styles.cellValueFirst]}>
                  <Runs runs={cell.runs} />
                </AppText>
              </Fragment>
            ))}
          </View>
        ))}
      </View>
    ) : (
      <AppText key={index} style={[styles.paragraph, block.kind === "item" && styles.item, block.kind === "address" && styles.address]}>
        <Runs runs={block.runs!} />
      </AppText>
    )
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  header: { paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row" },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  title: { fontFamily: theme.fontFamily.display, fontSize: 28, lineHeight: 31.4, letterSpacing: -0.7, color: theme.colors.navy },
  meta: { marginTop: 8, fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, lineHeight: 18.2, color: theme.colors.textMedium },
  intro: { marginTop: 18 },
  toc: { marginTop: 22, marginBottom: 6, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 18, backgroundColor: theme.colors.page },
  tocTitle: { paddingTop: 10, paddingBottom: 4, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: theme.colors.textMedium },
  tocRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 0.75, borderBottomColor: theme.colors.border },
  tocRowLast: { borderBottomWidth: 0 },
  tocNumber: { width: 22, fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.textMedium, fontVariant: ["tabular-nums"] },
  tocText: { flex: 1, fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, lineHeight: 18.2, color: theme.colors.navy },
  heading: { marginTop: 28, marginBottom: 8, fontFamily: theme.fontFamily.display, fontSize: 18, lineHeight: 22.5, letterSpacing: -0.18, color: theme.colors.navy },
  paragraph: { marginBottom: 12, fontFamily: theme.fontFamily.body, fontSize: 15, lineHeight: 24, color: theme.colors.text },
  item: { paddingLeft: 14 },
  address: { color: theme.colors.navy },
  strong: { fontFamily: theme.fontFamily.bodySemiBold, color: theme.colors.navy },
  table: { marginTop: 4, marginBottom: 16, gap: 10 },
  tableRow: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 0.75, borderColor: theme.colors.border, backgroundColor: theme.colors.page },
  cellLabel: { marginTop: 10, marginBottom: 2, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, lineHeight: 15.6, color: theme.colors.textMedium },
  cellLabelFirst: { marginTop: 0 },
  cellValue: { fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 21, color: theme.colors.navy },
  cellValueFirst: { fontFamily: theme.fontFamily.bodySemiBold },
  alsoRead: { marginTop: 30, marginBottom: 8, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: theme.colors.textMedium },
  otherRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, paddingHorizontal: 2, borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: theme.colors.border },
  otherMain: { flex: 1, minWidth: 0 },
  otherTitle: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, lineHeight: 18.9, color: theme.colors.navy },
  otherSub: { marginTop: 3, fontFamily: theme.fontFamily.body, fontSize: 12.5, lineHeight: 16.9, color: theme.colors.textMedium },
});
