import { invoke, isTauri } from "@tauri-apps/api/core";

function note(event: string, detail?: string) {
  if (!isTauri()) return;
  void invoke("note_mouse_trace_page_event", {
    event,
    detail: detail ?? null,
  }).catch(() => {});
}

function pointerDetail(event: PointerEvent): string {
  const target =
    event.target instanceof Element ? event.target.tagName.toLowerCase() : "?";
  return `button=${event.button} buttons=${event.buttons} type=${event.pointerType} target=${target}`;
}

export function installMouseTracePageListeners() {
  if (!isTauri()) return;

  window.addEventListener(
    "pointerdown",
    (event) => {
      note("pointerdown", pointerDetail(event));
    },
    true,
  );
  window.addEventListener(
    "pointerup",
    (event) => {
      note("pointerup", pointerDetail(event));
    },
    true,
  );
  window.addEventListener(
    "pointercancel",
    (event) => {
      note("pointercancel", pointerDetail(event));
    },
    true,
  );
  window.addEventListener(
    "dragstart",
    (event) => {
      const target =
        event.target instanceof Element ? event.target.tagName : "?";
      note("dragstart", `target=${target}`);
    },
    true,
  );
  window.addEventListener("pagehide", () => {
    note("pagehide");
  });
  window.addEventListener("beforeunload", () => {
    note("beforeunload");
  });

  const hot = import.meta.hot;
  if (hot) {
    hot.on("vite:beforeFullReload", () => {
      note("vite:beforeFullReload");
    });
  }
}
