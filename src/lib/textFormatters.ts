export function capitalizeWords(value: string) {
  return value.replace(/\S+/g, (word) => {
    const firstLetterIndex = word.search(/[A-Za-zÀ-ÖØ-öø-ÿ]/);

    if (firstLetterIndex === -1) {
      return word;
    }

    return `${word.slice(0, firstLetterIndex)}${word
      .charAt(firstLetterIndex)
      .toLocaleUpperCase()}${word.slice(firstLetterIndex + 1)}`;
  });
}

export function formatShoppingQuantity(value: string) {
  return value.replace(/-?\d+\.\d+/g, (quantity) => {
    const parsed = Number(quantity);
    return Number.isFinite(parsed) ? String(parsed) : quantity;
  });
}
