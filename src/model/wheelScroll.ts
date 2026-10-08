export type WheelScrollZone = "body" | "header";

export type WheelScrollInput = {
  deltaX: number;
  deltaY: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  zone: WheelScrollZone;
};

export type WheelScrollEffect =
  | { type: "zoom"; factor: number }
  | { type: "scroll"; deltaScrollX: number; deltaScrollY: number };

/** Shift でブラウザが軸を入れ替えたとき、同じ移動を二度足ししない。 */
export function isShiftAxisSwap(
  shiftKey: boolean,
  deltaX: number,
  deltaY: number,
): boolean {
  if (!shiftKey) return false;
  if (deltaY === 0 && deltaX !== 0) return true;
  if (deltaX !== 0 && deltaX === deltaY) return true;
  return false;
}

function horizontalOnceOnShiftSwap(deltaX: number, deltaY: number): number {
  if (deltaY === 0) return deltaX;
  return deltaY;
}

export function resolveWheelScroll(input: WheelScrollInput): WheelScrollEffect {
  const { deltaX, deltaY, shiftKey, ctrlKey, metaKey, zone } = input;

  if (ctrlKey || metaKey) {
    const factor = deltaY < 0 ? 1.15 : 1 / 1.15;
    return { type: "zoom", factor };
  }

  const swapped = isShiftAxisSwap(shiftKey, deltaX, deltaY);

  if (zone === "header") {
    let deltaScrollX: number;
    if (swapped) {
      deltaScrollX = horizontalOnceOnShiftSwap(deltaX, deltaY);
    } else {
      deltaScrollX = deltaY + deltaX;
    }
    return { type: "scroll", deltaScrollX, deltaScrollY: 0 };
  }

  if (shiftKey) {
    const deltaScrollX = swapped
      ? horizontalOnceOnShiftSwap(deltaX, deltaY)
      : deltaY;
    return { type: "scroll", deltaScrollX, deltaScrollY: 0 };
  }

  return {
    type: "scroll",
    deltaScrollX: deltaX,
    deltaScrollY: deltaY,
  };
}
