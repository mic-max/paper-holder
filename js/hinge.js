// Pluggable living-hinge pattern registry.
// Convention: area = { x, y, w, h }
//   - w (across) is the SHORT dimension of the hinge band (perpendicular to the bend axis)
//   - h (along)  is the LONG  dimension (along the bend axis)
// Slits run along the band's long axis (+y in this convention),
// arranged in columns stacked across the band (+x).

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

// Classic staggered straight-cut lattice.
// Column A (even columns): one centered long slit of length `slitLen` along +y.
// Column B (odd columns):  two half-length slits split by a gap in the middle,
//                          extending all the way to the band's top/bottom edges
//                          so material can flex.
registerHinge("straightLattice", (area, params) => {
  const { x, y, w, h } = area;
  const slitLen = Math.min(params.hingeSlitLength, h * 0.95);
  const colSpacing = params.hingeRowSpacing;
  const gap = params.hingeSlitGap;

  const colCount = Math.max(1, Math.floor(w / colSpacing));
  const actualSpacing = w / colCount;
  const nodes = [];

  for (let i = 0; i < colCount; i++) {
    const cx = x + actualSpacing * (i + 0.5);
    const isA = i % 2 === 0;

    if (isA) {
      const y0 = y + (h - slitLen) / 2;
      nodes.push(line(cx, y0, cx, y0 + slitLen));
    } else {
      const halfLen = (slitLen - gap) / 2;
      const yTop1 = y + (h - slitLen) / 2 + halfLen;
      const yBot0 = yTop1 + gap;
      // Staggered columns reach the band's top/bottom edges
      nodes.push(line(cx, y, cx, yTop1));
      nodes.push(line(cx, yBot0, cx, y + h));
    }
  }
  return nodes;
});

function line(x1, y1, x2, y2) {
  return el("line", { x1, y1, x2, y2 });
}
