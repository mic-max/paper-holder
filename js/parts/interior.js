// Interior layer (book-style: spine on left).
//   - Outer perimeter
//   - Paper cavity (portrait)
//   - Pen channels along the bottom of the cavity
//   - Alignment pin holes near the right edge (away from spine)
//   - Chicago screws down the left spine
//   - Top interior layer also gets magnet pockets along the right wall (closure edge)

import { createBedSvg, kerfRect, kerfCircle, kerfSlot, spineScrewPositions, addGrainOverlay } from "../svg.js";
import { outerFootprint, cavityRect, PART_ORIGIN } from "./geometry.js";

export function buildInteriorLayer(params, layerIndex, { preview = true } = {}) {
  const { outerW, outerD } = outerFootprint(params);
  const { svg, cut, grain } = createBedSvg(params, { preview, partNaturalHeight: outerD });
  const { x: ox, y: oy } = PART_ORIGIN;
  const isTop = layerIndex === params.interiorLayerCount - 1;
  const grow = layerIndex * params.interiorPocketGrowthPerLayer;

  // Outer perimeter
  cut.appendChild(kerfRect(ox, oy, outerW, outerD, params.kerf, "outer"));

  // Paper cavity
  const cav = cavityRect(params, grow);
  cut.appendChild(kerfRect(ox + cav.x, oy + cav.y, cav.w, cav.h, params.kerf, "hole"));

  // Pen channels along the bottom of the cavity (distributed across cavity width)
  if (params.penCount > 0) {
    const r = params.penDiameter / 2;
    const channelY = oy + cav.y + cav.h - params.penChannelInset;
    const spacing = cav.w / (params.penCount + 1);
    for (let i = 1; i <= params.penCount; i++) {
      cut.appendChild(kerfCircle(ox + cav.x + spacing * i, channelY, r, params.kerf, "hole"));
    }
  }

  // Alignment pins on the far side (right edge, top and bottom corners)
  const apR = params.alignmentPinDiameter / 2;
  cut.appendChild(kerfCircle(ox + outerW - params.alignmentPinInsetX, oy + params.alignmentPinInsetY, apR, params.kerf, "hole"));
  cut.appendChild(kerfCircle(ox + outerW - params.alignmentPinInsetX, oy + outerD - params.alignmentPinInsetY, apR, params.kerf, "hole"));

  // Chicago screws down the left spine
  for (const { cx, cy } of spineScrewPositions({
    originX: ox, originY: oy,
    outerLong: outerW, outerShort: outerD,
    spineOffset: params.chicagoScrewSpineOffset,
    count: params.chicagoScrewCount,
    spineAxis: "left",
  })) {
    cut.appendChild(kerfCircle(cx, cy, params.chicagoScrewDiameter / 2, params.kerf, "hole"));
  }

  // Magnet pockets on the top interior layer along the right wall (closure edge)
  if (isTop && params.magnetCount > 0) {
    const gap = 10;
    const totalMagHeight = params.magnetCount * params.magnetHeight + (params.magnetCount - 1) * gap;
    const startY = oy + (outerD - totalMagHeight) / 2;
    const magX = ox + outerW - params.wallThickness / 2 - params.magnetWidth / 2;
    for (let i = 0; i < params.magnetCount; i++) {
      const my = startY + i * (params.magnetHeight + gap);
      cut.appendChild(kerfSlot(magX, my, params.magnetWidth, params.magnetHeight, params.kerf, "hole"));
    }
  }

  if (preview && params.showGrain) {
    addGrainOverlay(grain, { x: ox, y: oy, w: outerW, h: outerD, axis: "y" });
  }

  return { name: `interior-layer-${layerIndex + 1}${isTop ? "-top" : ""}`, svg };
}
