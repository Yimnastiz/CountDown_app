import type { AppSettings } from "./types";
export const sidebarModes = ["expanded", "collapsed", "hidden"] as const;
export const normalizeSidebarMode = (
  value: unknown,
): NonNullable<AppSettings["sidebarMode"]> =>
  sidebarModes.includes(value as (typeof sidebarModes)[number])
    ? (value as NonNullable<AppSettings["sidebarMode"]>)
    : "expanded";
