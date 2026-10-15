// What a tick on a shopping list says, and what "Mark all" changes, so Undo
// can put back exactly what was there (SL-05, prototype toggleShop and
// toggleShopPantryAll). Shared by the app and its tests.

export function tickMessage(checked: boolean) {
  return checked ? "Marked as in pantry" : "Marked as not in pantry";
}

// Ticks every item still needed; once all are ticked, unticks them all.
// `itemIds` are the items that change, so Undo flips just those back.
export function markAllChange(items: { id: string; checked: boolean }[]) {
  const checked = items.some((item) => !item.checked);
  return {
    checked,
    itemIds: items.filter((item) => item.checked !== checked).map((item) => item.id),
    message: checked ? "Marked all as in pantry" : "Marked all as not in pantry",
  };
}
