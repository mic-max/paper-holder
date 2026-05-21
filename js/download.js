// Serialize an SVG node and trigger a browser download.
// `previewSvg` is the live preview node; we clone it and strip preview-only artifacts,
// then swap stroke widths to the export value so cuts are laser-detectable.

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';

export function downloadPart(name, previewSvg, params) {
  const exportSvg = toExportSvg(previewSvg, params);
  const xml = XML_DECL + new XMLSerializer().serializeToString(exportSvg);
  const blob = new Blob([xml], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadAll(parts, params) {
  // Sequential with a short delay so the browser actually fires each save dialog.
  for (const { name, svg } of parts) {
    downloadPart(name, svg, params);
    await new Promise((r) => setTimeout(r, 150));
  }
}

function toExportSvg(previewSvg, params) {
  const clone = previewSvg.cloneNode(true);
  // Restore explicit physical size — the preview pane strips width/height for CSS scaling.
  clone.setAttribute("width", `${params.bedWidth}mm`);
  clone.setAttribute("height", `${params.bedDepth}mm`);
  clone.setAttribute("viewBox", `0 0 ${params.bedWidth} ${params.bedDepth}`);
  // Strip preview-only nodes
  for (const sel of [".bed-outline", ".grain-overlay", ".guide"]) {
    clone.querySelectorAll(sel).forEach((n) => n.remove());
  }
  // Swap stroke widths on geometry groups
  for (const g of clone.querySelectorAll("g.cut, g.etch")) {
    g.setAttribute("stroke-width", String(params.exportStrokeWidth));
  }
  return clone;
}
