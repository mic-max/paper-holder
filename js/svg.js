// SVG primitives and document wrapper. All units are mm.

export const SVG_NS = "http://www.w3.org/2000/svg";

export function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    node.setAttribute(k, String(v));
  }
  return node;
}

// Bed-sized SVG document. Returns { svg, cut, etch, grain } groups.
// Stroke widths/colors are set on the groups so the export hook can swap them.
//
// `partNaturalHeight` is the height of the part in natural (un-rotated) coordinates
// — required when `params.rotateOnBed` is true so we can compute the 90° rotation transform
// that lays the part's tall axis along the bed's wide axis.
export function createBedSvg(params, { preview = true, partNaturalHeight = 0 } = {}) {
  const strokeW = preview ? params.previewStrokeWidth : params.exportStrokeWidth;
  const svg = el("svg", {
    xmlns: SVG_NS,
    width: `${params.bedWidth}mm`,
    height: `${params.bedDepth}mm`,
    viewBox: `0 0 ${params.bedWidth} ${params.bedDepth}`,
  });

  // Bed boundary (preview-only visual; stripped on export).
  if (preview) {
    const bed = el("rect", {
      class: "bed-outline",
      x: 0, y: 0,
      width: params.bedWidth, height: params.bedDepth,
      fill: "none", stroke: "#cccccc", "stroke-width": 0.5, "stroke-dasharray": "2 2",
    });
    svg.appendChild(bed);
  }

  // Optional 90° rotation so the part lands with its tall axis along the bed's wide axis.
  // Math: rotate(90) maps (x,y)->(-y,x); translate(partHeight + 2*originX, 0) brings the rotated
  // bbox back into positive coords with the original PART_ORIGIN-style top-left margin preserved.
  const rotate = params.rotateOnBed !== false;
  const wrapperAttrs = rotate
    ? { class: "bed-content", transform: `translate(${partNaturalHeight + 20}, 0) rotate(90)` }
    : { class: "bed-content" };
  const wrapper = el("g", wrapperAttrs);
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
