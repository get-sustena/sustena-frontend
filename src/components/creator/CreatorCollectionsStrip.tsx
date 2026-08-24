import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

export type CreatorRecipeCollection = { id: string; label: string; count: number; coverUrl: string | null };

export function CreatorCollectionsStrip({ collections, selected, onSelect }: { collections: CreatorRecipeCollection[]; selected: string; onSelect: (value: string) => void }) {
  if (collections.length <= 1) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {collections.map((collection) => {
        const active = collection.id === selected;
        return (
          <Pressable key={collection.id} onPress={() => onSelect(collection.id)} style={styles.item}>
            <View style={styles.coverWrap}>
              {active ? <View pointerEvents="none" style={styles.activeRing} /> : null}
              <View style={styles.cover}>
                {collection.coverUrl ? <Image source={{ uri: collection.coverUrl }} contentFit="cover" style={StyleSheet.absoluteFillObject} /> : <View style={styles.fallback} />}
                <View style={[styles.scrim, active && styles.scrimActive]} />
                {active ? <View pointerEvents="none" style={styles.activeInset} /> : null}
                <AppText style={styles.count}>{collection.count}</AppText>
              </View>
            </View>
            <AppText numberOfLines={2} style={[styles.label, active && styles.labelActive]}>{collection.label.split(" / ")[0]}</AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 16, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 4 },
  item: { width: 70 },
  coverWrap: { position: "relative", width: 70, height: 70, marginBottom: 7 },
  cover: { position: "relative", width: 70, height: 70, borderRadius: 35, overflow: "hidden" },
  activeRing: { position: "absolute", top: -2, left: -2, width: 74, height: 74, borderRadius: 37, borderWidth: 2, borderColor: "#17291E" },
  activeInset: { ...StyleSheet.absoluteFillObject, borderRadius: 35, borderWidth: 3, borderColor: "#FBFCFA" },
  fallback: { ...StyleSheet.absoluteFillObject, backgroundColor: "#EEF2E7" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(23,41,30,0.28)" },
  scrimActive: { backgroundColor: "rgba(23,41,30,0.12)" },
  count: { position: "absolute", left: 0, right: 0, bottom: 8, fontFamily: theme.fontFamily.monoBold, fontSize: 10, textAlign: "center", color: "#FBFBF7" },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, lineHeight: 14.375, textAlign: "center", color: "#5C6459" },
  labelActive: { fontFamily: theme.fontFamily.bodyBold, color: "#17291E" },
});
