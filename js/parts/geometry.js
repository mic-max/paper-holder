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
