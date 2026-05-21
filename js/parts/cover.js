// Front cover (book-style): matches the case footprint exactly. Within that footprint:
//   [ spine flap, width = spineSpacing ] | [ hinge band, width = hingeLength ] | [ lid panel, rest ]
// Height = outerD(base) (along the spine).
// The spine flap is screwed to the spine of the case; the hinge band lets the lid swing open.

import { createBedSvg, kerfRect, kerfCircle, spineScrewPositions, addGrainOverlay, el } from "../svg.js";
import { outerFootprint, PART_ORIGIN } from "./geometry.js";
import { generateHinge } from "../hinge.js";

export function buildCover(params, { preview = true } = {}) {
  const { outerW, outerD } = outerFootprint(params);
  const { svg, cut, grain } = createBedSvg(params, { preview, partNaturalHeight: outerD });
  const { x: ox, y: oy } = PART_ORIGIN;

  const coverW = outerW;

  // Outer perimeter (same footprint as the case)
  cut.appendChild(kerfRect(ox, oy, coverW, outerD, params.kerf, "outer"));

  // Chicago screws in the spine flap (leftmost band, width = spineSpacing)
  for (const { cx, cy } of spineScrewPositions({
    originX: ox, originY: oy,
    outerLong: params.spineSpacing, outerShort: outerD,
    spineOffset: params.chicagoScrewSpineOffset,
    count: params.chicagoScrewCount,
    spineAxis: "left",
  })) {
    cut.appendChild(kerfCircle(cx, cy, params.chicagoScrewDiameter / 2, params.kerf, "hole"));
  }

  // Hinge band: vertical strip between spine flap and lid. Bend axis is vertical (along y),
  // so slits should run parallel to y. The hinge module places slits along its area's longer axis.
  const hingeArea = {
    x: ox + params.spineSpacing,
    y: oy,
    w: params.hingeLength,
    h: outerD,
  };
  for (const node of generateHinge(params.hingeStyle, hingeArea, params)) {
    cut.appendChild(node);
  }

  if (preview) {
    // Dashed guides marking the spine-flap / hinge / lid boundaries
    const guideStyle = { stroke: "#bbbbbb", "stroke-width": 0.3, "stroke-dasharray": "1 1", class: "guide" };
    cut.appendChild(el("line", { x1: ox + params.spineSpacing, y1: oy, x2: ox + params.spineSpacing, y2: oy + outerD, ...guideStyle }));
    cut.appendChild(el("line", { x1: ox + params.spineSpacing + params.hingeLength, y1: oy, x2: ox + params.spineSpacing + params.hingeLength, y2: oy + outerD, ...guideStyle }));
  }

  if (preview && params.showGrain) {
    // Grain runs along the slit direction = vertical (along y)
    addGrainOverlay(grain, { x: ox, y: oy, w: coverW, h: outerD, axis: "y" });
  }

  return { name: "front-cover", svg };
}
