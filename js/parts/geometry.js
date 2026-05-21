// Shared part geometry. Book-style layout: spine on the LEFT, paper portrait.
// X is horizontal (width / across the cover); Y is vertical (height / along the spine).

export const PART_ORIGIN = { x: 10, y: 10 };

export function outerFootprint(params) {
  // Width across (perpendicular to spine): spine band + cavity short side + far-side wall
  const outerW = params.spineSpacing + params.paperWidth + 2 * params.cavityClearance + params.wallThickness;
  // Height along spine: cavity long side + walls top and bottom
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
