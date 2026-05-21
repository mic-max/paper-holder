// Back panel: solid rectangle with chicago screw holes near the spine.

import { createBedSvg, kerfRect, kerfCircle, spineScrewPositions, addGrainOverlay } from "../svg.js";
import { outerFootprint, PART_ORIGIN } from "./geometry.js";

export function buildBack(params, { preview = true } = {}) {
  const { svg, cut, grain } = createBedSvg(params, { preview });
  const { outerW, outerD } = outerFootprint(params);
  const { x: ox, y: oy } = PART_ORIGIN;

  cut.appendChild(kerfRect(ox, oy, outerW, outerD, params.kerf, "outer"));

  for (const { cx, cy } of spineScrewPositions({
    originX: ox, originY: oy,
    outerLong: outerW, outerShort: outerD,
    spineOffset: params.chicagoScrewSpineOffset,
    count: params.chicagoScrewCount,
    spineAxis: "long",
  })) {
    cut.appendChild(kerfCircle(cx, cy, params.chicagoScrewDiameter / 2, params.kerf, "hole"));
  }

  if (preview && params.showGrain) {
    addGrainOverlay(grain, { x: ox, y: oy, w: outerW, h: outerD, axis: "x" });
  }

  return { name: "back-panel", svg };
}
