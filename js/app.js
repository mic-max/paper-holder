import { schema, COMPONENT_COLORS } from "./params.js";
import { buildBack } from "./parts/back.js";
import { buildCover } from "./parts/cover.js";
import { buildInteriorLayer } from "./parts/interior.js";
import { buildInteriorLayers } from "./parts/interiorPieces.js";
import { outerFootprint } from "./parts/geometry.js";
import { buildLeatherSpine } from "./parts/leather.js";
import { getHingeNames } from "./hinge.js";
import { downloadPart, downloadAllZipped } from "./download.js";
import {
  loadState, saveActive, saveAs, selectProfile, deleteProfile, resetActiveToDefaults,
} from "./profiles.js";

let params;          // live params object (auto-saved into active profile on change)
let activeName;      // active profile name
let inputs = {};     // key -> input element (so we can refresh values on profile switch)

// Locked dimensions (UI-only): disables the input so it can't be changed.
// Kept separate from profiles since it's a workflow aid, not part design data.
const LOCKED_KEY = "paperHolder:locked:v1";
const lockedKeys = loadLockedKeys();

function loadLockedKeys() {
  try {
    const raw = localStorage.getItem(LOCKED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveLockedKeys() {
  localStorage.setItem(LOCKED_KEY, JSON.stringify([...lockedKeys]));
}

function applyLockState(key) {
  const input = inputs[key];
  const lockBtn = lockBtns[key];
  if (!input || !lockBtn) return;
  const locked = lockedKeys.has(key);
  input.disabled = locked;
  lockBtn.textContent = locked ? "🔒" : "🔓";
  lockBtn.classList.toggle("locked", locked);
  lockBtn.setAttribute("aria-pressed", String(locked));
  lockBtn.title = locked ? "Unlock to edit" : "Lock to prevent edits";
  lockBtn.closest(".row")?.classList.toggle("row-locked", locked);
}

let lockBtns = {};   // key -> padlock button element

const formEl = document.getElementById("form");
const previewsEl = document.getElementById("previews");
const grainToggle = document.getElementById("grainToggle");
const downloadAllBtn = document.getElementById("downloadAll");
const finalDimsEl = document.getElementById("finalDims");
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
  lockBtns = {};

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

      const lockBtn = document.createElement("button");
      lockBtn.type = "button";
      lockBtn.className = "lock-btn";
      lockBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (lockedKeys.has(item.key)) lockedKeys.delete(item.key);
        else lockedKeys.add(item.key);
        saveLockedKeys();
        applyLockState(item.key);
      });
      lockBtns[item.key] = lockBtn;
      row.appendChild(lockBtn);

      fs.appendChild(row);
      applyLockState(item.key);
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

// Solid (non-split) interior layers, deduped: when there's no per-layer pocket growth, every
// non-top layer is identical, so collapse them into one card ×(N-1) plus the magnet-bearing
// top. With growth, layers differ, so show them individually.
function buildSolidInteriorLayers() {
  const N = params.interiorLayerCount;
  if (params.interiorPocketGrowthPerLayer !== 0) {
    const out = [];
    for (let i = N - 1; i >= 0; i--) out.push(buildInteriorLayer(params, i));
    return out;
  }
  const out = [];
  const nonTopCount = N - 1;
  if (nonTopCount > 0) {
    const layer = buildInteriorLayer(params, 0); // index 0 is non-top when N > 1
    layer.name = "layer";
    layer.count = nonTopCount;
    layer.exports = [{ name: nonTopCount > 1 ? `layer-x${nonTopCount}` : "layer", svg: layer.svg }];
    out.push(layer);
  }
  const top = buildInteriorLayer(params, N - 1);
  top.name = "layer-top";
  top.count = 1;
  top.exports = [{ name: "layer-top", svg: top.svg }];
  out.push(top);
  return out;
}

function collectParts() {
  const parts = [];
  parts.push(buildLeatherSpine(params));
  parts.push(buildCover(params));
  if (params.interiorSplit) {
    // Unique layer types (odd/even) preview assembled; exports are deduped pieces.
    parts.push(...buildInteriorLayers(params));
  } else {
    parts.push(...buildSolidInteriorLayers());
  }
  parts.push(buildBack(params));
  return parts;
}

let currentParts = [];

// Assembled outer dimensions for the toolbar readout.
// Footprint W×H matches the cover/back; thickness stacks cover + interior layers + back
// (each one material sheet) plus the leather spine wrapping both faces (×2).
function updateFinalDims() {
  const { outerW, outerD } = outerFootprint(params);
  const thickness =
    (params.interiorLayerCount + 2) * params.materialThickness +
    2 * params.leatherThickness;
  finalDimsEl.textContent =
    `Final: ${outerW.toFixed(1)} × ${outerD.toFixed(1)} × ${thickness.toFixed(1)} mm`;
}

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
    title.textContent = part.count ? `${part.name} ×${part.count}` : part.name;
    title.appendChild(dims);
    const exports = part.exports || [{ name: part.name, svg: part.svg }];
    const dlBtn = document.createElement("button");
    dlBtn.textContent = exports.length > 1 ? `Download ${exports.length} SVGs` : "Download SVG";
    dlBtn.addEventListener("click", () => {
      for (const ex of exports) downloadPart(ex.name, ex.svg, params);
    });
    header.appendChild(title);
    header.appendChild(dlBtn);
    card.appendChild(header);

    const svgWrap = document.createElement("div");
    svgWrap.className = "svg-wrap";
    svgWrap.appendChild(part.svg);
    card.appendChild(svgWrap);

    previewsEl.appendChild(card);
  }
  updateFinalDims();
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
  // Flatten assembled-preview layers into their export pieces, dropping duplicate files
  // (the same deduped piece can be reachable from more than one preview card).
  const seen = new Set();
  const fresh = collectParts()
    .flatMap((p) => p.exports || [{ name: p.name, svg: p.svg }])
    .filter((f) => (seen.has(f.name) ? false : (seen.add(f.name), true)));
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
