// Back panel: solid rectangle with chicago screw holes down the left spine.
// Two right-side corners (the opening, opposite the spine) are rounded.

import {
  createBedSvg, kerfRoundedRect, kerfCircle,
  spineScrewPositions, addGrainOverlay, componentGroup,
} from "../svg.js";
import { outerFootprint, PART_ORIGIN } from "./geometry.js";

export function buildBack(params, { preview = true } = {}) {
  const { outerW, outerD } = outerFootprint(params);
  const { svg, cut, grain } = createBedSvg(params, { preview, partNaturalWidth: outerW, partNaturalHeight: outerD });
  const { x: ox, y: oy } = PART_ORIGIN;
  const r = params.openingCornerRadius;
  const sr = params.spineCornerRadius;

  componentGroup(cut, "perimeter").appendChild(
    kerfRoundedRect(ox, oy, outerW, outerD, params.kerf, "outer", { tr: r, br: r, tl: sr, bl: sr })
  );

  const screws = componentGroup(cut, "screws");
  for (const { cx, cy } of spineScrewPositions({
    originX: ox, originY: oy,
    outerLong: outerW, outerShort: outerD,
    spineOffset: params.spineSpacing / 2,
    count: params.chicagoScrewCount,
    endInset: params.chicagoScrewEndInset,
    spineAxis: "left",
  })) {
    screws.appendChild(kerfCircle(cx, cy, params.chicagoScrewDiameter / 2, params.kerf, "hole"));
  }

  if (preview && params.showGrain) {
    addGrainOverlay(grain, { x: ox, y: oy, w: outerW, h: outerD, axis: "y" });
  }

  return { name: "back-panel", svg };
}
