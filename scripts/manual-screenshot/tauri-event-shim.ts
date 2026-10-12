type EventHandler<T> = (event: { payload: T }) => void;

const listeners = new Map<string, Set<EventHandler<unknown>>>();

export async function listen<T>(
  event: string,
  handler: EventHandler<T>,
): Promise<() => void> {
  const set = listeners.get(event) ?? new Set();
  set.add(handler as EventHandler<unknown>);
  listeners.set(event, set);
  return () => {
    set.delete(handler as EventHandler<unknown>);
  };
}

export function emitManualScreenshotEvent<T>(event: string, payload: T): void {
  const set = listeners.get(event);
  if (!set) return;
  for (const handler of set) {
    handler({ payload });
  }
}

declare global {
  interface Window {
    __emitManualScreenshotEvent?: typeof emitManualScreenshotEvent;
  }
}

if (typeof window !== "undefined") {
  window.__emitManualScreenshotEvent = emitManualScreenshotEvent;
}
