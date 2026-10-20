import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider, Toast } from "tamagui";
import { config } from "./desk/config";
import { App } from "./App";
import "./desk/shell.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TamaguiProvider config={config} defaultTheme="light">
      <App />
      <Toast
        duration={4000}
        position="bottom-center"
        visibleToasts={1}
        closeButton
      >
        <Toast.Viewport className="desk-toasts">
          <Toast.List />
        </Toast.Viewport>
      </Toast>
    </TamaguiProvider>
  </React.StrictMode>,
);
