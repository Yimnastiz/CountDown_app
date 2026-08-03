import type { Countdown } from "./types";
import { statusFor } from "./date";
export type ImportanceFilter = "all" | "important" | "normal";
export interface DashboardFilters {
  categoryIds: string[];
  importance: ImportanceFilter;
}
export const emptyDashboardFilters: DashboardFilters = {
  categoryIds: [],
  importance: "all",
};
export const DEFAULT_FILTER_PANEL_OPEN = false;
export function filterCountdowns(
  items: Countdown[],
  filters: DashboardFilters,
) {
  return items.filter((item) => {
    if (statusFor(item) === "completed" || statusFor(item) === "archived")
      return false;
    const categoryMatches =
      !filters.categoryIds.length ||
      (item.categoryId ? filters.categoryIds.includes(item.categoryId) : false);
    const importanceMatches =
      filters.importance === "all" ||
      (filters.importance === "important" ? item.important : !item.important);
    return categoryMatches && importanceMatches;
  });
}
