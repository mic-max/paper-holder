// localStorage-backed profile manager.

import { defaults } from "./params.js";

const KEY = "paperHolder:v1";

function readStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || !obj.profiles) return null;
    return obj;
  } catch {
    return null;
  }
}

function writeStore(store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

function freshDefaults() {
  return { ...defaults };
}

export function loadState() {
  let store = readStore();
  if (!store) {
    store = { activeProfile: "default", profiles: { default: freshDefaults() } };
    writeStore(store);
  }
  if (!store.profiles[store.activeProfile]) {
    store.activeProfile = Object.keys(store.profiles)[0] || "default";
    if (!store.profiles[store.activeProfile]) {
      store.profiles[store.activeProfile] = freshDefaults();
    }
    writeStore(store);
  }
  // Merge in any new default keys added since the profile was last saved
  const params = { ...freshDefaults(), ...store.profiles[store.activeProfile] };
  return {
    activeName: store.activeProfile,
    params,
    names: Object.keys(store.profiles),
  };
}

export function saveActive(params) {
  const store = readStore() || { activeProfile: "default", profiles: {} };
  store.profiles[store.activeProfile] = { ...params };
  writeStore(store);
}

export function saveAs(name, params) {
  const trimmed = String(name).trim();
  if (!trimmed) throw new Error("Profile name cannot be empty");
  const store = readStore() || { activeProfile: trimmed, profiles: {} };
  store.profiles[trimmed] = { ...params };
  store.activeProfile = trimmed;
  writeStore(store);
  return { activeName: trimmed, names: Object.keys(store.profiles) };
}

export function selectProfile(name) {
  const store = readStore();
  if (!store || !store.profiles[name]) throw new Error(`Unknown profile: ${name}`);
  store.activeProfile = name;
  writeStore(store);
  const params = { ...freshDefaults(), ...store.profiles[name] };
  return { activeName: name, params, names: Object.keys(store.profiles) };
}

export function deleteProfile(name) {
  const store = readStore();
  if (!store || !store.profiles[name]) return null;
  delete store.profiles[name];
  if (!Object.keys(store.profiles).length) {
    store.profiles.default = freshDefaults();
  }
  if (store.activeProfile === name) {
    store.activeProfile = Object.keys(store.profiles)[0];
  }
  writeStore(store);
  return {
    activeName: store.activeProfile,
    params: { ...freshDefaults(), ...store.profiles[store.activeProfile] },
    names: Object.keys(store.profiles),
  };
}

export function resetActiveToDefaults() {
  const store = readStore() || { activeProfile: "default", profiles: {} };
  store.profiles[store.activeProfile] = freshDefaults();
  writeStore(store);
  return { ...freshDefaults() };
}
