import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { config } from "./desk/config";
import { Feedback } from "./desk/Feedback";
import { App } from "./App";
import "./desk/shell.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TamaguiProvider config={config} defaultTheme="light">
      <App />
      <Feedback />
    </TamaguiProvider>
  </React.StrictMode>,
);
