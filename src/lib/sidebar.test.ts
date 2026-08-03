import { describe, expect, it } from "vitest";
import { normalizeSidebarMode } from "./sidebar";
describe("sidebar modes", () => {
  it("accepts expanded and collapsed modes", () => {
    expect(normalizeSidebarMode("expanded")).toBe("expanded");
    expect(normalizeSidebarMode("collapsed")).toBe("collapsed");
  });
  it("keeps a hidden mode and falls back for invalid values", () => {
    expect(normalizeSidebarMode("hidden")).toBe("hidden");
    expect(normalizeSidebarMode("bad")).toBe("expanded");
  });
});
