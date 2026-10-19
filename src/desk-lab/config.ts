import { createTamagui } from "tamagui";
import { defaultConfig } from "@tamagui/config/v6";

// Tamagui 3 uses bare token references and CSS line-height units.
// Keep longhand props readable in this small web-only experiment.
export const config = createTamagui({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    space: {
      ...defaultConfig.tokens.space,
      compact: 8,
      stack: 16,
      section: 24,
    },
    radius: { ...defaultConfig.tokens.radius, control: 10, panel: 18 },
    size: { ...defaultConfig.tokens.size, control: 38 },
  },
  fonts: {
    body: { ...defaultConfig.fonts.body, family: "Figtree, sans-serif" },
    heading: { ...defaultConfig.fonts.heading, family: "Figtree, sans-serif" },
  },
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
    allowedStyleValues: false,
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      background: "#f5f5f2",
      backgroundHover: "#edede7",
      backgroundPress: "#e1e5db",
      color: "#25362f",
      borderColor: "#dce1d8",
      surface: "#ffffff",
      muted: "#667469",
      accent: "#386347",
      soft: "#e8efdf",
      accentText: "#ffffff",
      selectedBorder: "#7c966d",
    },
    dark: {
      ...defaultConfig.themes.dark,
      background: "#24262b",
      backgroundHover: "#363940",
      backgroundPress: "#42434c",
      color: "#e9e7e4",
      borderColor: "#494b53",
      surface: "#2e3036",
      muted: "#b1b2bc",
      accent: "#cbc1dd",
      soft: "#41404e",
      accentText: "#292332",
      selectedBorder: "#b5a4cb",
    },
  },
});
type AppConfig = typeof config;
// Tamagui uses declaration merging for the application config.
declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}
