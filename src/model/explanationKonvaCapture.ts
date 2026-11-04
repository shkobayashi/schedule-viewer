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
  const hidden: CaptureHandle[] = [];
  for (const handle of handles) {
    handle.hide();
    hidden.push(handle);
  }
  return () => {
    for (const handle of hidden) {
      handle.show();
    }
  };
}
