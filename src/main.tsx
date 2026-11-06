import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installBrowserFileDropGuard } from "./model/browserFileDropGuard";
import { applyResolvedColorScheme, readResolvedColorScheme } from "./model/colorScheme";
import { applyFreshStartForRuntime } from "./model/devFreshStart";
import "./App.css";
import "./design/appChrome.css";
import "./components/ui/primitives.css";

installBrowserFileDropGuard();

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
