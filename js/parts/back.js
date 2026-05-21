// Back panel: solid rectangle with chicago screw holes down the left spine.

import { createBedSvg, kerfRect, kerfCircle, spineScrewPositions, addGrainOverlay } from "../svg.js";
import { outerFootprint, PART_ORIGIN } from "./geometry.js";

export function buildBack(params, { preview = true } = {}) {
  const { outerW, outerD } = outerFootprint(params);
  const { svg, cut, grain } = createBedSvg(params, { preview, partNaturalHeight: outerD });
  const { x: ox, y: oy } = PART_ORIGIN;

  cut.appendChild(kerfRect(ox, oy, outerW, outerD, params.kerf, "outer"));

  // Screws arrayed vertically along the left spine edge
  for (const { cx, cy } of spineScrewPositions({
    originX: ox, originY: oy,
    outerLong: outerW, outerShort: outerD,
    spineOffset: params.chicagoScrewSpineOffset,
    count: params.chicagoScrewCount,
    spineAxis: "left",
  })) {
    cut.appendChild(kerfCircle(cx, cy, params.chicagoScrewDiameter / 2, params.kerf, "hole"));
  }

  if (preview && params.showGrain) {
    addGrainOverlay(grain, { x: ox, y: oy, w: outerW, h: outerD, axis: "y" });
  }

  return { name: "back-panel", svg };
}
