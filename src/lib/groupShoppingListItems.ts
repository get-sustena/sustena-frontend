import { ShoppingListItem, ShoppingListSection } from "../types/shoppingList";

const CATEGORY_ORDER = [
  "meat_seafood",
  "grains_staples",
  "produce",
  "dairy_eggs",
  "herbs_spices",
  "pantry",
  "other",
];

export const SHOPPING_CATEGORY_LABELS: Record<string, string> = {
  meat_seafood: "Meat & Seafood",
  grains_staples: "Grains & Staples",
  produce: "Produce",
  dairy_eggs: "Dairy & Eggs",
  herbs_spices: "Herbs & Spices",
  pantry: "Pantry",
  other: "Other",
};

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
      category: SHOPPING_CATEGORY_LABELS[category] ?? category,
      items: [...categoryItems].sort((itemA, itemB) => {
        const createdA = Date.parse(itemA.createdAt);
        const createdB = Date.parse(itemB.createdAt);

        if (Number.isNaN(createdA) || Number.isNaN(createdB)) {
          return 0;
        }

        return createdA - createdB;
      }),
    }));
}
