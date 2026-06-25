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
  createBedSvg, kerfRoundedRect, kerfCircle, el,
  spineScrewPositions, addGrainOverlay, componentGroup,
} from "../svg.js";
import { outerFootprint, PART_ORIGIN } from "./geometry.js";

// Human-friendly piece names by edge role.
const PIECE_LABEL = { left: "spine", right: "opening", top: "head", bottom: "foot" };

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
export function innerReliefDims(params) {
  const h = params.thumbReliefHeight;
  const d = Math.min(params.thumbReliefDepth, Math.max(0, params.openingBufferWidth - params.thumbReliefDepth - 2));
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
  const SS = params.spineSpacing;          // left band width
  const BUF = params.openingBufferWidth;   // right band width
  const WT = params.wallThickness;          // top/bottom band height
  const RX0 = outerW - BUF;                 // cavity right / right band left
  const BY0 = outerD - WT;                  // cavity bottom / bottom band top
  const r = params.openingCornerRadius;     // opening (right) corner radius
  const sr = params.spineCornerRadius;      // spine (left) corner roundover
  const isTop = layerIndex === params.interiorLayerCount - 1;
  const mode = layerIndex % 2 === 0 ? "V" : "H"; // V = vertical-full, H = horizontal-full

  // Dovetail centers (footprint coords).
  const yTopBand = WT / 2;
  const yBotBand = (BY0 + outerD) / 2;
  const xLeftBand = SS / 2;
  const xRightBand = (RX0 + outerW) / 2;

  const noFeat = () => ({ top: [], right: [], bottom: [], left: [] });
  // Inside thumb relief: a centered arc on the opening piece's cavity-facing (left) edge.
  const innerRelief = { kind: "relief", center: outerD / 2, ...innerReliefDims(params) };
  const specs = [];

  if (mode === "V") {
    // Left column: full height, owns spine corners, sockets on its right edge, screws.
    specs.push({
      type: "left", outerD, x0: 0, x1: SS, y0: 0, y1: outerD,
      corners: { tl: sr, bl: sr, tr: 0, br: 0 }, relief: false,
      features: { ...noFeat(), right: [
        { center: yTopBand, kind: "socket", seamLen: WT, perpWidth: SS },
        { center: yBotBand, kind: "socket", seamLen: WT, perpWidth: SS },
      ] },
      holes: { screws: true },
    });
    // Right column: full height, owns opening corners, sockets on its left edge, pens, relief,
    // and (top layer) both magnets.
    specs.push({
      type: "right", outerD, x0: RX0, x1: outerW, y0: 0, y1: outerD,
      corners: { tr: r, br: r, tl: 0, bl: 0 }, relief: true,
      features: { ...noFeat(), left: [
        { center: yTopBand, kind: "socket", seamLen: WT, perpWidth: BUF },
        { center: yBotBand, kind: "socket", seamLen: WT, perpWidth: BUF },
        innerRelief,
      ] },
      holes: { pens: true, magnets: isTop ? ["tr", "br"] : [] },
    });
    // Top bar: between the columns; tails on both ends.
    specs.push({
      type: "top", outerD, x0: SS, x1: RX0, y0: 0, y1: WT,
      corners: {}, relief: false,
      features: { ...noFeat(),
        left: [{ center: yTopBand, kind: "tail", seamLen: WT, perpWidth: SS }],
        right: [{ center: yTopBand, kind: "tail", seamLen: WT, perpWidth: BUF }],
      },
      holes: {},
    });
    // Bottom bar.
    specs.push({
      type: "bottom", outerD, x0: SS, x1: RX0, y0: BY0, y1: outerD,
      corners: {}, relief: false,
      features: { ...noFeat(),
        left: [{ center: yBotBand, kind: "tail", seamLen: WT, perpWidth: SS }],
        right: [{ center: yBotBand, kind: "tail", seamLen: WT, perpWidth: BUF }],
      },
      holes: {},
    });
  } else {
    // Top bar: full width, owns top corners (tl spine, tr opening), sockets on bottom edge,
    // and (top layer) the top-right magnet.
    specs.push({
      type: "top", outerD, x0: 0, x1: outerW, y0: 0, y1: WT,
      corners: { tl: sr, tr: r, bl: 0, br: 0 }, relief: false,
      features: { ...noFeat(), bottom: [
        { center: xLeftBand, kind: "socket", seamLen: SS, perpWidth: WT },
        { center: xRightBand, kind: "socket", seamLen: BUF, perpWidth: WT },
      ] },
      holes: { magnets: isTop ? ["tr"] : [] },
    });
    // Bottom bar: full width, owns bottom corners, sockets on top edge, bottom-right magnet.
    specs.push({
      type: "bottom", outerD, x0: 0, x1: outerW, y0: BY0, y1: outerD,
      corners: { bl: sr, br: r, tl: 0, tr: 0 }, relief: false,
      features: { ...noFeat(), top: [
        { center: xLeftBand, kind: "socket", seamLen: SS, perpWidth: WT },
        { center: xRightBand, kind: "socket", seamLen: BUF, perpWidth: WT },
      ] },
      holes: { magnets: isTop ? ["br"] : [] },
    });
    // Left column: between the bars; tails top & bottom; screws.
    specs.push({
      type: "left", outerD, x0: 0, x1: SS, y0: WT, y1: BY0,
      corners: {}, relief: false,
      features: { ...noFeat(),
        top: [{ center: xLeftBand, kind: "tail", seamLen: SS, perpWidth: WT }],
        bottom: [{ center: xLeftBand, kind: "tail", seamLen: SS, perpWidth: WT }],
      },
      holes: { screws: true },
    });
    // Right column: between the bars; tails top & bottom; pens; relief.
    specs.push({
      type: "right", outerD, x0: RX0, x1: outerW, y0: WT, y1: BY0,
      corners: {}, relief: true,
      features: { ...noFeat(),
        top: [{ center: xRightBand, kind: "tail", seamLen: BUF, perpWidth: WT }],
        bottom: [{ center: xRightBand, kind: "tail", seamLen: BUF, perpWidth: WT }],
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
function drawPiece(cut, grain, spec, params, off, { preview, outerW, outerD }) {
  // Perimeter (single closed outline with the dovetail seams).
  componentGroup(cut, "perimeter").appendChild(
    el("path", { d: piecePathD(spec, params, off) })
  );

  // Pen pockets: two colinear rounded rectangles in the right buffer zone.
  if (spec.holes.pens) {
    const pens = componentGroup(cut, "pens");
    const pocketX = (outerW - params.openingBufferWidth / 2) - params.penPocketWidth / 2;
    const totalH = 2 * params.penPocketLength + params.penPocketGap;
    const startY = (outerD - totalH) / 2;
    for (let i = 0; i < 2; i++) {
      const py = startY + i * (params.penPocketLength + params.penPocketGap);
      pens.appendChild(kerfRoundedRect(
        off.dx + pocketX, off.dy + py,
        params.penPocketWidth, params.penPocketLength,
        params.kerf, "hole",
        { tl: params.penPocketCornerRadius, tr: params.penPocketCornerRadius,
          bl: params.penPocketCornerRadius, br: params.penPocketCornerRadius },
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
function buildOnePiece(spec, params, { preview, outerW, outerD }) {
  const bb = pieceBBox(spec, params);
  const off = { dx: PART_ORIGIN.x - bb.minX, dy: PART_ORIGIN.y - bb.minY };
  const { svg, cut, grain } = createBedSvg(params, {
    preview, partNaturalWidth: bb.maxX - bb.minX, partNaturalHeight: bb.maxY - bb.minY,
  });
  drawPiece(cut, grain, spec, params, off, { preview, outerW, outerD });
  return svg;
}

// Assembled preview: all 4 pieces drawn at their real footprint positions in one SVG, so the
// layer reads as the joined frame. For on-screen rendering only -- exports stay separate.
export function buildInteriorLayerAssembled(params, layerIndex, { preview = true } = {}) {
  const { outerW, outerD } = outerFootprint(params);
  const { specs, isTop } = computePieceSpecs(params, layerIndex);
  const { svg, cut, grain } = createBedSvg(params, {
    preview, partNaturalWidth: outerW, partNaturalHeight: outerD,
  });
  const off = { dx: PART_ORIGIN.x, dy: PART_ORIGIN.y };
  for (const spec of specs) {
    drawPiece(cut, grain, spec, params, off, { preview, outerW, outerD });
  }
  const suffix = isTop ? "-top" : "";
  return { name: `interior-layer-${layerIndex + 1}${suffix}`, svg };
}

// Signature distinguishing identical pieces across layers: piece role + layer parity (odd /
// even, which fixes the frame mode) + whether it carries magnet cutouts (only the top layer
// does). Identical signatures = identical cuts.
function pieceSignature(spec, layerIndex) {
  const parity = layerIndex % 2 === 0 ? "odd" : "even";
  const mag = spec.holes.magnets && spec.holes.magnets.length ? "-magnet" : "";
  return `${PIECE_LABEL[spec.type]}-${parity}${mag}`;
}

// Interior builder for the split case. Returns up to two assembled preview layers grouped by
// layer-number parity (odd / even), each with a `count` of how many layers it stands for and
// an `exports` list of its distinct cut pieces. Pieces are deduped by signature across the
// whole stack and named with an `-xN` quantity suffix, so the zip carries no duplicate files.
export function buildInteriorLayers(params, { preview = true } = {}) {
  const N = params.interiorLayerCount;
  const { outerW, outerD } = outerFootprint(params);

  // Global tally: how many copies of each unique piece the whole stack needs.
  const qty = new Map();
  for (let i = 0; i < N; i++) {
    for (const spec of computePieceSpecs(params, i).specs) {
      const sig = pieceSignature(spec, i);
      qty.set(sig, (qty.get(sig) || 0) + 1);
    }
  }
  const exportName = (sig) => `${sig}${qty.get(sig) > 1 ? `-x${qty.get(sig)}` : ""}`;

  // Group layers by layer-number parity (which fixes the frame mode).
  const byParity = { odd: [], even: [] };
  for (let i = 0; i < N; i++) ((i + 1) % 2 === 1 ? byParity.odd : byParity.even).push(i);

  const previews = [];
  for (const key of ["odd", "even"]) {
    const idxs = byParity[key];
    if (!idxs.length) continue;
    // Preview the top variant when this parity owns it, so the magnet cutouts are shown.
    const rep = idxs.includes(N - 1) ? N - 1 : idxs[0];
    const layer = buildInteriorLayerAssembled(params, rep, { preview });
    layer.name = key;
    layer.count = idxs.length;

    // Distinct cut pieces for this parity group (the magnet opening/head/foot appear here too).
    const seen = new Set();
    const exports = [];
    for (const i of idxs) {
      for (const spec of computePieceSpecs(params, i).specs) {
        const sig = pieceSignature(spec, i);
        if (seen.has(sig)) continue;
        seen.add(sig);
        exports.push({ name: exportName(sig), svg: buildOnePiece(spec, params, { preview, outerW, outerD }) });
      }
    }
    layer.exports = exports;
    previews.push(layer);
  }
  return previews;
}
