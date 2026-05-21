// Interior layer: outer frame + paper cavity + pen channels + alignment pin holes + screw holes.
// Top interior layer also gets magnet pockets along the bottom (far edge from spine).

import { createBedSvg, kerfRect, kerfCircle, kerfSlot, spineScrewPositions, addGrainOverlay } from "../svg.js";
import { outerFootprint, cavityRect, PART_ORIGIN } from "./geometry.js";

export function buildInteriorLayer(params, layerIndex, { preview = true } = {}) {
  const { svg, cut, grain } = createBedSvg(params, { preview });
  const { outerW, outerD } = outerFootprint(params);
  const { x: ox, y: oy } = PART_ORIGIN;
  const isTop = layerIndex === params.interiorLayerCount - 1;
  const grow = layerIndex * params.interiorPocketGrowthPerLayer;

  // Outer perimeter
  cut.appendChild(kerfRect(ox, oy, outerW, outerD, params.kerf, "outer"));

  // Paper cavity
  const cav = cavityRect(params, grow);
  cut.appendChild(kerfRect(ox + cav.x, oy + cav.y, cav.w, cav.h, params.kerf, "hole"));

  // Pen channels along the bottom of the cavity
  if (params.penCount > 0) {
    const r = params.penDiameter / 2;
    const channelY = oy + cav.y + cav.h - params.penChannelInset;
    const spacing = cav.w / (params.penCount + 1);
    for (let i = 1; i <= params.penCount; i++) {
      cut.appendChild(kerfCircle(ox + cav.x + spacing * i, channelY, r, params.kerf, "hole"));
    }
  }

  // Alignment pins (bottom corners, away from spine)
  const apR = params.alignmentPinDiameter / 2;
  cut.appendChild(kerfCircle(ox + params.alignmentPinInsetX, oy + outerD - params.alignmentPinInsetY, apR, params.kerf, "hole"));
  cut.appendChild(kerfCircle(ox + outerW - params.alignmentPinInsetX, oy + outerD - params.alignmentPinInsetY, apR, params.kerf, "hole"));

  // Chicago screws along spine
  for (const { cx, cy } of spineScrewPositions({
    originX: ox, originY: oy,
    outerLong: outerW, outerShort: outerD,
    spineOffset: params.chicagoScrewSpineOffset,
    count: params.chicagoScrewCount,
    spineAxis: "long",
  })) {
    cut.appendChild(kerfCircle(cx, cy, params.chicagoScrewDiameter / 2, params.kerf, "hole"));
  }

  // Magnet pockets only on the top interior layer, along the far edge (bottom wall)
  if (isTop && params.magnetCount > 0) {
    const totalMagWidth = params.magnetCount * params.magnetWidth + (params.magnetCount - 1) * 10;
    const startX = ox + (outerW - totalMagWidth) / 2;
    const magY = oy + outerD - params.wallThickness / 2 - params.magnetHeight / 2;
    for (let i = 0; i < params.magnetCount; i++) {
      const mx = startX + i * (params.magnetWidth + 10);
      cut.appendChild(kerfSlot(mx, magY, params.magnetWidth, params.magnetHeight, params.kerf, "hole"));
    }
  }

  if (preview && params.showGrain) {
    addGrainOverlay(grain, { x: ox, y: oy, w: outerW, h: outerD, axis: "x" });
  }

  return { name: `interior-layer-${layerIndex + 1}${isTop ? "-top" : ""}`, svg };
}
