type CaptureHandle = {
  hide: () => void;
  show: () => void;
};

const handles = new Set<CaptureHandle>();

export function registerExplanationKonvaCapture(handle: CaptureHandle): () => void {
  handles.add(handle);
  return () => {
    handles.delete(handle);
  };
}

export function hideExplanationKonvaLayersForCapture(): () => void {
  for (const handle of handles) {
    handle.hide();
  }
  return () => {
    for (const handle of handles) {
      handle.show();
    }
  };
}
