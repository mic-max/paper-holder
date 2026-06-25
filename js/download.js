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

  // Apply the 90° rotation (or identity) on the bed-content wrapper.
  // Natural dimensions were stashed on the root by createBedSvg.
  const naturalH = Number(clone.getAttribute("data-natural-height")) || 0;
  const wrapper = clone.querySelector("g.bed-content");
  if (wrapper) {
    if (params.rotateOnBed !== false) {
      // rotate(90) maps (x,y)->(-y,x); translate brings the rotated bbox back into
      // positive coords with the original PART_ORIGIN margin preserved.
      wrapper.setAttribute("transform", `translate(${naturalH + 20}, 0) rotate(90)`);
    } else {
      wrapper.removeAttribute("transform");
    }
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
