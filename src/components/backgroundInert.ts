let backgroundInertDepth = 0;

export function acquireBackgroundInert(): () => void {
  backgroundInertDepth += 1;
  document.getElementById("root")?.setAttribute("inert", "");
  return () => {
    backgroundInertDepth = Math.max(0, backgroundInertDepth - 1);
    if (backgroundInertDepth === 0) {
      document.getElementById("root")?.removeAttribute("inert");
    }
  };
}
