import { describe, expect, it } from "vitest";
import { normalizeCategory, sortCategories } from "./categories";
import { normalizeIconKey } from "./icons";
import type { Category } from "./types";
const category = (
  id: string,
  kind: Category["kind"],
  isDefault = false,
): Category => ({
  id,
  kind,
  name: id,
  icon: "shapes",
  color: "#000000",
  isDefault,
  createdAt: "",
  updatedAt: "",
});
describe("categories", () => {
  it("keeps Other last", () =>
    expect(
      sortCategories([
        category("other", "other", true),
        category("custom", "custom"),
        category("default", "default", true),
      ]).map((item) => item.id),
    ).toEqual(["default", "custom", "other"]));
  it("falls back for unknown imported icons", () =>
    expect(normalizeIconKey("not-an-icon")).toBe("shapes"));
  it("migrates legacy Other by stable ID", () =>
    expect(
      normalizeCategory({
        ...category("other", undefined, true),
        icon: "Sparkles",
      }),
    ).toMatchObject({ kind: "other", icon: "other" }));
});
