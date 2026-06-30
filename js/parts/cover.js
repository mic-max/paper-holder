// Front cover (book-style): matches the case footprint exactly. Within that footprint:
//   [ spine flap, width = spineSpacing ] | [ hinge band, width = hingeLength ] | [ lid panel, rest ]
// Height = outerD(base) (along the spine).
// The spine flap is screwed to the spine of the case; the hinge band lets the lid swing open.
// The two right-side corners (the opening) are rounded.

import {
  createBedSvg, kerfRoundedRect, kerfCircle,
  spineScrewPositions, addGrainOverlay, addScrewHeadGuides, componentGroup, el,
} from "../svg.js";
import { outerFootprint, PART_ORIGIN } from "./geometry.js";
import { generateHinge } from "../hinge.js";
import { CRANE } from "../assets/crane.js";

export function buildCover(params, { preview = true } = {}) {
  const { outerW, outerD } = outerFootprint(params);
  const { svg, cut, etch, grain } = createBedSvg(params, { preview, partNaturalWidth: outerW, partNaturalHeight: outerD });
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
  // Track the rightmost x of any hinge kerf as we add the slits (robust to hinge style).
  const hingeNodes = generateHinge(params.hingeStyle, hingeArea, params);
  let hingeMaxX = hingeArea.x;
  for (const node of hingeNodes) {
    for (const attr of ["x1", "x2", "x"]) {
      const v = Number(node.getAttribute(attr));
      if (Number.isFinite(v)) hingeMaxX = Math.max(hingeMaxX, v);
    }
    hingeG.appendChild(node);
  }

  // Crane etch on the lid: centered vertically, and horizontally between the rightmost
  // hinge kerf and the opening (right) edge. Scaled to coverEtchHeight, clamped to fit.
  if (params.coverEtch && params.coverEtchHeight > 0) {
    const openingEdgeX = ox + outerW;
    const centerX = (hingeMaxX + openingEdgeX) / 2;
    const centerY = oy + outerD / 2;
    const fitS = Math.min((openingEdgeX - hingeMaxX) / CRANE.width, outerD / CRANE.height);
    const s = Math.min(params.coverEtchHeight / CRANE.height, fitS);
    if (s > 0) {
      const tx = centerX - s * (CRANE.width / 2);
      const ty = centerY - s * (CRANE.height / 2);
      const transform = `translate(${tx} ${ty}) scale(${s})`;
      // Filled silhouette, or outline only. For the outline, divide the width by s so
      // the on-cover stroke matches the param in mm despite the group's scale transform.
      const craneG = el("g", params.coverEtchFilled
        ? { fill: params.etchColor, stroke: "none", transform }
        : {
            fill: "none",
            stroke: params.etchColor,
            "stroke-width": params.coverEtchStrokeWidth / s,
            "stroke-linejoin": "round",
            "stroke-linecap": "round",
            transform,
          });
      for (const d of CRANE.paths) craneG.appendChild(el("path", { d }));
      etch.appendChild(craneG);
    }
  }

  if (preview) {
    // Screw-head footprint circles (preview only; class "guide" is stripped on export).
    addScrewHeadGuides(screws, screwPositions);

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
