// Pluggable living-hinge pattern registry.
// Each pattern is a function (area, params) -> array of SVG element nodes (slit lines/rects).
// The hinge "long axis" runs in +x; slits run perpendicular (along +y).

import { el } from "./svg.js";

const registry = {};

export function registerHinge(name, fn) {
  registry[name] = fn;
}

export function getHingeNames() {
  return Object.keys(registry);
}

export function generateHinge(name, area, params) {
  const fn = registry[name];
  if (!fn) throw new Error(`Unknown hinge style: ${name}`);
  return fn(area, params);
}

// Classic straight-slit lattice. Slits run across the hinge (perpendicular to the bend axis).
// area = { x, y, w, h } -- w is along the hinge long axis, h is across (the bend direction).
registerHinge("straightLattice", (area, params) => {
  const nodes = [];
  const { x, y, w, h } = area;
  const slitLen = Math.min(params.hingeSlitLength, h * 0.95);
  const rowSpacing = params.hingeRowSpacing;
  const gap = params.hingeSlitGap;

  // Two row types, offset for staggered pattern:
  //   Row A: full-length slits centered vertically with margins.
  //   Row B: half-length slits at top + half-length at bottom, leaving a gap in middle.
  const rowCount = Math.max(1, Math.floor(w / rowSpacing));
  const actualSpacing = w / rowCount;

  for (let i = 0; i < rowCount; i++) {
    const cx = x + actualSpacing * (i + 0.5);
    const isA = i % 2 === 0;

    if (isA) {
      // Single centered slit
      const y0 = y + (h - slitLen) / 2;
      nodes.push(slit(cx, y0, cx, y0 + slitLen, params));
    } else {
      // Two slits: top and bottom, each (slitLen - gap)/2 long
      const halfLen = (slitLen - gap) / 2;
      const yTop0 = y + (h - slitLen) / 2;
      const yTop1 = yTop0 + halfLen;
      const yBot0 = yTop1 + gap;
      const yBot1 = yBot0 + halfLen;
      // Also extend the staggered slits to the edges so the hinge actually flexes
      nodes.push(slit(cx, y, cx, yTop1, params));
      nodes.push(slit(cx, yBot0, cx, y + h, params));
    }
  }
  return nodes;
});

function slit(x1, y1, x2, y2) {
  return el("line", { x1, y1, x2, y2 });
}
