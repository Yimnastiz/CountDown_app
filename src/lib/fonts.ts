import localFont from "next/font/local";

/** Pixellet display font. Body copy remains on Chakra Petch. */
export const pixellet = localFont({
  src: "../../public/fonts/pixellet.ttf",
  variable: "--font-pixellet",
  display: "swap",
  preload: true,
  fallback: ["Noto Sans Thai", "system-ui", "sans-serif"],
});
