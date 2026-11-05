import type Konva from "konva";
import { RESIZE_EXCLUSIVE_OUTSIDE_PX, TASK_HANDLE_WIDTH } from "../../model/chartHitTest";

export const TASK_BAR_HANDLE_WIDTH = TASK_HANDLE_WIDTH;

export function exclusiveResizeHit(
  barHeight: number,
  handleY: number,
  intoBar: 1 | -1,
  inside: number,
) {
  return (context: Konva.Context, shape: Konva.Shape) => {
    const edge = shape.width() / 2;
    const outside = RESIZE_EXCLUSIVE_OUTSIDE_PX;
    const start = intoBar === 1 ? edge - outside : edge - inside;
    context.beginPath();
    context.rect(start, -handleY, outside + inside, barHeight);
    context.closePath();
    context.fillStrokeShape(shape);
  };
}

export function swallowResizeClick(
  e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
) {
  e.cancelBubble = true;
}
