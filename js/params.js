// Central source of truth for generator parameters.
// `defaults` is the runtime params object. `schema` drives form generation in app.js.

export const defaults = {
  // Material & machine
  materialThickness: 3,
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

  // Pens
  penCount: 2,
  penDiameter: 12,
  penChannelInset: 8,

  // Fasteners / alignment
  chicagoScrewCount: 3,
  chicagoScrewDiameter: 5,
  chicagoScrewSpineOffset: 8,
  alignmentPinDiameter: 3.175,
  alignmentPinInsetX: 20,
  alignmentPinInsetY: 20,

  // Closure (magnet only; steel strip deferred)
  magnetCount: 2,
  magnetWidth: 10,
  magnetHeight: 3,

  // Cover / hinge
  spineSpacing: 12,
  hingeLength: 40,
  hingeStyle: "straightLattice",
  hingeSlitLength: 25,
  hingeRowSpacing: 4,
  hingeSlitGap: 3,

  // Interior
  interiorLayerCount: 3,
  interiorPocketGrowthPerLayer: 0,

  // UI-only
  showGrain: false,
};

// Grouped schema for form rendering. Each entry mirrors a key on `defaults`.
// type: "number" | "select" | "checkbox" | "color"
export const schema = [
  { group: "Material & Machine", items: [
    { key: "materialThickness", label: "Material thickness", unit: "mm", type: "number", step: 0.1, min: 0.1 },
    { key: "kerf", label: "Kerf", unit: "mm", type: "number", step: 0.01, min: 0 },
    { key: "bedWidth", label: "Bed width", unit: "mm", type: "number", step: 0.1, min: 10 },
    { key: "bedDepth", label: "Bed depth", unit: "mm", type: "number", step: 0.1, min: 10 },
    { key: "rotateOnBed", label: "Rotate parts 90° on bed", type: "checkbox" },
    { key: "exportStrokeWidth", label: "Export stroke", unit: "mm", type: "number", step: 0.005, min: 0.001 },
    { key: "previewStrokeWidth", label: "Preview stroke", unit: "mm", type: "number", step: 0.05, min: 0.01 },
    { key: "cutColor", label: "Cut color", type: "color" },
    { key: "etchColor", label: "Etch color", type: "color" },
  ]},
  { group: "Paper / Cavity", items: [
    { key: "paperLength", label: "Paper length", unit: "mm", type: "number", step: 1, min: 10 },
    { key: "paperWidth", label: "Paper width", unit: "mm", type: "number", step: 1, min: 10 },
    { key: "cavityClearance", label: "Cavity clearance", unit: "mm", type: "number", step: 0.5, min: 0 },
    { key: "wallThickness", label: "Wall thickness", unit: "mm", type: "number", step: 0.5, min: 1 },
  ]},
  { group: "Pens", items: [
    { key: "penCount", label: "Pen count", type: "number", step: 1, min: 0 },
    { key: "penDiameter", label: "Pen diameter", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "penChannelInset", label: "Pen channel inset", unit: "mm", type: "number", step: 1, min: 0 },
  ]},
  { group: "Fasteners / Alignment", items: [
    { key: "chicagoScrewCount", label: "Chicago screw count", type: "number", step: 1, min: 1 },
    { key: "chicagoScrewDiameter", label: "Screw diameter", unit: "mm", type: "number", step: 0.1, min: 0.5 },
    { key: "chicagoScrewSpineOffset", label: "Screw spine offset", unit: "mm", type: "number", step: 0.5, min: 0 },
    { key: "alignmentPinDiameter", label: "Alignment pin diameter", unit: "mm", type: "number", step: 0.05, min: 0.5 },
    { key: "alignmentPinInsetX", label: "Alignment pin inset X", unit: "mm", type: "number", step: 1, min: 0 },
    { key: "alignmentPinInsetY", label: "Alignment pin inset Y", unit: "mm", type: "number", step: 1, min: 0 },
  ]},
  { group: "Closure", items: [
    { key: "magnetCount", label: "Magnet count", type: "number", step: 1, min: 0 },
    { key: "magnetWidth", label: "Magnet width", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "magnetHeight", label: "Magnet height (cavity short side)", unit: "mm", type: "number", step: 0.5, min: 1 },
  ]},
  { group: "Cover / Hinge", items: [
    { key: "spineSpacing", label: "Spine spacing", unit: "mm", type: "number", step: 0.5, min: 0 },
    { key: "hingeLength", label: "Hinge length", unit: "mm", type: "number", step: 1, min: 1 },
    { key: "hingeStyle", label: "Hinge style", type: "select", optionsFrom: "hinge" },
    { key: "hingeSlitLength", label: "Slit length", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "hingeRowSpacing", label: "Row spacing", unit: "mm", type: "number", step: 0.1, min: 0.5 },
    { key: "hingeSlitGap", label: "Slit gap", unit: "mm", type: "number", step: 0.1, min: 0.5 },
  ]},
  { group: "Interior", items: [
    { key: "interiorLayerCount", label: "Interior layer count", type: "number", step: 1, min: 1 },
    { key: "interiorPocketGrowthPerLayer", label: "Pocket growth per layer", unit: "mm", type: "number", step: 0.1, min: 0 },
  ]},
];
