// Shared part geometry. Spine runs along the top long edge of the layered footprint.

export const PART_ORIGIN = { x: 10, y: 10 };

export function outerFootprint(params) {
  const outerW = params.paperLength + 2 * params.cavityClearance + 2 * params.wallThickness;
  const outerD = params.paperWidth + 2 * params.cavityClearance + params.wallThickness + params.spineSpacing;
  return { outerW, outerD };
}

export function cavityRect(params, layerGrowth = 0) {
  return {
    x: params.wallThickness - layerGrowth,
    y: params.spineSpacing - layerGrowth,
    w: params.paperLength + 2 * params.cavityClearance + 2 * layerGrowth,
    h: params.paperWidth + 2 * params.cavityClearance + 2 * layerGrowth,
  };
}
