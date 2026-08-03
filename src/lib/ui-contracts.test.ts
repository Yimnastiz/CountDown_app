import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const shell = readFileSync(
  new URL("../components/shell.tsx", import.meta.url),
  "utf8",
);
const form = readFileSync(
  new URL("../components/countdown-form.tsx", import.meta.url),
  "utf8",
);
const calendar = readFileSync(
  new URL("../app/calendar/page.tsx", import.meta.url),
  "utf8",
);
describe("responsive theme contracts", () => {
  it("keeps form controls inside narrow cards", () => {
    expect(css).toContain("max-width: 100%");
    expect(css).toContain("min-width: 0");
    expect(css).toContain("font-size: 16px");
  });
  it("uses theme tokens for the dashboard filter", () => {
    const filterStyles = css.slice(
      css.indexOf(".dashboard-filters"),
      css.indexOf(".custom-recurrence"),
    );
    expect(filterStyles).toContain("var(--surface");
    expect(filterStyles).not.toMatch(/background:\s*(white|#fff)\b/);
  });
  it.each(["pastel-pink", "sky-blue", "lavender"])(
    "defines the %s theme",
    (theme) => expect(css).toContain(`[data-theme="${theme}"]`),
  );
  it("keeps focus styles and accessible mobile More navigation", () => {
    expect(css).toContain(":focus-visible");
    expect(shell).toContain("Categories");
    expect(shell).toContain("More");
  });
  it("uses a shared modal-capable form with date overflow protections", () => {
    expect(form).toContain('type FormMode = "page" | "modal"');
    expect(calendar).toContain('mode="modal"');
    expect(form).toContain("date-input");
    expect(css).toContain(".date-input");
  });
});
