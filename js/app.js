import { defaults, schema } from "./params.js";
import { buildBack } from "./parts/back.js";
import { buildCover } from "./parts/cover.js";
import { buildInteriorLayer } from "./parts/interior.js";
import { getHingeNames } from "./hinge.js";
import { downloadPart, downloadAll } from "./download.js";

const params = { ...defaults };
const formEl = document.getElementById("form");
const previewsEl = document.getElementById("previews");
const grainToggle = document.getElementById("grainToggle");
const downloadAllBtn = document.getElementById("downloadAll");

function buildForm() {
  formEl.innerHTML = "";
  for (const group of schema) {
    const fs = document.createElement("fieldset");
    const lg = document.createElement("legend");
    lg.textContent = group.group;
    fs.appendChild(lg);
    for (const item of group.items) {
      const row = document.createElement("label");
      row.className = "row";
      const span = document.createElement("span");
      span.textContent = item.label + (item.unit ? ` (${item.unit})` : "");
      row.appendChild(span);

      let input;
      if (item.type === "select") {
        input = document.createElement("select");
        const opts = item.optionsFrom === "hinge" ? getHingeNames() : [];
        for (const o of opts) {
          const opt = document.createElement("option");
          opt.value = o; opt.textContent = o;
          input.appendChild(opt);
        }
        input.value = params[item.key];
      } else if (item.type === "color") {
        input = document.createElement("input");
        input.type = "color";
        input.value = params[item.key];
      } else {
        input = document.createElement("input");
        input.type = "number";
        if (item.step != null) input.step = item.step;
        if (item.min != null) input.min = item.min;
        input.value = params[item.key];
      }
      input.addEventListener("input", () => {
        const v = input.value;
        params[item.key] = (input.type === "number") ? Number(v) : v;
        render();
      });
      row.appendChild(input);
      fs.appendChild(row);
    }
    formEl.appendChild(fs);
  }
}

function collectParts() {
  const parts = [];
  parts.push(buildBack(params));
  for (let i = 0; i < params.interiorLayerCount; i++) {
    parts.push(buildInteriorLayer(params, i));
  }
  parts.push(buildCover(params));
  return parts;
}

let currentParts = [];

function render() {
  previewsEl.innerHTML = "";
  currentParts = collectParts();
  for (const part of currentParts) {
    const card = document.createElement("div");
    card.className = "card";
    const header = document.createElement("div");
    header.className = "card-header";
    const title = document.createElement("h3");
    title.textContent = part.name;
    const dlBtn = document.createElement("button");
    dlBtn.textContent = "Download SVG";
    dlBtn.addEventListener("click", () => downloadPart(part.name, part.svg, params));
    header.appendChild(title);
    header.appendChild(dlBtn);
    card.appendChild(header);

    const svgWrap = document.createElement("div");
    svgWrap.className = "svg-wrap";
    // Force on-screen rendering at a manageable size via CSS; the SVG keeps its mm intrinsic size.
    part.svg.removeAttribute("width");
    part.svg.removeAttribute("height");
    svgWrap.appendChild(part.svg);
    card.appendChild(svgWrap);

    previewsEl.appendChild(card);
  }
}

grainToggle.addEventListener("change", () => {
  params.showGrain = grainToggle.checked;
  render();
});

downloadAllBtn.addEventListener("click", () => {
  // Rebuild fresh nodes so each download gets its own un-mutated tree.
  const fresh = collectParts();
  downloadAll(fresh, params);
});

buildForm();
render();
