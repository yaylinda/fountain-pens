import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { config } from "./config";
import { DeskLab } from "./DeskLab";
import "./shell.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TamaguiProvider config={config} defaultTheme="light">
      <DeskLab />
    </TamaguiProvider>
  </React.StrictMode>,
);
