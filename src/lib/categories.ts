import type { Category } from "./types";
import { normalizeIconKey } from "./icons";

export function normalizeCategory(category: Category): Category {
  const isOther = category.id === "other" || category.kind === "other";
  return {
    ...category,
    icon: normalizeIconKey(category.icon),
    kind: isOther
      ? "other"
      : (category.kind ?? (category.isDefault ? "default" : "custom")),
  };
}

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].map(normalizeCategory).sort((a, b) => {
    const rank = (category: Category) =>
      category.kind === "other" ? 2 : category.isDefault ? 0 : 1;
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });
}
