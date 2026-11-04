import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyResolvedColorScheme, readResolvedColorScheme } from "./model/colorScheme";
import { applyFreshStartForRuntime } from "./model/devFreshStart";
import "./App.css";
import "./design/appChrome.css";
import "./components/ui/primitives.css";

const preventBrowserFileNavigation = (event: DragEvent) => {
  event.preventDefault();
};

window.addEventListener("dragover", preventBrowserFileNavigation);
window.addEventListener("drop", preventBrowserFileNavigation);

async function bootstrap(): Promise<void> {
  applyResolvedColorScheme(readResolvedColorScheme());
  await applyFreshStartForRuntime();
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
