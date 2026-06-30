// Serialize SVG nodes and trigger downloads.

import { buildZip } from "./zip.js";

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';

export function downloadPart(name, previewSvg, params) {
  const xml = serializeForExport(previewSvg, params);
  triggerDownload(`${name}.svg`, new Blob([xml], { type: "image/svg+xml" }));
}

export function downloadAllZipped(parts, params, zipName = "paper-holder-svgs.zip") {
  const files = parts.map(({ name, svg }) => ({
    name: `${name}.svg`,
    bytes: serializeForExport(svg, params),
  }));
  const zipBytes = buildZip(files);
  triggerDownload(zipName, new Blob([zipBytes], { type: "application/zip" }));
}

function serializeForExport(previewSvg, params) {
  const exportSvg = toExportSvg(previewSvg, params);
  return XML_DECL + new XMLSerializer().serializeToString(exportSvg);
}

function triggerDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toExportSvg(previewSvg, params) {
  const clone = previewSvg.cloneNode(true);

  // Re-size the document to the laser bed.
  clone.setAttribute("width", `${params.bedWidth}mm`);
  clone.setAttribute("height", `${params.bedDepth}mm`);
  clone.setAttribute("viewBox", `0 0 ${params.bedWidth} ${params.bedDepth}`);

  // Apply the export rotation on the bed-content wrapper. The angle combines the global
  // rotateOnBed (90° for the long case parts) with any per-part `data-export-rotate`
  // (e.g. head/foot bars add another 90°). Natural dims were stashed by createBedSvg;
  // each quarter-turn needs a matching translate to keep coords in the positive quadrant.
  const naturalW = Number(clone.getAttribute("data-natural-width")) || 0;
  const naturalH = Number(clone.getAttribute("data-natural-height")) || 0;
  const vbW = naturalW + 20, vbH = naturalH + 20; // viewBox = natural + 2 * PART_ORIGIN margin
  const base = params.rotateOnBed !== false ? 90 : 0;
  const extra = Number(clone.getAttribute("data-export-rotate")) || 0;
  const theta = ((base + extra) % 360 + 360) % 360;
  const wrapper = clone.querySelector("g.bed-content");
  if (wrapper) {
    let transform = "";
    if (theta === 90) transform = `translate(${vbH}, 0) rotate(90)`;       // (x,y)->(-y,x)
    else if (theta === 180) transform = `translate(${vbW}, ${vbH}) rotate(180)`;
    else if (theta === 270) transform = `translate(0, ${vbW}) rotate(270)`; // (x,y)->(y,-x)
    if (transform) wrapper.setAttribute("transform", transform);
    else wrapper.removeAttribute("transform");
  }

  // Strip preview-only nodes
  for (const sel of [".grain-overlay", ".guide"]) {
    clone.querySelectorAll(sel).forEach((n) => n.remove());
  }
  // Swap stroke widths to the export value on all geometry groups
  for (const g of clone.querySelectorAll("g.cut, g.etch")) {
    g.setAttribute("stroke-width", String(params.exportStrokeWidth));
  }
  // Remove per-component preview-only stroke overrides so children fall back to
  // inheriting params.cutColor from the parent cut group.
  for (const sg of clone.querySelectorAll("[data-component]")) {
    sg.removeAttribute("stroke");
  }
  return clone;
}
