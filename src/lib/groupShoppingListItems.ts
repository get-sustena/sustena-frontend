import { ShoppingListItem, ShoppingListSection } from "../types/shoppingList";

const CATEGORY_ORDER = [
  "Proteins",
  "Grains",
  "Produce",
  "Spices",
  "Dairy",
  "Pantry",
  "Tools",
];

export function groupShoppingListItems(
  items: ShoppingListItem[]
): ShoppingListSection[] {
  const grouped = items.reduce<Record<string, ShoppingListItem[]>>(
    (acc, item) => {
      const category = item.category || "Pantry";

      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category].push(item);

      return acc;
    },
    {}
  );

  return Object.entries(grouped)
    .sort(([categoryA], [categoryB]) => {
      const indexA = CATEGORY_ORDER.indexOf(categoryA);
      const indexB = CATEGORY_ORDER.indexOf(categoryB);

      if (indexA === -1 && indexB === -1) {
        return categoryA.localeCompare(categoryB);
      }

      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    })
    .map(([category, categoryItems]) => ({
      category,
      items: categoryItems,
    }));
}

export function getCategoryEmoji(category: string) {
  const categoryEmojiMap: Record<string, string> = {
    Proteins: "🥩",
    Grains: "🌾",
    Produce: "🥬",
    Spices: "🌶️",
    Dairy: "🥛",
    Pantry: "🫙",
    Tools: "🛠️",
  };

  return categoryEmojiMap[category] ?? "🛒";
}
