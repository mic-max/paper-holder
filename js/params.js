// Central source of truth for generator parameters.
// `defaults` is the runtime params object. `schema` drives form generation in app.js.

export const DEFAULT_LAYER_THICKNESS = 3;

export const defaults = {
  // Material & machine
  // Per-sheet thickness for the stack, ordered: [cover, interior 1..N, back].
  // Length is always interiorLayerCount + 2 (kept in sync by resizeLayerThicknesses).
  layerThicknesses: [3, 3, 3, 3, 3],
  kerf: 0.1,
  bedWidth: 609.6,
  bedDepth: 304.8,
  rotateOnBed: true,
  exportStrokeWidth: 0.025,
  previewStrokeWidth: 0.3,
  cutColor: "#FF0000",
  etchColor: "#0000FF",

  // Paper / cavity
  paperLength: 356,
  paperWidth: 216,
  cavityClearance: 2,
  wallThickness: 8,
  openingBufferWidth: 18,
  openingCornerRadius: 10,
  thumbReliefHeight: 50,
  thumbReliefDepth: 8,
  spineCornerRadius: 1.5,

  // Pen pockets (two colinear, vertical, centered in the right buffer zone)
  penPocketLength: 150,
  penPocketWidth: 10,
  penPocketCornerRadius: 3,
  penPocketGap: 30,
  penReliefHeight: 24,
  penReliefDepth: 3,

  // Fasteners
  chicagoScrewCount: 3,
  chicagoScrewDiameter: 5,
  chicagoScrewEndInset: 50,

  // Closure: round magnets nestle in the top-right & bottom-right rounded corners.
  magnetDiameter: 12,
  magnetCornerPadding: 3,

  // Cover / hinge
  spineSpacing: 12,
  hingeLength: 40,
  hingeStyle: "straightLattice",
  hingeSlitLength: 25,
  hingeRowSpacing: 4,
  hingeSlitGap: 3,

  // Cover etch: crane artwork engraved on the lid, centered between the living-hinge
  // kerfs and the opening edge. Height in mm (auto-clamped to fit the available zone).
  coverEtch: true,
  coverEtchFilled: true,     // true = solid silhouette; false = outline only
  coverEtchHeight: 120,
  coverEtchStrokeWidth: 0.4, // outline line weight (mm, on the cover) when not filled

  // Interior
  interiorLayerCount: 3,
  interiorPocketGrowthPerLayer: 0,

  // Interior split: build each interior layer as 4 dovetail-joined frame pieces
  // (two full-length, two between) to reduce waste and nest on smaller stock.
  // Seams stagger between layers (alternate full-length axis) so they don't align.
  interiorSplit: true,
  jointWidth: 4,    // dovetail neck width along the seam (mm)
  jointFlare: 1,    // extra half-width at the tail tip per side (mm); tip = jointWidth + 2*jointFlare
  jointDepth: 3,    // dovetail protrusion perpendicular to the seam (mm)

  // Leather spine (wraps around the case spine, sandwiched by chicago screws)
  leatherWrapAllowance: 4,
  leatherThickness: 2,
  // Etched spine name: runs along the spine, centered between the screw columns.
  leatherEtch: true,
  leatherEtchText: "Joyce Carroll",
  // Test pieces (toolbar test mode).
  testPieceLength: 76.2,   // leather stub length; ~3 in
  // Screw-fit gauge.
  holeTestWidth: 25.4,     // gauge width; 1 in
  holeTestMin: 5.8,        // smallest hole diameter
  holeTestMax: 6.2,        // largest hole diameter
  holeTestStep: 0.1,       // diameter increment between holes
  holeTestSpacing: 18,     // center-to-center spacing along the gauge
  // Magnet-fit gauge (12 mm magnet); wider strip to clear the larger holes + labels.
  magnetTestWidth: 38.1,   // gauge width; 1.5 in
  magnetTestMin: 11.8,
  magnetTestMax: 12.2,
  magnetTestStep: 0.1,
  magnetTestSpacing: 18,

  // UI-only
  showGrain: false,
};

const num = (v, fallback) => (Number.isFinite(+v) ? +v : fallback);

// Total assembled thickness of the rigid stack (cover + interior layers + back).
export function stackThickness(p) {
  return (p.layerThicknesses || []).reduce((sum, t) => sum + num(t, 0), 0);
}

// Force `layerThicknesses` to have exactly interiorLayerCount + 2 entries, preserving
// the cover (first) and back (last) and growing/shrinking the interior region between
// them. New interior entries copy the nearest existing interior thickness.
export function resizeLayerThicknesses(p) {
  const need = num(p.interiorLayerCount, 1) + 2;
  let arr = (Array.isArray(p.layerThicknesses) ? p.layerThicknesses : [])
    .map((t) => num(t, DEFAULT_LAYER_THICKNESS));
  if (arr.length < 2) {
    // Nothing usable to preserve — fill uniformly.
    p.layerThicknesses = Array(need).fill(arr[0] ?? DEFAULT_LAYER_THICKNESS);
    return p;
  }
  const cover = arr[0];
  const back = arr[arr.length - 1];
  let interiors = arr.slice(1, -1);
  const needInteriors = need - 2;
  const fill = interiors.length ? interiors[interiors.length - 1] : cover;
  while (interiors.length < needInteriors) interiors.push(fill);
  if (interiors.length > needInteriors) interiors = interiors.slice(0, needInteriors);
  p.layerThicknesses = [cover, ...interiors, back];
  return p;
}

// Merge a stored profile over defaults, cloning the thickness array and migrating
// legacy single-value `materialThickness` into a per-layer array when present.
export function mergeParams(stored) {
  stored = stored || {};
  const p = { ...defaults, ...stored };
  if (Array.isArray(stored.layerThicknesses)) {
    p.layerThicknesses = [...stored.layerThicknesses];
  } else {
    const t = num(stored.materialThickness, DEFAULT_LAYER_THICKNESS);
    p.layerThicknesses = Array(num(p.interiorLayerCount, 1) + 2).fill(t);
  }
  delete p.materialThickness;
  return resizeLayerThicknesses(p);
}

// Dynamic per-layer thickness fields, regenerated whenever interiorLayerCount changes.
export function layerThicknessItems(p) {
  const n = num(p.interiorLayerCount, 1);
  const labels = ["Cover", ...Array.from({ length: n }, (_, i) => `Interior ${i + 1}`), "Back"];
  return labels.map((label, i) => ({
    key: `layerThickness:${i}`,
    label: `${label} thickness`,
    unit: "mm", type: "number", step: 0.1, min: 0.1,
    get: (pp) => pp.layerThicknesses[i],
    set: (pp, v) => { pp.layerThicknesses[i] = v; },
  }));
}

// type: "number" | "select" | "checkbox" | "color"
export const schema = [
  { group: "Material & Machine", component: null, items: [
    { key: "kerf", label: "Kerf", unit: "mm", type: "number", step: 0.01, min: 0 },
    { key: "bedWidth", label: "Bed width", unit: "mm", type: "number", step: 0.1, min: 10 },
    { key: "bedDepth", label: "Bed depth", unit: "mm", type: "number", step: 0.1, min: 10 },
    { key: "rotateOnBed", label: "Rotate parts 90° on bed", type: "checkbox" },
    { key: "exportStrokeWidth", label: "Export stroke", unit: "mm", type: "number", step: 0.005, min: 0.001 },
    { key: "previewStrokeWidth", label: "Preview stroke", unit: "mm", type: "number", step: 0.05, min: 0.01 },
    { key: "cutColor", label: "Cut color", type: "color" },
    { key: "etchColor", label: "Etch color", type: "color" },
  ]},
  // Per-sheet thickness, one field per physical layer (cover + interiors + back).
  // `items` is a function so the field list tracks interiorLayerCount.
  { group: "Layer Thicknesses", component: null, items: layerThicknessItems },
  { group: "Paper / Cavity", component: "cavity", items: [
    { key: "paperLength", label: "Paper length", unit: "mm", type: "number", step: 1, min: 10 },
    { key: "paperWidth", label: "Paper width", unit: "mm", type: "number", step: 1, min: 10 },
    { key: "cavityClearance", label: "Cavity clearance", unit: "mm", type: "number", step: 0.5, min: 0 },
    { key: "wallThickness", label: "Wall thickness (top/bottom)", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "openingBufferWidth", label: "Opening buffer width (right wall)", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "openingCornerRadius", label: "Opening corner radius", unit: "mm", type: "number", step: 0.5, min: 0 },
    { key: "thumbReliefHeight", label: "Thumb relief height (along edge)", unit: "mm", type: "number", step: 1, min: 0 },
    { key: "thumbReliefDepth", label: "Thumb relief depth (into part)", unit: "mm", type: "number", step: 0.5, min: 0 },
    { key: "spineCornerRadius", label: "Spine corner roundover", unit: "mm", type: "number", step: 0.1, min: 0 },
  ]},
  { group: "Pens", component: "pens", items: [
    { key: "penPocketLength", label: "Pen pocket length (each)", unit: "mm", type: "number", step: 1, min: 1 },
    { key: "penPocketWidth", label: "Pen pocket width", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "penPocketCornerRadius", label: "Pen pocket corner radius", unit: "mm", type: "number", step: 0.1, min: 0 },
    { key: "penPocketGap", label: "Gap between pen pockets", unit: "mm", type: "number", step: 1, min: 0 },
    { key: "penReliefHeight", label: "Pen relief height (along slot)", unit: "mm", type: "number", step: 1, min: 0 },
    { key: "penReliefDepth", label: "Pen relief depth (each side)", unit: "mm", type: "number", step: 0.5, min: 0 },
  ]},
  { group: "Fasteners", component: "screws", items: [
    { key: "chicagoScrewCount", label: "Chicago screw count", type: "number", step: 1, min: 1 },
    { key: "chicagoScrewDiameter", label: "Screw diameter", unit: "mm", type: "number", step: 0.1, min: 0.5 },
    { key: "chicagoScrewEndInset", label: "End screw inset from top/bottom", unit: "mm", type: "number", step: 1, min: 0 },
  ]},
  { group: "Closure", component: "magnets", items: [
    { key: "magnetDiameter", label: "Magnet diameter", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "magnetCornerPadding", label: "Padding from rounded corner", unit: "mm", type: "number", step: 0.5, min: 0 },
  ]},
  { group: "Cover / Hinge", component: "hinge", items: [
    { key: "spineSpacing", label: "Spine spacing", unit: "mm", type: "number", step: 0.5, min: 0 },
    { key: "hingeLength", label: "Hinge length", unit: "mm", type: "number", step: 1, min: 1 },
    { key: "hingeStyle", label: "Hinge style", type: "select", optionsFrom: "hinge" },
    { key: "hingeSlitLength", label: "Slit length", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "hingeRowSpacing", label: "Row spacing", unit: "mm", type: "number", step: 0.1, min: 0.5 },
    { key: "hingeSlitGap", label: "Slit gap", unit: "mm", type: "number", step: 0.1, min: 0.5 },
    { key: "coverEtch", label: "Etch crane on cover", type: "checkbox" },
    { key: "coverEtchFilled", label: "Crane etch filled (vs outline)", type: "checkbox" },
    { key: "coverEtchHeight", label: "Crane etch height", unit: "mm", type: "number", step: 1, min: 0 },
    { key: "coverEtchStrokeWidth", label: "Crane etch stroke (outline)", unit: "mm", type: "number", step: 0.05, min: 0.05 },
  ]},
  { group: "Interior", component: "cavity", items: [
    { key: "interiorLayerCount", label: "Interior layer count", type: "number", step: 1, min: 1,
      afterChange: resizeLayerThicknesses, rebuildsForm: true },
    { key: "interiorPocketGrowthPerLayer", label: "Pocket growth per layer", unit: "mm", type: "number", step: 0.1, min: 0 },
    { key: "interiorSplit", label: "Split into 4 joined pieces", type: "checkbox" },
    { key: "jointWidth", label: "Dovetail neck width", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "jointFlare", label: "Dovetail flare (per side)", unit: "mm", type: "number", step: 0.1, min: 0 },
    { key: "jointDepth", label: "Dovetail depth", unit: "mm", type: "number", step: 0.5, min: 1 },
  ]},
  { group: "Leather Spine", component: "leather", items: [
    { key: "leatherWrapAllowance", label: "Wrap allowance (beyond stack thickness)", unit: "mm", type: "number", step: 0.5, min: 0 },
    { key: "leatherThickness", label: "Leather thickness", unit: "mm", type: "number", step: 0.1, min: 0 },
    { key: "leatherEtch", label: "Etch name on spine", type: "checkbox" },
    { key: "leatherEtchText", label: "Spine text", type: "text" },
  ]},
  { group: "Test Pieces", component: null, items: [
    { key: "testPieceLength", label: "Leather test length", unit: "mm", type: "number", step: 1, min: 10 },
    { key: "holeTestWidth", label: "Screw gauge width", unit: "mm", type: "number", step: 0.1, min: 5 },
    { key: "holeTestMin", label: "Screw gauge min Ø", unit: "mm", type: "number", step: 0.1, min: 0.5 },
    { key: "holeTestMax", label: "Screw gauge max Ø", unit: "mm", type: "number", step: 0.1, min: 0.5 },
    { key: "holeTestStep", label: "Screw gauge Ø step", unit: "mm", type: "number", step: 0.05, min: 0.05 },
    { key: "holeTestSpacing", label: "Screw gauge spacing", unit: "mm", type: "number", step: 1, min: 5 },
    { key: "magnetTestWidth", label: "Magnet gauge width", unit: "mm", type: "number", step: 0.1, min: 5 },
    { key: "magnetTestMin", label: "Magnet gauge min Ø", unit: "mm", type: "number", step: 0.1, min: 0.5 },
    { key: "magnetTestMax", label: "Magnet gauge max Ø", unit: "mm", type: "number", step: 0.1, min: 0.5 },
    { key: "magnetTestStep", label: "Magnet gauge Ø step", unit: "mm", type: "number", step: 0.05, min: 0.05 },
    { key: "magnetTestSpacing", label: "Magnet gauge spacing", unit: "mm", type: "number", step: 1, min: 5 },
  ]},
];

// Component colors used in the on-screen preview. Exports always use params.cutColor.
export const COMPONENT_COLORS = {
  perimeter: "#222222",
  cavity:    "#0066cc",
  pens:      "#cc6600",
  screws:    "#888888",
  magnets:   "#00aa00",
  hinge:     "#aa00aa",
  leather:   "#8B4513",
};
