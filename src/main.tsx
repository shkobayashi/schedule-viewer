import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyResolvedColorScheme, readResolvedColorScheme } from "./model/colorScheme";
import "./App.css";

applyResolvedColorScheme(readResolvedColorScheme());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
