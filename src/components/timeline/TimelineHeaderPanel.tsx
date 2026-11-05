import type { ReactNode } from "react";
import { Layer, Stage } from "react-konva";
import type Konva from "konva";
import { ExplanationKonvaVeilLayer } from "../ExplanationKonvaVeil";
import { TimelineExplanationBalloons } from "../TimelineExplanationBalloons";
import type { ResolvedColorScheme } from "../../model/palette";
import type {
  ExplanationBalloonLayout,
  ExplanationMarkHole,
} from "../../model/explainOverlayLayout";

export type TimelineHeaderPanelProps = {
  width: number;
  headerHeight: number;
  headerContent: ReactNode;
  linkMode: boolean;
  explanationActive: boolean;
  colorScheme: ResolvedColorScheme;
  headerHoles: readonly ExplanationMarkHole[];
  headerBalloons: readonly ExplanationBalloonLayout[];
  onWheelHeader: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onAddMilestoneContextMenu: (
    chartX: number,
    clientX: number,
    clientY: number,
  ) => void;
};

/** チャート上部の日付ヘッダー Stage。 */
export function TimelineHeaderPanel({
  width,
  headerHeight,
  headerContent,
  linkMode,
  explanationActive,
  colorScheme,
  headerHoles,
  headerBalloons,
  onWheelHeader,
  onAddMilestoneContextMenu,
}: TimelineHeaderPanelProps) {
  return (
    <div className="timeline-header">
      <Stage
        width={width}
        height={headerHeight}
        onWheel={onWheelHeader}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          if (linkMode) return;
          const pos = e.target.getStage()?.getPointerPosition();
          if (!pos) return;
          onAddMilestoneContextMenu(pos.x, e.evt.clientX, e.evt.clientY);
        }}
      >
        <Layer>{headerContent}</Layer>
        {explanationActive ? (
          <ExplanationKonvaVeilLayer
            width={width}
            height={headerHeight}
            holes={headerHoles}
            colorScheme={colorScheme}
          />
        ) : null}
      </Stage>
      {explanationActive ? (
        <TimelineExplanationBalloons balloons={headerBalloons} />
      ) : null}
    </div>
  );
}
