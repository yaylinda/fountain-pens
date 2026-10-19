import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { "process.env.TAMAGUI_TARGET": JSON.stringify("web") },
  resolve: { alias: { "react-native": "react-native-web" } },
});
