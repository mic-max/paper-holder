// Front cover: spine flap + living-hinge band + lid panel, all one flat piece.
// Layout along +y:  [spineSpacing band, screws] | [hingeLength band, slits] | [outerD lid].
// Width along +x: outerW (matches base footprint).

import { createBedSvg, kerfRect, kerfCircle, spineScrewPositions, addGrainOverlay, el } from "../svg.js";
import { outerFootprint, PART_ORIGIN } from "./geometry.js";
import { generateHinge } from "../hinge.js";

export function buildCover(params, { preview = true } = {}) {
  const { svg, cut, grain } = createBedSvg(params, { preview });
  const { outerW, outerD } = outerFootprint(params);
  const { x: ox, y: oy } = PART_ORIGIN;

  const coverH = params.spineSpacing + params.hingeLength + outerD;

  // Outer perimeter
  cut.appendChild(kerfRect(ox, oy, outerW, coverH, params.kerf, "outer"));

  // Chicago screws in the spine flap (top band of height = spineSpacing)
  for (const { cx, cy } of spineScrewPositions({
    originX: ox, originY: oy,
    outerLong: outerW, outerShort: params.spineSpacing,
    spineOffset: params.chicagoScrewSpineOffset,
    count: params.chicagoScrewCount,
    spineAxis: "long",
  })) {
    cut.appendChild(kerfCircle(cx, cy, params.chicagoScrewDiameter / 2, params.kerf, "hole"));
  }

  // Hinge band
  const hingeArea = {
    x: ox,
    y: oy + params.spineSpacing,
    w: outerW,
    h: params.hingeLength,
  };
  for (const node of generateHinge(params.hingeStyle, hingeArea, params)) {
    cut.appendChild(node);
  }

  if (preview) {
    // Light dashed guides showing the hinge band boundaries (preview only)
    cut.appendChild(el("line", {
      x1: ox, y1: oy + params.spineSpacing, x2: ox + outerW, y2: oy + params.spineSpacing,
      stroke: "#bbbbbb", "stroke-width": 0.3, "stroke-dasharray": "1 1", class: "guide",
    }));
    cut.appendChild(el("line", {
      x1: ox, y1: oy + params.spineSpacing + params.hingeLength, x2: ox + outerW, y2: oy + params.spineSpacing + params.hingeLength,
      stroke: "#bbbbbb", "stroke-width": 0.3, "stroke-dasharray": "1 1", class: "guide",
    }));
  }

  if (preview && params.showGrain) {
    // Grain must run parallel to the hinge slits, i.e. along +y (across the hinge).
    addGrainOverlay(grain, { x: ox, y: oy, w: outerW, h: coverH, axis: "y" });
  }

  return { name: "front-cover", svg };
}
