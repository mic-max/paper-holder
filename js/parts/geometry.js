// Shared part geometry. Book-style layout: spine on the LEFT, paper portrait.
// X is horizontal (width / across the cover); Y is vertical (height / along the spine).
// The right wall is wider than the other walls (uses `openingBufferWidth` instead of
// `wallThickness`) so pen pockets fit without eating into the paper cavity.

export const PART_ORIGIN = { x: 10, y: 10 };

export function outerFootprint(params) {
  const outerW = params.spineSpacing + params.paperWidth + 2 * params.cavityClearance + params.openingBufferWidth;
  const outerD = params.paperLength + 2 * params.cavityClearance + 2 * params.wallThickness;
  return { outerW, outerD };
}

export function cavityRect(params, layerGrowth = 0) {
  return {
    x: params.spineSpacing - layerGrowth,
    y: params.wallThickness - layerGrowth,
    w: params.paperWidth + 2 * params.cavityClearance + 2 * layerGrowth,
    h: params.paperLength + 2 * params.cavityClearance + 2 * layerGrowth,
  };
}

// Per-layer paper-cavity growth (mm), increasing toward the top layer (highest index).
// Only the large cavity grows -- pens, reliefs, screws and the outer footprint stay fixed.
// Clamped so the frame bands never collapse and the cavity stays clear of the pen pockets.
export function layerGrowth(params, layerIndex) {
  const raw = layerIndex * params.interiorPocketGrowthPerLayer;
  const bandLimit = Math.min(params.spineSpacing, params.openingBufferWidth, params.wallThickness) - 2;
  const penLimit = (params.openingBufferWidth - params.penPocketWidth) / 2 - 1;
  const maxGrow = Math.max(0, Math.min(bandLimit, penLimit));
  return Math.max(0, Math.min(raw, maxGrow));
}

// Alignment-pin holes (dowels) that register the interior stack + back during glue-up.
// Positions are FIXED for every layer (independent of per-layer cavity growth) so a dowel
// passes straight through. Grouped by the split piece that owns each hole; the spine piece
// is intentionally omitted (the chicago bolts already register that edge). Non-split
// builders (and the back) use the union of all three groups. Diameters/insets come from
// params; a group is returned empty when the geometry can't fit the pin.
export function alignPinPositions(params) {
  const { outerW, outerD } = outerFootprint(params);
  const SS = params.spineSpacing, BUF = params.openingBufferWidth, WT = params.wallThickness;
  const RX0 = outerW - BUF;
  const r = Math.max(0, params.alignPinDiameter / 2);
  const inset = params.alignPinInset;
  const growTop = layerGrowth(params, params.interiorLayerCount - 1); // tightest (top) layer

  const head = [], foot = [], opening = [];

  // Head/foot: two pins per band, centered across the band's thin (short) dimension and
  // just inside the two end dovetails (mirrored about the band center). Use the tightest
  // band height so the fixed y still lands in material on every layer.
  const bandH = WT - growTop;
  const xL = SS + inset, xR = RX0 - inset;
  if (bandH >= 2 * r + 1 && inset >= r + 0.5 && xR - xL >= 2 * r) {
    const yTop = bandH / 2, yBot = outerD - bandH / 2;
    head.push({ x: xL, y: yTop }, { x: xR, y: yTop });
    foot.push({ x: xL, y: yBot }, { x: xR, y: yBot });
  }

  // Opening: two pins on the buffer-band centerline, mirrored about the thumb relief (part
  // center). Their distance from center is `alignPinOpeningOffset` (tune it to sit in the
  // pen-gap where the relief has receded). Skipped if the offset or the (tightest) band
  // can't clear the pin.
  const xO = (RX0 + outerW) / 2;
  const yOff = params.alignPinOpeningOffset;
  if (yOff > r && BUF / 2 - growTop >= r + 0.5) {
    opening.push({ x: xO, y: outerD / 2 - yOff }, { x: xO, y: outerD / 2 + yOff });
  }

  return { head, foot, opening };
}

// Right-side buffer zone (where pen pockets and corner magnets live).
export function bufferRect(params) {
  const { outerW, outerD } = outerFootprint(params);
  return {
    x: outerW - params.openingBufferWidth,
    y: 0,
    w: params.openingBufferWidth,
    h: outerD,
  };
}
