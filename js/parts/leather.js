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
  createBedSvg, kerfRect, kerfCircle, addGrainOverlay, componentGroup,
} from "../svg.js";
import { outerFootprint, PART_ORIGIN } from "./geometry.js";

export function buildLeatherSpine(params, { preview = true } = {}) {
  const { outerD } = outerFootprint(params);
  const stackThickness = (params.interiorLayerCount + 2) * params.materialThickness;
  const wrapZone = stackThickness + params.leatherWrapAllowance;
  const leatherWidth = 2 * params.spineSpacing + wrapZone;
  const leatherLength = outerD;

  const { svg, cut, grain } = createBedSvg(params, { preview, partNaturalWidth: leatherWidth, partNaturalHeight: leatherLength });
  const { x: ox, y: oy } = PART_ORIGIN;

  // Outer rectangle
  componentGroup(cut, "leather").appendChild(
    kerfRect(ox, oy, leatherWidth, leatherLength, params.kerf, "outer")
  );

  // Screw holes: matching the case screw y-distribution, mirrored across the wrap.
  // On the case, screws sit at chicagoScrewSpineOffset measured from the spine edge.
  // On flap A, the spine-edge corresponds to leather_x = spineSpacing (where wrap starts),
  // and we move inward by chicagoScrewSpineOffset to reach the screw position.
  // Flap B mirrors that distance from the opposite outer edge.
  const flapAx = params.spineSpacing - params.chicagoScrewSpineOffset;
  const flapBx = leatherWidth - flapAx;
  const holeR = params.chicagoScrewDiameter / 2;
  const screws = componentGroup(cut, "screws");

  const count = Math.max(1, params.chicagoScrewCount);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const tt = 0.15 + 0.7 * t; // same 15% inset from each end as the case
    const cy = oy + leatherLength * tt;
    screws.appendChild(kerfCircle(ox + flapAx, cy, holeR, params.kerf, "hole"));
    screws.appendChild(kerfCircle(ox + flapBx, cy, holeR, params.kerf, "hole"));
  }

  if (preview && params.showGrain) {
    addGrainOverlay(grain, { x: ox, y: oy, w: leatherWidth, h: leatherLength, axis: "y" });
  }

  return { name: "leather-spine", svg };
}
