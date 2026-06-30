import { schema, COMPONENT_COLORS, stackThickness } from "./params.js";
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

// Locked dimensions: disables the input so it can't be changed. Stored per
// profile (alongside params) so each profile remembers its own locks.
let lockedKeys = new Set();

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
const unitsToggle = document.getElementById("unitsToggle");

// Display units for the dimension readouts (the design itself is always mm). Persisted.
const UNITS_KEY = "paperHolder:units:v1";
let unitSystem = (() => {
  try { return localStorage.getItem(UNITS_KEY) === "imperial" ? "imperial" : "metric"; }
  catch { return "metric"; }
})();
const MM_PER_IN = 25.4;
const unitLabel = () => (unitSystem === "imperial" ? "in" : "mm");
const fmtVal = (mm) => (unitSystem === "imperial" ? (mm / MM_PER_IN).toFixed(2) : mm.toFixed(1));
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
    // Groups may carry a static `items` array or a function that derives items
    // from the current params (e.g. one thickness field per layer).
    const items = typeof group.items === "function" ? group.items(params) : group.items;
    for (const item of items) {
      const row = document.createElement("label");
      row.className = "row";
      const span = document.createElement("span");
      span.textContent = item.label;
      row.appendChild(span);

      // Array-backed fields supply get/set; plain fields read/write params[key].
      const readParam = () => (item.get ? item.get(params) : params[item.key]);
      const writeParam = (v) => { if (item.set) item.set(params, v); else params[item.key] = v; };

      let input;
      if (item.type === "select") {
        input = document.createElement("select");
        const opts = item.optionsFrom === "hinge" ? getHingeNames() : [];
        for (const o of opts) {
          const opt = document.createElement("option");
          opt.value = o; opt.textContent = o;
          input.appendChild(opt);
        }
        input.value = readParam();
      } else if (item.type === "color") {
        input = document.createElement("input");
        input.type = "color";
        input.value = readParam();
      } else if (item.type === "text") {
        input = document.createElement("input");
        input.type = "text";
        input.value = readParam();
      } else if (item.type === "checkbox") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!readParam();
      } else {
        input = document.createElement("input");
        input.type = "number";
        if (item.step != null) input.step = item.step;
        if (item.min != null) input.min = item.min;
        input.value = readParam();
      }
      const readInput = () =>
        input.type === "checkbox" ? input.checked
        : input.type === "number" ? Number(input.value)
        : input.value;
      // Live update on every keystroke (no structural change).
      input.addEventListener("input", () => {
        writeParam(readInput());
        saveActive(params, lockedKeys);
        render();
      });
      // Fields that change the field list (e.g. layer count) resize/rebuild on commit
      // only, so typing a multi-digit value doesn't tear down the form mid-edit.
      if (item.rebuildsForm) {
        input.addEventListener("change", () => {
          writeParam(readInput());
          if (item.afterChange) item.afterChange(params);
          saveActive(params, lockedKeys);
          buildForm();
          render();
        });
      }
      inputs[item.key] = input;
      row.appendChild(input);

      const lockBtn = document.createElement("button");
      lockBtn.type = "button";
      lockBtn.className = "lock-btn";
      lockBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (lockedKeys.has(item.key)) lockedKeys.delete(item.key);
        else lockedKeys.add(item.key);
        saveActive(params, lockedKeys);
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

function collectParts() {
  const T = params.layerThicknesses; // [cover, interior 1..N, back]
  const parts = [];

  const leather = buildLeatherSpine(params);
  leather.thickness = params.leatherThickness;
  parts.push(leather);

  const cover = buildCover(params);
  cover.thickness = T[0];
  parts.push(cover);

  // Each interior layer is unique (per-layer cavity growth), so render one card per layer.
  // Cards are emitted top-first (layer index N-1 .. 0); layer index i uses thickness slot i+1.
  const interior = params.interiorSplit
    ? buildInteriorLayers(params)
    : Array.from({ length: params.interiorLayerCount },
        (_, k) => buildInteriorLayer(params, params.interiorLayerCount - 1 - k));
  interior.forEach((part, k) => {
    const layerIndex = params.interiorLayerCount - 1 - k;
    part.thickness = T[layerIndex + 1];
    parts.push(part);
  });

  const back = buildBack(params);
  back.thickness = T[T.length - 1];
  parts.push(back);

  return parts;
}

let currentParts = [];

// Assembled outer dimensions for the toolbar readout.
// Footprint W×H matches the cover/back; thickness stacks cover + interior layers + back
// (each one material sheet) plus the leather spine wrapping both faces (×2).
function updateFinalDims() {
  const { outerW, outerD } = outerFootprint(params);
  const thickness = stackThickness(params) + 2 * params.leatherThickness;
  finalDimsEl.textContent =
    `Final: ${fmtVal(outerW)} × ${fmtVal(outerD)} × ${fmtVal(thickness)} ${unitLabel()}`;
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
    const t = part.thickness;
    const thk = t != null ? ` × ${fmtVal(t)}` : "";
    dims.textContent = ` — ${fmtVal(w)} × ${fmtVal(h)}${thk} ${unitLabel()}`;
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
  lockedKeys = new Set(state.locked);
  repopulateProfileSelect(state.names, activeName);
  grainToggle.checked = !!params.showGrain;
  unitsToggle.textContent = `Units: ${unitLabel()}`;
  buildForm();
  render();
}

// --- Top-bar handlers ---

grainToggle.addEventListener("change", () => {
  params.showGrain = grainToggle.checked;
  saveActive(params);
  render();
});

unitsToggle.addEventListener("click", () => {
  unitSystem = unitSystem === "imperial" ? "metric" : "imperial";
  try { localStorage.setItem(UNITS_KEY, unitSystem); } catch {}
  unitsToggle.textContent = `Units: ${unitLabel()}`;
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
  lockedKeys = new Set(state.locked);
  grainToggle.checked = !!params.showGrain;
  buildForm();
  render();
});

saveAsBtn.addEventListener("click", () => {
  const name = window.prompt("New profile name:", "");
  if (!name) return;
  const state = saveAs(name, params, lockedKeys);
  activeName = state.activeName;
  repopulateProfileSelect(state.names, activeName);
});

deleteBtn.addEventListener("click", () => {
  if (!window.confirm(`Delete profile "${activeName}"?`)) return;
  const state = deleteProfile(activeName);
  if (!state) return;
  params = state.params;
  activeName = state.activeName;
  lockedKeys = new Set(state.locked);
  repopulateProfileSelect(state.names, activeName);
  grainToggle.checked = !!params.showGrain;
  buildForm();
  render();
});

resetBtn.addEventListener("click", () => {
  if (!window.confirm(`Reset profile "${activeName}" to built-in defaults?`)) return;
  const state = resetActiveToDefaults();
  params = state.params;
  lockedKeys = new Set(state.locked);
  grainToggle.checked = !!params.showGrain;
  buildForm();
  render();
});
