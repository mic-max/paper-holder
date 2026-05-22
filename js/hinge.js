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
  // Defensive clamps: an empty number input becomes 0, which would otherwise
  // produce an infinite or NaN column count and freeze the page on render.
  const safe = (v, min) => (Number.isFinite(v) && v >= min ? v : min);
  const slitLen = Math.min(safe(params.hingeSlitLength, 0.5), h * 0.95);
  const colSpacing = safe(params.hingeRowSpacing, 0.5);
  const gap = safe(params.hingeSlitGap, 0.1);

  const colCount = Math.min(2000, Math.max(1, Math.floor(w / colSpacing)));
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
