import type { CloudData } from "./cloud-data";
import type { Category, Countdown } from "./types";

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};
const materiallyEqual = <T extends { createdAt: string; updatedAt: string }>(
  left: T,
  right: T,
) => {
  const {
    createdAt: _leftCreated,
    updatedAt: _leftUpdated,
    ...leftData
  } = left;
  const {
    createdAt: _rightCreated,
    updatedAt: _rightUpdated,
    ...rightData
  } = right;
  return canonical(leftData) === canonical(rightData);
};
const hash = (value: unknown) => {
  let result = 2166136261;
  for (const character of canonical(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
};
const collisionId = (id: string, item: unknown) => `${id}~import-${hash(item)}`;

export type MigrationPlan = {
  countdowns: Countdown[];
  categories: Category[];
  importSettings: boolean;
  conflicts: number;
};

/** Non-destructive, idempotent merge plan for one device's legacy snapshot. */
export function buildMigrationPlan(
  cloud: CloudData,
  local: CloudData,
): MigrationPlan {
  const cloudCategories = new Map(
    cloud.categories.map((item) => [item.id, item]),
  );
  const categoryIdMap = new Map<string, string>();
  const categories: Category[] = [];
  let conflicts = 0;
  for (const category of local.categories) {
    const existing = cloudCategories.get(category.id);
    if (!existing) {
      categories.push(category);
      categoryIdMap.set(category.id, category.id);
      continue;
    }
    if (materiallyEqual(existing, category)) {
      categoryIdMap.set(category.id, category.id);
      continue;
    }
    const id = collisionId(category.id, category);
    categoryIdMap.set(category.id, id);
    if (!cloudCategories.has(id)) categories.push({ ...category, id });
    conflicts += 1;
  }
  const cloudCountdowns = new Map(
    cloud.countdowns.map((item) => [item.id, item]),
  );
  const countdowns: Countdown[] = [];
  for (const source of local.countdowns) {
    const categoryId = source.categoryId
      ? (categoryIdMap.get(source.categoryId) ?? source.categoryId)
      : undefined;
    const item = { ...source, categoryId };
    const existing = cloudCountdowns.get(item.id);
    if (!existing) {
      countdowns.push(item);
      continue;
    }
    if (materiallyEqual(existing, item)) continue;
    const id = collisionId(item.id, item);
    if (!cloudCountdowns.has(id)) countdowns.push({ ...item, id });
    conflicts += 1;
  }
  return {
    countdowns,
    categories,
    importSettings:
      cloud.countdowns.length === 0 && cloud.categories.length === 0,
    conflicts,
  };
}
