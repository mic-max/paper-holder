// Leather spine: a flat strip that wraps around the spine edge of the closed case,
// sandwiched against the cover and back panel by the chicago screws.
//
// Flat layout (length along +y = along the case spine):
//   [ flap A | wrap zone | flap B ]
// width along +x; total width = 2*spineSpacing + (stack thickness + leatherWrapAllowance).
// Flap A sits on the cover, flap B sits on the back panel; the wrap zone wraps the spine edge.
// Each chicago screw passes through the leather twice (once per flap), so we punch
// 2 * chicagoScrewCount holes mirrored about the leather's midline.

import {
  createBedSvg, kerfRect, kerfCircle, addScrewHeadGuides, componentGroup, el,
} from "../svg.js";
import { outerFootprint, PART_ORIGIN } from "./geometry.js";
import { stackThickness } from "../params.js";

export function buildLeatherSpine(params, { preview = true } = {}) {
  const { outerD } = outerFootprint(params);
  const wrapZone = stackThickness(params) + params.leatherWrapAllowance;
  const leatherWidth = 2 * params.spineSpacing + wrapZone;
  const leatherLength = outerD;

  const { svg, cut, etch } = createBedSvg(params, { preview, partNaturalWidth: leatherWidth, partNaturalHeight: leatherLength });
  const { x: ox, y: oy } = PART_ORIGIN;

  // Outer rectangle
  componentGroup(cut, "leather").appendChild(
    kerfRect(ox, oy, leatherWidth, leatherLength, params.kerf, "outer")
  );

  // Screw holes: matching the case screw y-distribution, mirrored across the wrap.
  // On the case, screws are centered on the spine flap (spineSpacing/2 from the spine edge),
  // so flap A's screw sits at the center of its spineSpacing-wide band.
  // Flap B mirrors that distance from the opposite outer edge.
  const flapAx = params.spineSpacing / 2;
  const flapBx = leatherWidth - flapAx;
  const holeR = params.chicagoScrewDiameter / 2;
  const screws = componentGroup(cut, "screws");

  const count = Math.max(1, params.chicagoScrewCount);
  const endInset = params.chicagoScrewEndInset;
  const span = Math.max(0, leatherLength - 2 * endInset);
  const headPositions = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const cy = oy + endInset + span * t;
    screws.appendChild(kerfCircle(ox + flapAx, cy, holeR, params.kerf, "hole"));
    screws.appendChild(kerfCircle(ox + flapBx, cy, holeR, params.kerf, "hole"));
    headPositions.push({ cx: ox + flapAx, cy }, { cx: ox + flapBx, cy });
  }

  // Bolt-head footprint rings (preview only; class "guide" is stripped on export) so the
  // spacing/clearance is visible. Grain overlay is intentionally omitted for leather.
  if (preview) addScrewHeadGuides(screws, headPositions);

  // Etched name: runs along the long axis (rotated 90°), centered along the length and
  // horizontally between the two screw columns (i.e. centered in the wrap zone). Height
  // tracks the plywood stack thickness (the spine depth), clamped to the wrap zone.
  const text = String(params.leatherEtchText || "").trim();
  if (params.leatherEtch && text) {
    const cx = ox + leatherWidth / 2;
    const cy = oy + leatherLength / 2;
    const fontSize = Math.min(stackThickness(params), wrapZone);
    const label = el("text", {
      x: cx, y: cy,
      "text-anchor": "middle", "dominant-baseline": "central",
      "font-size": fontSize, "font-family": "serif",
      fill: params.etchColor, stroke: "none",
      transform: `rotate(90 ${cx} ${cy})`,
    });
    label.textContent = text.toUpperCase();
    etch.appendChild(label);
  }

  return { name: "leather-spine", svg };
}
