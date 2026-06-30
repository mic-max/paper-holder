// Split interior layer: instead of one big frame, cut each interior layer as 4 pieces
// (a "butt frame") joined near the corners with small dovetails. Two pieces run the full
// length on one axis; the other two fit between them. The full-length axis ALTERNATES by
// layer parity so the seams stagger between layers (brick-style) and don't weaken the stack.
//
//   - Vertical-full  (even layers): Left & Right columns span the full height; Top & Bottom
//                                   bars fit between them. Seams are vertical (length = wall).
//   - Horizontal-full (odd layers): Top & Bottom bars span the full width; Left & Right
//                                   columns fit between them. Seams are horizontal.
//
// Each seam is one small dovetail: the "between" piece carries a protruding TAIL (narrow neck
// at the mouth, wider tip), the full-length piece carries the matching SOCKET. Features land
// on whichever piece owns that region (pens/relief -> right "opening" piece; screws -> left
// "spine" piece; magnets/rounded corners -> the corner owner, which alternates with the mode).
//
// Kerf: every piece outline is the kerf-"outer" offset of its closed boundary, so convex
// edges/tails grow and concave sockets shrink by kerf/2; a nominal tail then mates a nominal
// socket. Straight + dovetail edges are offset analytically; the rounded outer corners and
// thumb relief reuse the arc/relief math from caseOuterPath (svg.js). Holes (pens/screws/
// magnets) keep using the existing kerf "hole" primitives.

import {
  createBedSvg, penPocketPath, kerfCircle, el,
  spineScrewPositions, addGrainOverlay, componentGroup,
} from "../svg.js";
import { outerFootprint, PART_ORIGIN, layerGrowth } from "./geometry.js";

// Human-friendly piece names by edge role.
const PIECE_LABEL = { left: "spine", right: "opening", top: "head", bottom: "foot" };
// Short codes for the laser-etched assembly mark (e.g. "s3" = spine, layer 3).
const PIECE_ETCH = { left: "L", right: "R", top: "U", bottom: "D" };

// Effective dovetail dimensions for one seam, clamped to fit the band and kerf-aware.
//   seamLen   = available length along the seam (limits neck/tip width)
//   perpWidth = band width the dovetail protrudes through (limits depth)
export function effJoint(seamLen, perpWidth, params) {
  const g = params.kerf / 2;
  let W = params.jointWidth, F = params.jointFlare;
  const maxTip = Math.max(1, seamLen - 1);          // leave ~0.5mm margin each side
  if (W + 2 * F > maxTip) { const s = maxTip / (W + 2 * F); W *= s; F *= s; }
  const D = Math.min(params.jointDepth, Math.max(0.5, perpWidth - 1));
  return { W, F, D, g };
}

// Inside thumb-relief chord/depth, reusing the outer relief's shape params. Depth is clamped
// so a wall always remains between it and the outer relief on the opening piece's far edge.
export function innerReliefDims(params, grow = 0) {
  const h = params.thumbReliefHeight;
  const avail = params.openingBufferWidth - grow; // opening band width at this layer
  const d = Math.min(params.thumbReliefDepth, Math.max(0, avail - params.thumbReliefDepth - 2));
  return { reliefH: h, reliefD: d };
}

// Emit a horizontal edge (constant y) from xFrom -> xTo, inserting any dovetail features.
// outwardSign is the sign of the outward normal on the perpendicular (y) axis: -1 for the
// top edge (outward = up), +1 for the bottom edge (outward = down).
function emitH(cmds, yFixed, xFrom, xTo, outwardSign, feats, params, off) {
  const st = Math.sign(xTo - xFrom) || 1;
  const ordered = [...feats].sort((a, b) => st * (a.center - b.center));
  for (const f of ordered) {
    if (f.kind === "relief") continue; // inner thumb relief only lives on vertical edges
    const { W, F, D, g } = effJoint(f.seamLen, f.perpWidth, params);
    const s = f.kind === "tail" ? 1 : -1;
    const hNeck = Math.max(0.1, W / 2 + s * g);
    const hTip = Math.max(hNeck + 0.05, W / 2 + F + s * g);
    const tipY = yFixed + outwardSign * s * D;
    const c = f.center + off.dx;
    cmds.push(`L ${c - st * hNeck} ${yFixed}`);
    cmds.push(`L ${c - st * hTip} ${tipY}`);
    cmds.push(`L ${c + st * hTip} ${tipY}`);
    cmds.push(`L ${c + st * hNeck} ${yFixed}`);
  }
  cmds.push(`L ${xTo} ${yFixed}`);
}

// Emit a vertical edge (constant x) from yFrom -> yTo, inserting any dovetail features.
// outwardSign: -1 for the left edge (outward = left), +1 for the right edge (outward = right).
function emitV(cmds, xFixed, yFrom, yTo, outwardSign, feats, params, off) {
  const st = Math.sign(yTo - yFrom) || 1;
  const ordered = [...feats].sort((a, b) => st * (a.center - b.center));
  for (const f of ordered) {
    const c = f.center + off.dy;
    if (f.kind === "relief") {
      // Inside thumb relief: a circular arc bulging INTO the piece (away from the cavity),
      // mirroring the outer relief. Skipped when clamped depth is zero.
      const reliefH = Math.min(f.reliefH, Math.abs(yTo - yFrom) - 2);
      const reliefD = f.reliefD;
      if (reliefH > 0 && reliefD > 0) {
        const reliefR = (reliefH * reliefH + 4 * reliefD * reliefD) / (8 * reliefD);
        const largeArc = reliefD > reliefH / 2 ? 1 : 0;
        const intoSign = -outwardSign;                 // +1 = bulge toward +x (into the piece)
        const tipX = xFixed + intoSign * reliefD;
        const sweep = (intoSign > 0) === (st > 0) ? 1 : 0;
        cmds.push(`L ${xFixed} ${c - st * reliefH / 2}`);
        cmds.push(`A ${reliefR} ${reliefR} 0 ${largeArc} ${sweep} ${xFixed} ${c + st * reliefH / 2}`);
      }
      continue;
    }
    const { W, F, D, g } = effJoint(f.seamLen, f.perpWidth, params);
    const s = f.kind === "tail" ? 1 : -1;
    const hNeck = Math.max(0.1, W / 2 + s * g);
    const hTip = Math.max(hNeck + 0.05, W / 2 + F + s * g);
    const tipX = xFixed + outwardSign * s * D;
    cmds.push(`L ${xFixed} ${c - st * hNeck}`);
    cmds.push(`L ${tipX} ${c - st * hTip}`);
    cmds.push(`L ${tipX} ${c + st * hTip}`);
    cmds.push(`L ${xFixed} ${c + st * hNeck}`);
  }
  cmds.push(`L ${xFixed} ${yTo}`);
}

// Right edge of the "opening" piece, with the centered thumb relief biting left into the part.
// Mirrors caseOuterPath's relief math (radius from chord+sagitta, large-arc when sagitta > h/2).
function emitRightWithRelief(cmds, xFixed, yFrom, yTo, spec, params, off) {
  const cy = spec.outerD / 2 + off.dy;
  const reliefH = Math.min(params.thumbReliefHeight, (yTo - yFrom) - 2);
  const reliefD = Math.min(params.thumbReliefDepth, (spec.x1 - spec.x0) - 1);
  const on = reliefH > 0 && reliefD > 0 && cy - reliefH / 2 > yFrom && cy + reliefH / 2 < yTo;
  if (on) {
    const r = (reliefH * reliefH + 4 * reliefD * reliefD) / (8 * reliefD);
    const largeArc = reliefD > reliefH / 2 ? 1 : 0;
    cmds.push(`L ${xFixed} ${cy - reliefH / 2}`);
    cmds.push(`A ${r} ${r} 0 ${largeArc} 0 ${xFixed} ${cy + reliefH / 2}`);
  }
  cmds.push(`L ${xFixed} ${yTo}`);
}

// Build the closed outline `d` string for one piece (pure; no DOM). `off` translates footprint
// coords into draw coords so the piece sits at PART_ORIGIN.
export function piecePathD(spec, params, off) {
  const g = params.kerf / 2;
  const { x0, x1, y0, y1, corners, relief, features } = spec;
  const X0 = x0 - g + off.dx, X1 = x1 + g + off.dx;
  const Y0 = y0 - g + off.dy, Y1 = y1 + g + off.dy;
  const cTL = corners.tl || 0, cTR = corners.tr || 0, cBR = corners.br || 0, cBL = corners.bl || 0;

  const cmds = [`M ${X0 + cTL} ${Y0}`];
  // Top edge (+x), then optional TR arc.
  emitH(cmds, Y0, X0 + cTL, X1 - cTR, -1, features.top, params, off);
  if (cTR > 0) cmds.push(`A ${cTR} ${cTR} 0 0 1 ${X1} ${Y0 + cTR}`);
  // Right edge (+y) -- relief or dovetails -- then optional BR arc.
  if (relief) emitRightWithRelief(cmds, X1, Y0 + cTR, Y1 - cBR, spec, params, off);
  else emitV(cmds, X1, Y0 + cTR, Y1 - cBR, +1, features.right, params, off);
  if (cBR > 0) cmds.push(`A ${cBR} ${cBR} 0 0 1 ${X1 - cBR} ${Y1}`);
  // Bottom edge (-x), then optional BL arc.
  emitH(cmds, Y1, X1 - cBR, X0 + cBL, +1, features.bottom, params, off);
  if (cBL > 0) cmds.push(`A ${cBL} ${cBL} 0 0 1 ${X0} ${Y1 - cBL}`);
  // Left edge (-y), then optional TL arc.
  emitV(cmds, X0, Y1 - cBL, Y0 + cTL, -1, features.left, params, off);
  if (cTL > 0) cmds.push(`A ${cTL} ${cTL} 0 0 1 ${X0 + cTL} ${Y0}`);
  cmds.push("Z");
  return cmds.join(" ");
}

// Describe the 4 pieces for a layer in footprint coordinates (pure; no DOM).
export function computePieceSpecs(params, layerIndex) {
  const { outerW, outerD } = outerFootprint(params);
  const SS = params.spineSpacing;          // left band width (no growth)
  const BUF = params.openingBufferWidth;   // right band width (no growth)
  const WT = params.wallThickness;          // top/bottom band height (no growth)
  const RX0 = outerW - BUF;
  const BY0 = outerD - WT;
  const r = params.openingCornerRadius;     // opening (right) corner radius
  const sr = params.spineCornerRadius;      // spine (left) corner roundover
  const isTop = layerIndex === params.interiorLayerCount - 1;
  const mode = layerIndex % 2 === 0 ? "V" : "H"; // V = vertical-full, H = horizontal-full

  // Per-layer cavity growth: the paper cavity expands outward by `grow` on every side, so the
  // frame bands and their dovetail seams shrink toward the cavity. Outer edges, screws,
  // magnets, pens and reliefs stay put. `grow` increases toward the top layer.
  const grow = layerGrowth(params, layerIndex);
  const cavL = SS - grow;            // cavity left edge  (spine band inner edge)
  const cavR = RX0 + grow;           // cavity right edge (opening band inner edge)
  const cavT = WT - grow;            // cavity top edge   (top band inner edge)
  const cavB = BY0 + grow;           // cavity bottom edge (bottom band inner edge)
  const leftBand = cavL;             // spine band width at this layer
  const rightBand = outerW - cavR;   // opening band width at this layer
  const crossBand = cavT;            // top/bottom band height at this layer

  // Dovetail seam centers (footprint coords).
  const yTopBand = cavT / 2;
  const yBotBand = (cavB + outerD) / 2;
  const xLeftBand = cavL / 2;
  const xRightBand = (cavR + outerW) / 2;

  const noFeat = () => ({ top: [], right: [], bottom: [], left: [] });
  // Inside thumb relief: a centered arc on the opening piece's cavity-facing (left) edge.
  const innerRelief = { kind: "relief", center: outerD / 2, ...innerReliefDims(params, grow) };
  const specs = [];

  if (mode === "V") {
    // Left column: full height, owns spine corners, sockets on its (cavity) right edge, screws.
    specs.push({
      type: "left", outerD, x0: 0, x1: cavL, y0: 0, y1: outerD,
      corners: { tl: sr, bl: sr, tr: 0, br: 0 }, relief: false,
      features: { ...noFeat(), right: [
        { center: yTopBand, kind: "socket", seamLen: crossBand, perpWidth: leftBand },
        { center: yBotBand, kind: "socket", seamLen: crossBand, perpWidth: leftBand },
      ] },
      holes: { screws: true },
    });
    // Right column: full height, owns opening corners, sockets on its (cavity) left edge, pens,
    // inner + outer relief, and (top layer) both magnets.
    specs.push({
      type: "right", outerD, x0: cavR, x1: outerW, y0: 0, y1: outerD,
      corners: { tr: r, br: r, tl: 0, bl: 0 }, relief: true,
      features: { ...noFeat(), left: [
        { center: yTopBand, kind: "socket", seamLen: crossBand, perpWidth: rightBand },
        { center: yBotBand, kind: "socket", seamLen: crossBand, perpWidth: rightBand },
        innerRelief,
      ] },
      holes: { pens: true, magnets: isTop ? ["tr", "br"] : [] },
    });
    // Top bar: between the columns; tails on both ends.
    specs.push({
      type: "top", outerD, x0: cavL, x1: cavR, y0: 0, y1: cavT,
      corners: {}, relief: false,
      features: { ...noFeat(),
        left: [{ center: yTopBand, kind: "tail", seamLen: crossBand, perpWidth: leftBand }],
        right: [{ center: yTopBand, kind: "tail", seamLen: crossBand, perpWidth: rightBand }],
      },
      holes: {},
    });
    // Bottom bar.
    specs.push({
      type: "bottom", outerD, x0: cavL, x1: cavR, y0: cavB, y1: outerD,
      corners: {}, relief: false,
      features: { ...noFeat(),
        left: [{ center: yBotBand, kind: "tail", seamLen: crossBand, perpWidth: leftBand }],
        right: [{ center: yBotBand, kind: "tail", seamLen: crossBand, perpWidth: rightBand }],
      },
      holes: {},
    });
  } else {
    // Top bar: full width, owns top corners, sockets on its (cavity) bottom edge, magnet (tr).
    specs.push({
      type: "top", outerD, x0: 0, x1: outerW, y0: 0, y1: cavT,
      corners: { tl: sr, tr: r, bl: 0, br: 0 }, relief: false,
      features: { ...noFeat(), bottom: [
        { center: xLeftBand, kind: "socket", seamLen: leftBand, perpWidth: crossBand },
        { center: xRightBand, kind: "socket", seamLen: rightBand, perpWidth: crossBand },
      ] },
      holes: { magnets: isTop ? ["tr"] : [] },
    });
    // Bottom bar: full width, owns bottom corners, sockets on its (cavity) top edge, magnet (br).
    specs.push({
      type: "bottom", outerD, x0: 0, x1: outerW, y0: cavB, y1: outerD,
      corners: { bl: sr, br: r, tl: 0, tr: 0 }, relief: false,
      features: { ...noFeat(), top: [
        { center: xLeftBand, kind: "socket", seamLen: leftBand, perpWidth: crossBand },
        { center: xRightBand, kind: "socket", seamLen: rightBand, perpWidth: crossBand },
      ] },
      holes: { magnets: isTop ? ["br"] : [] },
    });
    // Left column: between the bars; tails top & bottom; screws.
    specs.push({
      type: "left", outerD, x0: 0, x1: cavL, y0: cavT, y1: cavB,
      corners: {}, relief: false,
      features: { ...noFeat(),
        top: [{ center: xLeftBand, kind: "tail", seamLen: leftBand, perpWidth: crossBand }],
        bottom: [{ center: xLeftBand, kind: "tail", seamLen: leftBand, perpWidth: crossBand }],
      },
      holes: { screws: true },
    });
    // Right column: between the bars; tails top & bottom; inner relief; pens; outer relief.
    specs.push({
      type: "right", outerD, x0: cavR, x1: outerW, y0: cavT, y1: cavB,
      corners: {}, relief: true,
      features: { ...noFeat(),
        top: [{ center: xRightBand, kind: "tail", seamLen: rightBand, perpWidth: crossBand }],
        bottom: [{ center: xRightBand, kind: "tail", seamLen: rightBand, perpWidth: crossBand }],
        left: [innerRelief],
      },
      holes: { pens: true },
    });
  }

  return { specs, isTop };
}

// Bounding box of a piece in footprint coords, accounting for kerf growth and tail protrusions.
function pieceBBox(spec, params) {
  const g = params.kerf / 2;
  let minX = spec.x0 - g, maxX = spec.x1 + g, minY = spec.y0 - g, maxY = spec.y1 + g;
  const tailD = (feats) => {
    let d = 0;
    for (const f of feats) if (f.kind === "tail") d = Math.max(d, effJoint(f.seamLen, f.perpWidth, params).D);
    return d;
  };
  minX -= tailD(spec.features.left);
  maxX += tailD(spec.features.right);
  minY -= tailD(spec.features.top);
  maxY += tailD(spec.features.bottom);
  return { minX, maxX, minY, maxY };
}

// Magnet centers (footprint coords) nested in the rounded right corners. Same construction as
// the solid interior layer (buildInteriorLayer).
function magnetCenters(params, outerW, outerD) {
  const r = params.openingCornerRadius;
  const magR = params.magnetDiameter / 2;
  const d = r - magR - params.magnetCornerPadding;
  const k = 1 / Math.SQRT2;
  return {
    tr: { cx: (outerW - r) + d * k, cy: r - d * k },
    br: { cx: (outerW - r) + d * k, cy: (outerD - r) + d * k },
    magR,
  };
}

// Draw one piece's geometry (perimeter + holes + grain) into the given cut/grain groups at
// the given footprint->draw offset. Shared by the separate-piece export and the assembled
// preview so both stay in sync.
function drawPiece(cut, etch, grain, spec, params, off, { preview, outerW, outerD, layerIndex }) {
  // Perimeter (single closed outline with the dovetail seams).
  componentGroup(cut, "perimeter").appendChild(
    el("path", { d: piecePathD(spec, params, off) })
  );

  // Etched assembly mark (e.g. "s3"). Placed in a hole-free spot: bars use their
  // center; columns (spine/opening) sit 25% down the full object, between the top
  // chicago screw and the pen thumb relief. The mark is on the cut face — flip the
  // (vertically symmetric) piece to hide it on assembly. The top layer is left
  // unmarked since it's visible in the finished holder.
  const isTopLayer = layerIndex === params.interiorLayerCount - 1;
  if (layerIndex != null && !isTopLayer) {
    const isBar = spec.type === "top" || spec.type === "bottom";
    const shortSide = isBar ? spec.y1 - spec.y0 : spec.x1 - spec.x0;
    const fontSize = Math.max(2.5, Math.min(5, shortSide * 0.6));
    const lx = off.dx + (spec.x0 + spec.x1) / 2;
    const ly = isBar
      ? off.dy + (spec.y0 + spec.y1) / 2
      : off.dy + outerD * 0.25;
    const label = el("text", {
      x: lx, y: ly,
      "text-anchor": "middle", "dominant-baseline": "central",
      "font-size": fontSize, "font-family": "sans-serif",
    });
    label.textContent = `${PIECE_ETCH[spec.type]}${layerIndex + 1}`;
    etch.appendChild(label);
  }

  // Pen pockets: two colinear rounded rectangles in the right buffer zone.
  if (spec.holes.pens) {
    const pens = componentGroup(cut, "pens");
    const pocketX = (outerW - params.openingBufferWidth / 2) - params.penPocketWidth / 2;
    const totalH = 2 * params.penPocketLength + params.penPocketGap;
    const startY = (outerD - totalH) / 2;
    const penMargin = (params.openingBufferWidth - params.penPocketWidth) / 2;
    const penReliefD = Math.min(params.penReliefDepth, Math.max(0, penMargin - 1));
    for (let i = 0; i < 2; i++) {
      const py = startY + i * (params.penPocketLength + params.penPocketGap);
      pens.appendChild(penPocketPath(
        off.dx + pocketX, off.dy + py,
        params.penPocketWidth, params.penPocketLength,
        params.kerf, "hole",
        { cornerRadius: params.penPocketCornerRadius,
          reliefH: params.penReliefHeight, reliefD: penReliefD },
      ));
    }
  }

  // Chicago screws down the left spine (only those that fall within this piece's span).
  if (spec.holes.screws) {
    const screws = componentGroup(cut, "screws");
    const positions = spineScrewPositions({
      originX: off.dx, originY: off.dy,
      outerLong: outerW, outerShort: outerD,
      spineOffset: params.spineSpacing / 2,
      count: params.chicagoScrewCount,
      endInset: params.chicagoScrewEndInset,
      spineAxis: "left",
    });
    const y0d = off.dy + spec.y0, y1d = off.dy + spec.y1;
    for (const { cx, cy } of positions) {
      if (cy <= y0d || cy >= y1d) continue;
      screws.appendChild(kerfCircle(cx, cy, params.chicagoScrewDiameter / 2, params.kerf, "hole"));
    }
  }

  // Magnets nested in the rounded right corners (top layer only).
  if (spec.holes.magnets && spec.holes.magnets.length) {
    const magnets = componentGroup(cut, "magnets");
    const m = magnetCenters(params, outerW, outerD);
    for (const corner of spec.holes.magnets) {
      magnets.appendChild(kerfCircle(off.dx + m[corner].cx, off.dy + m[corner].cy, m.magR, params.kerf, "hole"));
    }
  }

  if (preview && params.showGrain) {
    // Grain runs along each rail's length: the head/foot bars run horizontally (x),
    // the spine/opening columns run vertically (y).
    const grainAxis = spec.type === "top" || spec.type === "bottom" ? "x" : "y";
    addGrainOverlay(grain, {
      x: off.dx + spec.x0, y: off.dy + spec.y0,
      w: spec.x1 - spec.x0, h: spec.y1 - spec.y0, axis: grainAxis,
    });
  }
}

// One piece's SVG sized to its own bbox (for export/nesting).
function buildOnePiece(spec, params, { preview, outerW, outerD, layerIndex }) {
  const bb = pieceBBox(spec, params);
  const off = { dx: PART_ORIGIN.x - bb.minX, dy: PART_ORIGIN.y - bb.minY };
  const { svg, cut, etch, grain } = createBedSvg(params, {
    preview, partNaturalWidth: bb.maxX - bb.minX, partNaturalHeight: bb.maxY - bb.minY,
  });
  drawPiece(cut, etch, grain, spec, params, off, { preview, outerW, outerD, layerIndex });
  // Head/foot bars run across the part; rotate their export 90deg so they nest along
  // the bed like the spine/opening columns. (Applied on top of the global rotateOnBed.)
  if (spec.type === "top" || spec.type === "bottom") svg.setAttribute("data-export-rotate", "90");
  return svg;
}

// Assembled preview: all 4 pieces drawn at their real footprint positions in one SVG, so the
// layer reads as the joined frame. For on-screen rendering only -- exports stay separate.
export function buildInteriorLayerAssembled(params, layerIndex, { preview = true } = {}) {
  const { outerW, outerD } = outerFootprint(params);
  const { specs, isTop } = computePieceSpecs(params, layerIndex);
  const { svg, cut, etch, grain } = createBedSvg(params, {
    preview, partNaturalWidth: outerW, partNaturalHeight: outerD,
  });
  const off = { dx: PART_ORIGIN.x, dy: PART_ORIGIN.y };
  for (const spec of specs) {
    drawPiece(cut, etch, grain, spec, params, off, { preview, outerW, outerD, layerIndex });
  }
  const suffix = isTop ? "-top" : "";
  return { name: `layer-${layerIndex + 1}${suffix}`, svg };
}

// Interior builder for the split case. Each layer is unique (per-layer cavity growth), so it
// gets its own assembled preview card plus its 4 separate cut pieces. Pieces are named
// {role}-{layerNumber}[-top]; layer 1 = bottom (no growth), the top layer (magnets) = highest.
export function buildInteriorLayers(params, { preview = true } = {}) {
  const N = params.interiorLayerCount;
  const { outerW, outerD } = outerFootprint(params);
  const layers = [];
  for (let i = N - 1; i >= 0; i--) { // top layer first in the card list
    const { specs, isTop } = computePieceSpecs(params, i);
    const suffix = isTop ? "-top" : "";
    const layer = buildInteriorLayerAssembled(params, i, { preview });
    layer.exports = specs.map((spec) => ({
      name: `${PIECE_LABEL[spec.type]}-${i + 1}${suffix}`,
      svg: buildOnePiece(spec, params, { preview, outerW, outerD, layerIndex: i }),
    }));
    layers.push(layer);
  }
  return layers;
}
