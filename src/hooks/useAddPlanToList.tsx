import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { ShoppingListDestinationSheet } from "../components/shopping/ShoppingListDestinationSheet";
import { replaceShoppingListItemsForList } from "../db/shoppingListRepository";
import { shoppingListsApi } from "../lib/api";
import { apiShoppingItemToLocalItem } from "../lib/api/adapters";
import { createLocalId } from "../lib/id";
import { useShoppingListStore } from "../store/shoppingListStore";
import { useShoppingListsStore } from "../store/shoppingListsStore";
import { closeSheet, openSheet } from "../store/uiStore";

type PlanMealServings = { recipeId: string; servings: number };

// "Add to shopping list" on a meal plan: asks which list when there's more
// than one, adds every recipe once with its servings summed, then opens the
// list. Used by the planner, Saved meal plans and a saved plan's screen.
export function useAddPlanToList() {
  const db = useSQLiteContext();
  const [isAdding, setIsAdding] = useState(false);
  const hydrateItems = useShoppingListStore((state) => state.hydrateItems);
  const activeListId = useShoppingListsStore((state) => state.activeListId);
  const shoppingLists = useShoppingListsStore((state) => state.lists);

  async function addToList(listId: string, meals: PlanMealServings[]) {
    if (meals.length === 0 || isAdding) return;
    setIsAdding(true);
    try {
      const servingsByRecipe = new Map<string, number>();
      for (const meal of meals) {
        servingsByRecipe.set(meal.recipeId, (servingsByRecipe.get(meal.recipeId) ?? 0) + meal.servings);
      }
      const updatedList = await shoppingListsApi.addRecipesToShoppingList(listId, {
        clientMutationId: createLocalId("plan_shopping"),
        recipes: Array.from(servingsByRecipe, ([recipeId, servings]) => ({ recipeId, servings })),
      });
      const saved = await replaceShoppingListItemsForList(
        db,
        listId,
        updatedList.items.map((item) => ({ ...apiShoppingItemToLocalItem(item), listId }))
      );
      if (listId === activeListId) hydrateItems(saved);
      router.push({ pathname: "/shopping/[id]", params: { id: listId } });
    } catch (error) {
      console.error("Failed to add meal plan to shopping list", error);
    } finally {
      setIsAdding(false);
    }
  }

  function addPlanToList(meals: PlanMealServings[]) {
    if (shoppingLists.length <= 1) {
      void addToList(activeListId, meals);
      return;
    }
    openSheet(
      <ShoppingListDestinationSheet
        lists={shoppingLists}
        activeListId={activeListId}
        onSelect={(listId) => {
          closeSheet();
          void addToList(listId, meals);
        }}
      />
    );
  }

  return { addPlanToList, isAdding };
}
