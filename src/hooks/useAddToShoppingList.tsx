import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ChooseListSheet, ReviewQuantitiesSheet } from "../components/shopping/AddToListSheets";
import { mapShoppingListRowToItem } from "../db/shoppingItemRows";
import { getStoredShoppingListItems } from "../db/shoppingListRepository";
import { destinationSummary, reviewRecipeAdd } from "../lib/shopping/addReview";
import type { ListRow, RecipeSelectionInput } from "../lib/shopping/recipeMerge";
import type { UnitRow } from "../lib/shopping/shoppingRules";
import { usePantryStore } from "../store/pantryStore";
import { useShoppingListStore } from "../store/shoppingListStore";
import { useShoppingListsStore } from "../store/shoppingListsStore";
import { closeSheet, openSheet, showToast } from "../store/uiStore";
import { useIngredientCatalogQuery } from "./api/useIngredients";
import { useUnitsQuery } from "./api/useUnits";
import { useListCommands } from "./useListCommands";
import { useShoppingCommands } from "./useShoppingCommands";

type Adding = {
  // "Choose a shopping list for <title>."
  title: string;
  // The name a new list gets.
  defaultName: string;
  selections: RecipeSelectionInput[];
};

// "Add to shopping list" from a recipe or a meal plan (SL-06): pick a list,
// review what lands on it, then add. Everything is worked out and saved on
// the phone, so it works offline; the outbox sends it.
export function useAddToShoppingList() {
  const db = useSQLiteContext();
  const addList = useShoppingListsStore((state) => state.addList);
  const hydrateItems = useShoppingListStore((state) => state.hydrateItems);
  const pantryIngredientIds = usePantryStore((state) => state.ingredientIds);
  const catalogue = useIngredientCatalogQuery().data;
  const units = useUnitsQuery().data;
  const listCommands = useListCommands();
  const shoppingCommands = useShoppingCommands();

  const unitTable = new Map<string, UnitRow>((units ?? []).map((unit) => [unit.id, unit]));
  const ingredients = new Map((catalogue ?? []).map((ingredient) => [ingredient.id, ingredient]));
  const ingredientOf = (ingredientId: string | null | undefined) => (ingredientId ? ingredients.get(ingredientId) ?? null : null);

  async function reviewFor(listId: string, adding: Adding) {
    const rows: ListRow[] = (await getStoredShoppingListItems(db, listId)).map(mapShoppingListRowToItem).map((item) => ({
      id: item.id,
      name: item.name,
      canonicalIngredientName: item.canonicalIngredientName ?? null,
      ingredientId: item.ingredientId ?? null,
      amount: item.amount ?? null,
      quantity: item.amount === undefined ? item.quantity : String(item.amount),
      unit: item.unit ?? null,
      category: item.category,
      checked: item.checked,
      sources: item.sources ?? [],
    }));
    return reviewRecipeAdd({
      rows,
      selections: adding.selections,
      units: unitTable,
      pantryIngredientIds: new Set(pantryIngredientIds),
      ingredientOf,
    });
  }

  async function openChooseList(adding: Adding) {
    // Read when the sheet opens, so a list made since shows too.
    const { lists } = useShoppingListsStore.getState();
    const summaries = await Promise.all(
      lists.map(async (list) => ({ id: list.id, name: list.name, summary: destinationSummary(await reviewFor(list.id, adding)) }))
    );
    openSheet(
      <ChooseListSheet
        title={adding.title}
        lists={summaries}
        onChoose={(listId) => void openReview(listId, adding)}
        onNewList={() => void addToNewList(adding)}
      />
    );
  }

  async function addToNewList(adding: Adding) {
    const list = await listCommands.createList({ name: adding.defaultName });
    addList(list);
    await openReview(list.id, adding, list.name);
  }

  async function openReview(listId: string, adding: Adding, listName?: string) {
    const review = await reviewFor(listId, adding);
    openSheet(
      <ReviewQuantitiesSheet
        listName={listName ?? useShoppingListsStore.getState().lists.find((list) => list.id === listId)?.name ?? ""}
        rows={review.rows}
        inPantryNames={review.inPantry.map((skipped) => skipped.name)}
        onBack={() => void openChooseList(adding)}
        onConfirm={() => void confirm(listId, adding, review)}
      />
    );
  }

  async function confirm(listId: string, adding: Adding, review: Awaited<ReturnType<typeof reviewFor>>) {
    const updated = review.rows.length;
    if (updated) {
      await shoppingCommands.addReviewedRecipes({
        listId,
        recipes: adding.selections.map((selection) => ({
          recipeId: selection.recipe.id,
          servings: selection.servings,
          unitOverrides: Object.entries(selection.unitOverrides ?? {}).map(([ingredientId, unit]) => ({ ingredientId, unit })),
        })),
        review,
      });
      if (listId === useShoppingListsStore.getState().activeListId) {
        hydrateItems((await getStoredShoppingListItems(db, listId)).map(mapShoppingListRowToItem));
      }
    }
    closeSheet();
    router.push({ pathname: "/shopping/[id]", params: { id: listId } });
    showToast(updated ? `${updated} shopping item${updated === 1 ? "" : "s"} updated` : "Everything is already in your pantry", "success");
  }

  return (adding: Adding) => void openChooseList(adding);
}
