import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyResolvedColorScheme, readResolvedColorScheme } from "./model/colorScheme";
import { applyFreshStartIfRequested } from "./model/devFreshStart";
import "./App.css";
import "./design/appChrome.css";
import "./components/ui/primitives.css";

applyResolvedColorScheme(readResolvedColorScheme());
applyFreshStartIfRequested();

const preventBrowserFileNavigation = (event: DragEvent) => {
  event.preventDefault();
};

window.addEventListener("dragover", preventBrowserFileNavigation);
window.addEventListener("drop", preventBrowserFileNavigation);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
