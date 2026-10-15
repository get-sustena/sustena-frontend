// The quantity an item added by hand starts with (SL-08). A catalogue
// ingredient gets 1 of the unit the list gives it when it comes from a
// recipe; counted things have no unit and read "1 piece", as the server
// shows them. Custom items, and a catalogue saved before shopping units
// existed, keep "1 unit". Shared by the app and its tests.
import type { ShoppingUnit } from "../../types/api.ts";

export function handAddedQuantity(ingredient: { shoppingUnit?: ShoppingUnit | null } | undefined) {
  if (!ingredient || ingredient.shoppingUnit === undefined) {
    return { quantity: "1 unit", unit: "unit", displayQuantity: "1 unit" };
  }
  const unit = ingredient.shoppingUnit;
  return { quantity: "1", unit, displayQuantity: `1 ${unit ?? "piece"}` };
}
