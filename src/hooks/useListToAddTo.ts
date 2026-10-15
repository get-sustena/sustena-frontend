import { useShoppingListsStore } from "../store/shoppingListsStore";
import { useListCommands } from "./useListCommands";

// The list to add to: the active one, or a new list named `name` when the
// person has deleted every list (SL-07). Works offline.
export function useListToAddTo() {
  const lists = useShoppingListsStore((state) => state.lists);
  const activeListId = useShoppingListsStore((state) => state.activeListId);
  const addList = useShoppingListsStore((state) => state.addList);
  const listCommands = useListCommands();

  return async (name: string) => {
    if (lists.some((list) => list.id === activeListId)) return activeListId;
    if (lists.length) return lists[0].id;
    const list = await listCommands.createList({ name });
    addList(list);
    return list.id;
  };
}
