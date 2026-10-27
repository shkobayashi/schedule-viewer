import {
  HIERARCHY_GUIDE_LINE_STEP_PX,
  type HierarchyGuideSpec,
} from "../model/hierarchyGuide";

export function HierarchyGuideRail({ spec }: { spec: HierarchyGuideSpec }) {
  const lines: { index: number; full: boolean; half: boolean; stem: boolean }[] =
    [];
  for (const index of spec.fullVerticals) {
    lines.push({ index, full: true, half: false, stem: false });
  }
  for (const index of spec.halfVerticals) {
    lines.push({ index, full: false, half: true, stem: false });
  }
  if (spec.stemAt != null) {
    const existing = lines.find((line) => line.index === spec.stemAt);
    if (existing) {
      existing.stem = true;
    } else {
      lines.push({ index: spec.stemAt, full: false, half: false, stem: true });
    }
  }

  return (
    <div
      className="hierarchy-guide-rail"
      aria-hidden="true"
      style={{
        ["--guide-step" as string]: String(HIERARCHY_GUIDE_LINE_STEP_PX),
      }}
    >
      {lines.map((line) => (
        <span
          key={line.index}
          className={`hierarchy-guide-line${line.full ? " full" : ""}${line.half ? " half" : ""}${line.stem ? " stem" : ""}`}
          style={{ ["--guide-index" as string]: String(line.index) }}
        />
      ))}
      {spec.elbow ? (
        <span
          className="hierarchy-guide-elbow"
          style={{
            ["--guide-elbow-from" as string]: String(Math.max(0, spec.depth - 1)),
          }}
        />
      ) : null}
    </div>
  );
}
