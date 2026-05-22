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
  openingBufferWidth: 18,
  openingCornerRadius: 10,
  thumbReliefRadius: 12,
  spineCornerRadius: 1.5,

  // Pen pockets (two colinear, vertical, centered in the right buffer zone)
  penPocketLength: 150,
  penPocketWidth: 10,
  penPocketCornerRadius: 3,
  penPocketGap: 30,

  // Fasteners
  chicagoScrewCount: 3,
  chicagoScrewDiameter: 5,
  chicagoScrewSpineOffset: 8,

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

  // Interior
  interiorLayerCount: 3,
  interiorPocketGrowthPerLayer: 0,

  // Leather spine (wraps around the case spine, sandwiched by chicago screws)
  leatherWrapAllowance: 4,

  // UI-only
  showGrain: false,
};

// type: "number" | "select" | "checkbox" | "color"
export const schema = [
  { group: "Material & Machine", component: null, items: [
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
  { group: "Paper / Cavity", component: "cavity", items: [
    { key: "paperLength", label: "Paper length", unit: "mm", type: "number", step: 1, min: 10 },
    { key: "paperWidth", label: "Paper width", unit: "mm", type: "number", step: 1, min: 10 },
    { key: "cavityClearance", label: "Cavity clearance", unit: "mm", type: "number", step: 0.5, min: 0 },
    { key: "wallThickness", label: "Wall thickness (spine/top/bottom)", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "openingBufferWidth", label: "Opening buffer width (right wall)", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "openingCornerRadius", label: "Opening corner radius", unit: "mm", type: "number", step: 0.5, min: 0 },
    { key: "thumbReliefRadius", label: "Thumb relief radius", unit: "mm", type: "number", step: 0.5, min: 0 },
    { key: "spineCornerRadius", label: "Spine corner roundover", unit: "mm", type: "number", step: 0.1, min: 0 },
  ]},
  { group: "Pens", component: "pens", items: [
    { key: "penPocketLength", label: "Pen pocket length (each)", unit: "mm", type: "number", step: 1, min: 1 },
    { key: "penPocketWidth", label: "Pen pocket width", unit: "mm", type: "number", step: 0.5, min: 1 },
    { key: "penPocketCornerRadius", label: "Pen pocket corner radius", unit: "mm", type: "number", step: 0.1, min: 0 },
    { key: "penPocketGap", label: "Gap between pen pockets", unit: "mm", type: "number", step: 1, min: 0 },
  ]},
  { group: "Fasteners", component: "screws", items: [
    { key: "chicagoScrewCount", label: "Chicago screw count", type: "number", step: 1, min: 1 },
    { key: "chicagoScrewDiameter", label: "Screw diameter", unit: "mm", type: "number", step: 0.1, min: 0.5 },
    { key: "chicagoScrewSpineOffset", label: "Screw spine offset", unit: "mm", type: "number", step: 0.5, min: 0 },
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
  ]},
  { group: "Interior", component: "cavity", items: [
    { key: "interiorLayerCount", label: "Interior layer count", type: "number", step: 1, min: 1 },
    { key: "interiorPocketGrowthPerLayer", label: "Pocket growth per layer", unit: "mm", type: "number", step: 0.1, min: 0 },
  ]},
  { group: "Leather Spine", component: "leather", items: [
    { key: "leatherWrapAllowance", label: "Wrap allowance (beyond stack thickness)", unit: "mm", type: "number", step: 0.5, min: 0 },
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
