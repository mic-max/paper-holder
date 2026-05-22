import { schema, COMPONENT_COLORS } from "./params.js";
import { buildBack } from "./parts/back.js";
import { buildCover } from "./parts/cover.js";
import { buildInteriorLayer } from "./parts/interior.js";
import { buildLeatherSpine } from "./parts/leather.js";
import { getHingeNames } from "./hinge.js";
import { downloadPart, downloadAllZipped } from "./download.js";
import {
  loadState, saveActive, saveAs, selectProfile, deleteProfile, resetActiveToDefaults,
} from "./profiles.js";

let params;          // live params object (auto-saved into active profile on change)
let activeName;      // active profile name
let inputs = {};     // key -> input element (so we can refresh values on profile switch)

const formEl = document.getElementById("form");
const previewsEl = document.getElementById("previews");
const grainToggle = document.getElementById("grainToggle");
const downloadAllBtn = document.getElementById("downloadAll");
const profileSelect = document.getElementById("profileSelect");
const saveAsBtn = document.getElementById("saveAsBtn");
const deleteBtn = document.getElementById("deleteBtn");
const resetBtn = document.getElementById("resetBtn");

function repopulateProfileSelect(names, active) {
  profileSelect.innerHTML = "";
  for (const n of names) {
    const opt = document.createElement("option");
    opt.value = n; opt.textContent = n;
    profileSelect.appendChild(opt);
  }
  profileSelect.value = active;
}

function buildForm() {
  formEl.innerHTML = "";
  inputs = {};

  const note = document.createElement("p");
  note.className = "units-note";
  note.textContent = "All dimensions in mm.";
  formEl.appendChild(note);

  for (const group of schema) {
    const fs = document.createElement("fieldset");
    const accent = group.component ? COMPONENT_COLORS[group.component] : null;
    if (accent) {
      fs.style.borderLeft = `4px solid ${accent}`;
    }
    const lg = document.createElement("legend");
    if (accent) {
      const swatch = document.createElement("span");
      swatch.className = "legend-swatch";
      swatch.style.background = accent;
      lg.appendChild(swatch);
    }
    lg.appendChild(document.createTextNode(group.group));
    fs.appendChild(lg);
    for (const item of group.items) {
      const row = document.createElement("label");
      row.className = "row";
      const span = document.createElement("span");
      span.textContent = item.label;
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
      } else if (item.type === "checkbox") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!params[item.key];
      } else {
        input = document.createElement("input");
        input.type = "number";
        if (item.step != null) input.step = item.step;
        if (item.min != null) input.min = item.min;
        input.value = params[item.key];
      }
      input.addEventListener("input", () => {
        if (input.type === "checkbox") params[item.key] = input.checked;
        else if (input.type === "number") params[item.key] = Number(input.value);
        else params[item.key] = input.value;
        saveActive(params);
        render();
      });
      inputs[item.key] = input;
      row.appendChild(input);
      fs.appendChild(row);
    }
    formEl.appendChild(fs);
  }
}

function refreshFormValues() {
  for (const [key, input] of Object.entries(inputs)) {
    if (input.type === "checkbox") input.checked = !!params[key];
    else input.value = params[key];
  }
}

function collectParts() {
  const parts = [];
  parts.push(buildLeatherSpine(params));
  parts.push(buildCover(params));
  for (let i = params.interiorLayerCount - 1; i >= 0; i--) {
    parts.push(buildInteriorLayer(params, i));
  }
  parts.push(buildBack(params));
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
    const w = Number(part.svg.getAttribute("data-natural-width")) || 0;
    const h = Number(part.svg.getAttribute("data-natural-height")) || 0;
    const dims = document.createElement("span");
    dims.className = "card-dims";
    dims.textContent = ` — ${w.toFixed(1)} × ${h.toFixed(1)} mm`;
    title.textContent = part.name;
    title.appendChild(dims);
    const dlBtn = document.createElement("button");
    dlBtn.textContent = "Download SVG";
    dlBtn.addEventListener("click", () => downloadPart(part.name, part.svg, params));
    header.appendChild(title);
    header.appendChild(dlBtn);
    card.appendChild(header);

    const svgWrap = document.createElement("div");
    svgWrap.className = "svg-wrap";
    svgWrap.appendChild(part.svg);
    card.appendChild(svgWrap);

    previewsEl.appendChild(card);
  }
}

// --- Initial load ---
{
  const state = loadState();
  params = state.params;
  activeName = state.activeName;
  repopulateProfileSelect(state.names, activeName);
  grainToggle.checked = !!params.showGrain;
  buildForm();
  render();
}

// --- Top-bar handlers ---

grainToggle.addEventListener("change", () => {
  params.showGrain = grainToggle.checked;
  saveActive(params);
  render();
});

downloadAllBtn.addEventListener("click", () => {
  const fresh = collectParts();
  downloadAllZipped(fresh, params);
});

profileSelect.addEventListener("change", () => {
  const state = selectProfile(profileSelect.value);
  params = state.params;
  activeName = state.activeName;
  grainToggle.checked = !!params.showGrain;
  refreshFormValues();
  render();
});

saveAsBtn.addEventListener("click", () => {
  const name = window.prompt("New profile name:", "");
  if (!name) return;
  const state = saveAs(name, params);
  activeName = state.activeName;
  repopulateProfileSelect(state.names, activeName);
});

deleteBtn.addEventListener("click", () => {
  if (!window.confirm(`Delete profile "${activeName}"?`)) return;
  const state = deleteProfile(activeName);
  if (!state) return;
  params = state.params;
  activeName = state.activeName;
  repopulateProfileSelect(state.names, activeName);
  grainToggle.checked = !!params.showGrain;
  refreshFormValues();
  render();
});

resetBtn.addEventListener("click", () => {
  if (!window.confirm(`Reset profile "${activeName}" to built-in defaults?`)) return;
  params = resetActiveToDefaults();
  grainToggle.checked = !!params.showGrain;
  refreshFormValues();
  render();
});
