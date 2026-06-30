// Hole-fit gauge (test mode): a narrow rectangle with a column of holes whose diameters
// step across a range, each etched with its size, so you can cut it once and pick the
// diameter that best fits a part (chicago screw, magnet, ...) before committing.
// `cfg` = { name, width, min, max, step, spacing } in mm.

import { createBedSvg, kerfRect, kerfCircle, componentGroup, el } from "../svg.js";
import { PART_ORIGIN } from "./geometry.js";

export function buildHoleGauge(params, cfg, { preview = true } = {}) {
  const width = Math.max(1, cfg.width);
  const step = Math.max(0.01, cfg.step);
  const spacing = Math.max(1, cfg.spacing);
  const min = cfg.min;
  const max = Math.max(min, cfg.max);
  const count = Math.max(1, Math.round((max - min) / step) + 1);
  const endMargin = spacing / 2;
  const length = count * spacing; // endMargin + (count-1)*spacing + endMargin

  const { svg, cut, etch } = createBedSvg(params, {
    preview, partNaturalWidth: width, partNaturalHeight: length,
  });
  const { x: ox, y: oy } = PART_ORIGIN;

  // Rectangle outline.
  componentGroup(cut, "perimeter").appendChild(
    kerfRect(ox, oy, width, length, params.kerf, "outer")
  );

  // Column of stepped holes, centered across the width, each labelled to its right.
  const holes = componentGroup(cut, "screws");
  const cx = ox + width / 2;
  const fontSize = Math.min(4, spacing * 0.35);
  for (let i = 0; i < count; i++) {
    const d = min + i * step;
    const cy = oy + endMargin + i * spacing;
    holes.appendChild(kerfCircle(cx, cy, d / 2, params.kerf, "hole"));
    const label = el("text", {
      x: cx + d / 2 + 2, y: cy,
      "text-anchor": "start", "dominant-baseline": "central",
      "font-size": fontSize, "font-family": "sans-serif",
      fill: params.etchColor, stroke: "none",
    });
    label.textContent = d.toFixed(1);
    etch.appendChild(label);
  }

  return { name: cfg.name, svg };
}
