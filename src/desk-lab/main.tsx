import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { config } from "./config";
import { DeskLab } from "./DeskLab";
import "./shell.css";
const graphite =
  new URLSearchParams(location.search).get("theme") === "graphite";
document.documentElement.dataset.direction = graphite ? "graphite" : "garden";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TamaguiProvider config={config} defaultTheme={graphite ? "dark" : "light"}>
      <DeskLab />
    </TamaguiProvider>
  </React.StrictMode>,
);
