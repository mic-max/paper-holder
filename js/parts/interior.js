// Interior layer (book-style: spine on left).
//   - Outer perimeter with rounded right corners + thumb relief in the right edge
//   - Paper cavity (portrait)
//   - Two colinear pen pockets in the right buffer zone, vertically centered, with a gap
//   - Chicago screws down the left spine
//   - Top interior layer also gets two magnet pockets nestled in the right rounded corners

import {
  createBedSvg, kerfRect, kerfRoundedRect, kerfCircle, caseOuterPath,
  spineScrewPositions, addGrainOverlay, componentGroup,
} from "../svg.js";
import { outerFootprint, cavityRect, PART_ORIGIN } from "./geometry.js";

export function buildInteriorLayer(params, layerIndex, { preview = true } = {}) {
  const { outerW, outerD } = outerFootprint(params);
  const { svg, cut, grain } = createBedSvg(params, { preview, partNaturalWidth: outerW, partNaturalHeight: outerD });
  const { x: ox, y: oy } = PART_ORIGIN;
  const isTop = layerIndex === params.interiorLayerCount - 1;
  const grow = layerIndex * params.interiorPocketGrowthPerLayer;
  const r = params.openingCornerRadius;
  const sr = params.spineCornerRadius;

  // Outer perimeter with rounded opening corners, spine-edge roundover, and thumb relief
  componentGroup(cut, "perimeter").appendChild(
    caseOuterPath(ox, oy, outerW, outerD, params.kerf, "outer", {
      tr: r, br: r, tl: sr, bl: sr,
      thumbReliefHeight: params.thumbReliefHeight,
      thumbReliefDepth: params.thumbReliefDepth,
    })
  );

  // Paper cavity
  const cav = cavityRect(params, grow);
  componentGroup(cut, "cavity").appendChild(
    kerfRect(ox + cav.x, oy + cav.y, cav.w, cav.h, params.kerf, "hole")
  );

  // Pen pockets: two colinear rounded rectangles in the right buffer zone
  {
    const pens = componentGroup(cut, "pens");
    const cxBuffer = outerW - params.openingBufferWidth / 2;
    const pocketX = cxBuffer - params.penPocketWidth / 2;
    const totalH = 2 * params.penPocketLength + params.penPocketGap;
    const startY = (outerD - totalH) / 2;
    for (let i = 0; i < 2; i++) {
      const py = startY + i * (params.penPocketLength + params.penPocketGap);
      pens.appendChild(kerfRoundedRect(
        ox + pocketX, oy + py,
        params.penPocketWidth, params.penPocketLength,
        params.kerf, "hole",
        { tl: params.penPocketCornerRadius, tr: params.penPocketCornerRadius,
          bl: params.penPocketCornerRadius, br: params.penPocketCornerRadius },
      ));
    }
  }

  // Chicago screws down the left spine
  const screws = componentGroup(cut, "screws");
  for (const { cx, cy } of spineScrewPositions({
    originX: ox, originY: oy,
    outerLong: outerW, outerShort: outerD,
    spineOffset: params.chicagoScrewSpineOffset,
    count: params.chicagoScrewCount,
    endInset: params.chicagoScrewEndInset,
    spineAxis: "left",
  })) {
    screws.appendChild(kerfCircle(cx, cy, params.chicagoScrewDiameter / 2, params.kerf, "hole"));
  }

  // Magnets nest in the top-right and bottom-right rounded corners.
  // The magnet's outer corner is offset from the part's notional corner by
  // (openingCornerRadius + magnetCornerPadding) on each axis -- placing it
  // cleanly inside the area beyond the rounded arc with the requested padding.
  // Magnet centers sit on the diagonal from each rounded-corner arc center,
  // offset by `d = r - magR - magnetCornerPadding`. With padding=0 the magnet
  // is tangent to the corner arc; positive padding pulls it inward radially.
  if (isTop) {
    const magnets = componentGroup(cut, "magnets");
    const magR = params.magnetDiameter / 2;
    const d = r - magR - params.magnetCornerPadding;
    const k = 1 / Math.SQRT2;
    const trArc = { x: outerW - r, y: r };          // top-right arc center
    const brArc = { x: outerW - r, y: outerD - r }; // bottom-right arc center
    const tr = { cx: trArc.x + d * k, cy: trArc.y - d * k };
    const br = { cx: brArc.x + d * k, cy: brArc.y + d * k };
    for (const { cx, cy } of [tr, br]) {
      magnets.appendChild(kerfCircle(ox + cx, oy + cy, magR, params.kerf, "hole"));
    }
  }

  if (preview && params.showGrain) {
    addGrainOverlay(grain, { x: ox, y: oy, w: outerW, h: outerD, axis: "y" });
  }

  return { name: `interior-layer-${layerIndex + 1}${isTop ? "-top" : ""}`, svg };
}
