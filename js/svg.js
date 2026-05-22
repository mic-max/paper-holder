// SVG primitives and document wrapper. All units are mm.

import { COMPONENT_COLORS } from "./params.js";

export const SVG_NS = "http://www.w3.org/2000/svg";

export function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    node.setAttribute(k, String(v));
  }
  return node;
}

// SVG document for a part. Always built in NATURAL (un-rotated) coordinates with the
// part placed at PART_ORIGIN. The on-screen preview uses a viewBox cropped to the
// part's bounding box (so small parts aren't dwarfed by the bed). The export pipeline
// (download.js) re-sizes the root to the bed dimensions and applies the 90° rotation
// when `params.rotateOnBed` is on. The natural dimensions are stashed as data-* attrs
// so the export step can compute the rotation translate.
export function createBedSvg(params, { preview = true, partNaturalWidth = 0, partNaturalHeight = 0 } = {}) {
  const strokeW = preview ? params.previewStrokeWidth : params.exportStrokeWidth;
  // Natural viewBox: PART_ORIGIN margin on top/left, same margin on bottom/right.
  const ORIGIN = 10;
  const vbW = partNaturalWidth + 2 * ORIGIN;
  const vbH = partNaturalHeight + 2 * ORIGIN;
  const svg = el("svg", {
    xmlns: SVG_NS,
    viewBox: `0 0 ${vbW} ${vbH}`,
    "data-natural-width": partNaturalWidth,
    "data-natural-height": partNaturalHeight,
  });

  // bed-content wrapper exists for symmetry with export; preview leaves it un-transformed.
  const wrapper = el("g", { class: "bed-content" });
  svg.appendChild(wrapper);

  const cut = el("g", {
    class: "cut",
    fill: "none",
    stroke: params.cutColor,
    "stroke-width": strokeW,
  });
  const etch = el("g", {
    class: "etch",
    fill: "none",
    stroke: params.etchColor,
    "stroke-width": strokeW,
  });
  const grain = el("g", { class: "grain-overlay" });

  wrapper.appendChild(cut);
  wrapper.appendChild(etch);
  wrapper.appendChild(grain);

  return { svg, cut, etch, grain };
}

// Kerf-compensated rectangle.
// role: "outer" expands outward by kerf/2; "hole" shrinks inward by kerf/2; "raw" no compensation.
export function kerfRect(x, y, w, h, kerf, role = "outer") {
  const k = role === "outer" ? kerf / 2 : role === "hole" ? -kerf / 2 : 0;
  return el("rect", {
    x: x - k, y: y - k,
    width: w + 2 * k, height: h + 2 * k,
  });
}

// Kerf-compensated rectangle with per-corner radii.
// corners = { tl, tr, br, bl } in mm; 0 (default) means a square corner.
// Output is an SVG <path> so individual corners can be rounded.
export function kerfRoundedRect(x, y, w, h, kerf, role = "outer", corners = {}) {
  const k = role === "outer" ? kerf / 2 : role === "hole" ? -kerf / 2 : 0;
  const X = x - k, Y = y - k, W = w + 2 * k, H = h + 2 * k;
  const maxR = Math.min(W, H) / 2;
  const clamp = (r) => Math.max(0, Math.min(r || 0, maxR));
  const tl = clamp(corners.tl), tr = clamp(corners.tr);
  const br = clamp(corners.br), bl = clamp(corners.bl);
  const seg = [];
  seg.push(`M ${X + tl} ${Y}`);
  seg.push(`L ${X + W - tr} ${Y}`);
  if (tr > 0) seg.push(`A ${tr} ${tr} 0 0 1 ${X + W} ${Y + tr}`);
  seg.push(`L ${X + W} ${Y + H - br}`);
  if (br > 0) seg.push(`A ${br} ${br} 0 0 1 ${X + W - br} ${Y + H}`);
  seg.push(`L ${X + bl} ${Y + H}`);
  if (bl > 0) seg.push(`A ${bl} ${bl} 0 0 1 ${X} ${Y + H - bl}`);
  seg.push(`L ${X} ${Y + tl}`);
  if (tl > 0) seg.push(`A ${tl} ${tl} 0 0 1 ${X + tl} ${Y}`);
  seg.push("Z");
  return el("path", { d: seg.join(" ") });
}

// Like kerfRoundedRect, but also bites a semicircular "thumb relief" out of the
// right edge (at the vertical center). Used by interior layers. If
// `thumbReliefRadius` is 0 the output is equivalent to kerfRoundedRect.
export function caseOuterPath(x, y, w, h, kerf, role = "outer", opts = {}) {
  const k = role === "outer" ? kerf / 2 : role === "hole" ? -kerf / 2 : 0;
  const X = x - k, Y = y - k, W = w + 2 * k, H = h + 2 * k;
  const maxR = Math.min(W, H) / 2;
  const clamp = (r) => Math.max(0, Math.min(r || 0, maxR));
  const tl = clamp(opts.tl), tr = clamp(opts.tr);
  const br = clamp(opts.br), bl = clamp(opts.bl);
  const tRaw = opts.thumbReliefRadius || 0;
  // The thumb relief sits on the right edge between the rounded corners.
  // Clamp it so it doesn't collide with the corners or escape the edge.
  const tMax = Math.max(0, (H - tr - br) / 2 - 1);
  const t = Math.max(0, Math.min(tRaw, tMax));
  const cy = Y + H / 2;

  const seg = [];
  seg.push(`M ${X + tl} ${Y}`);
  seg.push(`L ${X + W - tr} ${Y}`);
  if (tr > 0) seg.push(`A ${tr} ${tr} 0 0 1 ${X + W} ${Y + tr}`);
  if (t > 0) {
    seg.push(`L ${X + W} ${cy - t}`);
    // Concave arc INTO the part (sweep-flag 0) so the relief is a bite, not a bump.
    seg.push(`A ${t} ${t} 0 0 0 ${X + W} ${cy + t}`);
  }
  seg.push(`L ${X + W} ${Y + H - br}`);
  if (br > 0) seg.push(`A ${br} ${br} 0 0 1 ${X + W - br} ${Y + H}`);
  seg.push(`L ${X + bl} ${Y + H}`);
  if (bl > 0) seg.push(`A ${bl} ${bl} 0 0 1 ${X} ${Y + H - bl}`);
  seg.push(`L ${X} ${Y + tl}`);
  if (tl > 0) seg.push(`A ${tl} ${tl} 0 0 1 ${X + tl} ${Y}`);
  seg.push("Z");
  return el("path", { d: seg.join(" ") });
}

// Get-or-create a per-component subgroup inside the main cut group.
// The subgroup stroke is set to the preview color for that component; export
// strips that override so cuts come out in `params.cutColor`.
export function componentGroup(parentCut, component) {
  let g = parentCut.querySelector(`g[data-component="${component}"]`);
  if (!g) {
    g = el("g", {
      "data-component": component,
      stroke: COMPONENT_COLORS[component] || COMPONENT_COLORS.perimeter,
    });
    parentCut.appendChild(g);
  }
  return g;
}

export function kerfCircle(cx, cy, r, kerf, role = "hole") {
  const k = role === "outer" ? kerf / 2 : role === "hole" ? -kerf / 2 : 0;
  return el("circle", { cx, cy, r: r + k });
}

// Rounded slot (capsule). w = total width, h = total height; the smaller is the diameter.
export function kerfSlot(x, y, w, h, kerf, role = "hole") {
  const k = role === "outer" ? kerf / 2 : role === "hole" ? -kerf / 2 : 0;
  const W = w + 2 * k, H = h + 2 * k;
  const r = Math.min(W, H) / 2;
  return el("rect", { x: x - k, y: y - k, width: W, height: H, rx: r, ry: r });
}

// Grain overlay: arrows running along `axis` ("x" or "y") inside the given rect.
export function addGrainOverlay(grainGroup, { x, y, w, h, axis = "x" }) {
  const stroke = "#888888";
  const sw = 0.6;
  const arrowCount = axis === "x" ? Math.max(2, Math.floor(h / 25)) : Math.max(2, Math.floor(w / 25));
  for (let i = 1; i <= arrowCount; i++) {
    if (axis === "x") {
      const ay = y + (h * i) / (arrowCount + 1);
      const ax1 = x + 5, ax2 = x + w - 5;
      grainGroup.appendChild(el("line", { x1: ax1, y1: ay, x2: ax2, y2: ay, stroke, "stroke-width": sw, opacity: 0.6 }));
      grainGroup.appendChild(el("polyline", { points: `${ax2 - 3},${ay - 2} ${ax2},${ay} ${ax2 - 3},${ay + 2}`, fill: "none", stroke, "stroke-width": sw, opacity: 0.6 }));
    } else {
      const ax = x + (w * i) / (arrowCount + 1);
      const ay1 = y + 5, ay2 = y + h - 5;
      grainGroup.appendChild(el("line", { x1: ax, y1: ay1, x2: ax, y2: ay2, stroke, "stroke-width": sw, opacity: 0.6 }));
      grainGroup.appendChild(el("polyline", { points: `${ax - 2},${ay2 - 3} ${ax},${ay2} ${ax + 2},${ay2 - 3}`, fill: "none", stroke, "stroke-width": sw, opacity: 0.6 }));
    }
  }
  const label = el("text", {
    x: x + w / 2, y: y - 2,
    "text-anchor": "middle", "font-size": 4, fill: stroke, opacity: 0.8,
  });
  label.textContent = `grain ↦ ${axis}`;
  grainGroup.appendChild(label);
}

// Place screw holes in a row along the spine. `spineAxis` is the axis the screws are arrayed along.
// Returns array of {cx, cy}.
export function spineScrewPositions({ originX, originY, outerLong, outerShort, spineOffset, count, spineAxis = "long" }) {
  const positions = [];
  if (spineAxis === "long") {
    // Spine runs along the long axis (e.g. horizontal); screws spread along it, fixed offset from the spine edge.
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      // Inset 15% from each end so screws aren't right on the corner.
      const tt = 0.15 + 0.7 * t;
      positions.push({ cx: originX + outerLong * tt, cy: originY + spineOffset });
    }
  } else {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const tt = 0.15 + 0.7 * t;
      positions.push({ cx: originX + spineOffset, cy: originY + outerShort * tt });
    }
  }
  return positions;
}
