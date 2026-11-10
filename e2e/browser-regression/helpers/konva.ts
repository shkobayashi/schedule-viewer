import type { Page } from "playwright/test";

export type KonvaProbeResult = {
  readable: boolean;
  dragDateTexts?: string[];
  barY?: number;
};

let konvaCapability: KonvaProbeResult | null = null;

export function getKonvaCapability(): KonvaProbeResult | null {
  return konvaCapability;
}

export function setKonvaCapability(result: KonvaProbeResult): void {
  konvaCapability = result;
  process.env.SCHEDULE_VIEWER_KONVA_READABLE = result.readable ? "1" : "0";
}

const collectKonvaStagesSource = `(() => {
  const globalKonva = window.Konva;
  if (globalKonva && globalKonva.stages && globalKonva.stages.length) {
    return globalKonva.stages;
  }
  const stages = [];
  for (const canvas of document.querySelectorAll("canvas")) {
    if (canvas.konvaStage) stages.push(canvas.konvaStage);
    const internal = canvas._canvas;
    const fromInternal = internal && (internal.getStage ? internal.getStage() : internal.stage);
    if (fromInternal) stages.push(fromInternal);
  }
  return stages;
})()`;

export async function probeKonvaReadable(page: Page): Promise<KonvaProbeResult> {
  const evaluated = await page.evaluate((collector) => {
    const stages = eval(collector) as KonvaStageLike[];
    if (stages.length === 0) {
      return { readable: false as const };
    }

    const dragDateTexts: string[] = [];
    let barY: number | undefined;

    for (const stage of stages) {
      const textNodes = stage.find?.("Text") ?? [];
      for (const node of textNodes) {
        const text = node.text?.() ?? "";
        if (/\d+\/\d+/.test(text)) dragDateTexts.push(text);
      }
      const rects = stage.find?.("Rect") ?? [];
      for (const rect of rects) {
        const w = rect.width?.() ?? 0;
        const h = rect.height?.() ?? 0;
        if (w > 20 && h > 4 && h < 24) {
          const y = rect.y?.();
          if (typeof y === "number") barY = y;
        }
      }
    }

    return {
      readable: true as const,
      dragDateTexts: dragDateTexts.length ? dragDateTexts : undefined,
      barY,
    };
  }, collectKonvaStagesSource);

  return evaluated;
}

type KonvaStageLike = {
  find?: (selector: string) => Array<{
    text?: () => string;
    width?: () => number;
    height?: () => number;
    y?: () => number;
  }>;
};
