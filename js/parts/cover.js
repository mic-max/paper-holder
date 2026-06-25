// Front cover (book-style): matches the case footprint exactly. Within that footprint:
//   [ spine flap, width = spineSpacing ] | [ hinge band, width = hingeLength ] | [ lid panel, rest ]
// Height = outerD(base) (along the spine).
// The spine flap is screwed to the spine of the case; the hinge band lets the lid swing open.
// The two right-side corners (the opening) are rounded.

import {
  createBedSvg, kerfRoundedRect, kerfCircle,
  spineScrewPositions, addGrainOverlay, componentGroup, el,
} from "../svg.js";
import { outerFootprint, PART_ORIGIN } from "./geometry.js";
import { generateHinge } from "../hinge.js";

// Nominal chicago-screw head diameter (mm), drawn as a preview-only footprint so the
// head clearance can be eyeballed while adjusting the screw layout. Not exported.
const SCREW_HEAD_PREVIEW_DIAMETER = 12;

export function buildCover(params, { preview = true } = {}) {
  const { outerW, outerD } = outerFootprint(params);
  const { svg, cut, grain } = createBedSvg(params, { preview, partNaturalWidth: outerW, partNaturalHeight: outerD });
  const { x: ox, y: oy } = PART_ORIGIN;
  const r = params.openingCornerRadius;
  const sr = params.spineCornerRadius;

  // Outer perimeter (matches case footprint; rounded opening + small spine roundover)
  componentGroup(cut, "perimeter").appendChild(
    kerfRoundedRect(ox, oy, outerW, outerD, params.kerf, "outer", { tr: r, br: r, tl: sr, bl: sr })
  );

  // Chicago screws in the spine flap (centered on the spine flap width)
  const screws = componentGroup(cut, "screws");
  const screwPositions = spineScrewPositions({
    originX: ox, originY: oy,
    outerLong: params.spineSpacing, outerShort: outerD,
    spineOffset: params.spineSpacing / 2,
    count: params.chicagoScrewCount,
    endInset: params.chicagoScrewEndInset,
    spineAxis: "left",
  });
  for (const { cx, cy } of screwPositions) {
    screws.appendChild(kerfCircle(cx, cy, params.chicagoScrewDiameter / 2, params.kerf, "hole"));
  }

  // Hinge band: vertical strip between spine flap and lid.
  const hingeG = componentGroup(cut, "hinge");
  const hingeArea = {
    x: ox + params.spineSpacing,
    y: oy,
    w: params.hingeLength,
    h: outerD,
  };
  for (const node of generateHinge(params.hingeStyle, hingeArea, params)) {
    hingeG.appendChild(node);
  }

  if (preview) {
    // Screw-head footprint circles (preview only; class "guide" is stripped on export).
    // Translucent fill + bold dashed stroke so the head size reads clearly at preview zoom.
    for (const { cx, cy } of screwPositions) {
      screws.appendChild(el("circle", {
        cx, cy, r: SCREW_HEAD_PREVIEW_DIAMETER / 2,
        fill: "#888888", "fill-opacity": 0.18,
        stroke: "#555555", "stroke-width": 0.6, "stroke-dasharray": "2 1.2",
        class: "guide",
      }));
    }

    // Dashed guides marking the spine-flap / hinge / lid boundaries
    const guideStyle = { stroke: "#bbbbbb", "stroke-width": 0.3, "stroke-dasharray": "1 1", class: "guide" };
    cut.appendChild(el("line", { x1: ox + params.spineSpacing, y1: oy, x2: ox + params.spineSpacing, y2: oy + outerD, ...guideStyle }));
    cut.appendChild(el("line", { x1: ox + params.spineSpacing + params.hingeLength, y1: oy, x2: ox + params.spineSpacing + params.hingeLength, y2: oy + outerD, ...guideStyle }));
  }

  if (preview && params.showGrain) {
    addGrainOverlay(grain, { x: ox, y: oy, w: outerW, h: outerD, axis: "y" });
  }

  return { name: "front-cover", svg };
}
