import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyResolvedColorScheme, readResolvedColorScheme } from "./model/colorScheme";
import {
  initDesignDirectionPreview,
} from "./design/applyDesignDirection";
import "./App.css";
import "./design/designDirections.css";

applyResolvedColorScheme(readResolvedColorScheme());
initDesignDirectionPreview(readResolvedColorScheme);

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
