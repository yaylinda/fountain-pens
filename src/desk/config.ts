import { createTamagui } from "tamagui";
import { animations } from "@tamagui/config/animations-css";
import { defaultConfig } from "@tamagui/config/v6";

// Tamagui 3 uses bare token references and CSS line-height units.
// Keep longhand props readable in this small web-only experiment.
export const config = createTamagui({
  ...defaultConfig,
  animations,
  tokens: {
    ...defaultConfig.tokens,
    space: {
      ...defaultConfig.tokens.space,
      compact: 8,
      stack: 16,
      section: 24,
    },
    radius: { ...defaultConfig.tokens.radius, control: 6, panel: 10 },
    size: { ...defaultConfig.tokens.size, control: 38 },
  },
  fonts: {
    body: { ...defaultConfig.fonts.body, family: "Fira Mono, monospace" },
    pixel: { ...defaultConfig.fonts.heading, family: "Silkscreen, monospace" },
    heading: { ...defaultConfig.fonts.heading, family: "Fira Mono, monospace" },
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
      background: "#fcfbfc",
      backgroundHover: "#f2f1f3",
      backgroundPress: "#e6e6e9",
      color: "#242426",
      borderColor: "#d9d9de",
      surface: "#ffffff",
      muted: "#68686e",
      accent: "#f3d51b",
      soft: "#edf5ff",
      accentText: "#242426",
      selectedBorder: "#1686ed",
    },
  },
});
type AppConfig = typeof config;
// Tamagui uses declaration merging for the application config.
declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}
