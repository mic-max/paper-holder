// localStorage-backed profile manager.

import { mergeParams } from "./params.js";

const KEY = "paperHolder:v1";
// Legacy global lock set (locks used to be shared across all profiles). Migrated
// into the active profile on first load, then removed.
const LEGACY_LOCKED_KEY = "paperHolder:locked:v1";

function readStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || !obj.profiles) return null;
    if (!obj.locked || typeof obj.locked !== "object") obj.locked = {};
    return obj;
  } catch {
    return null;
  }
}

function writeStore(store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

function freshDefaults() {
  return mergeParams({});
}

// Locked keys for a profile, as a plain array (safe for JSON / never undefined).
function lockedFor(store, name) {
  const arr = store.locked?.[name];
  return Array.isArray(arr) ? arr : [];
}

// One-time migration: fold the old global lock set into the active profile.
function migrateLegacyLocks(store) {
  let raw;
  try { raw = localStorage.getItem(LEGACY_LOCKED_KEY); } catch { return; }
  if (raw == null) return;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length && !store.locked[store.activeProfile]) {
      store.locked[store.activeProfile] = arr;
    }
  } catch { /* ignore malformed legacy data */ }
  try { localStorage.removeItem(LEGACY_LOCKED_KEY); } catch {}
}

export function loadState() {
  let store = readStore();
  if (!store) {
    store = { activeProfile: "default", profiles: { default: freshDefaults() }, locked: {} };
    writeStore(store);
  }
  if (!store.profiles[store.activeProfile]) {
    store.activeProfile = Object.keys(store.profiles)[0] || "default";
    if (!store.profiles[store.activeProfile]) {
      store.profiles[store.activeProfile] = freshDefaults();
    }
    writeStore(store);
  }
  migrateLegacyLocks(store);
  writeStore(store);
  // Merge in any new default keys added since the profile was last saved
  const params = mergeParams(store.profiles[store.activeProfile]);
  return {
    activeName: store.activeProfile,
    params,
    names: Object.keys(store.profiles),
    locked: lockedFor(store, store.activeProfile),
  };
}

export function saveActive(params, locked) {
  const store = readStore() || { activeProfile: "default", profiles: {}, locked: {} };
  store.profiles[store.activeProfile] = { ...params };
  if (locked) store.locked[store.activeProfile] = [...locked];
  writeStore(store);
}

export function saveAs(name, params, locked) {
  const trimmed = String(name).trim();
  if (!trimmed) throw new Error("Profile name cannot be empty");
  const store = readStore() || { activeProfile: trimmed, profiles: {}, locked: {} };
  store.profiles[trimmed] = { ...params };
  store.locked[trimmed] = locked ? [...locked] : [];
  store.activeProfile = trimmed;
  writeStore(store);
  return { activeName: trimmed, names: Object.keys(store.profiles) };
}

export function selectProfile(name) {
  const store = readStore();
  if (!store || !store.profiles[name]) throw new Error(`Unknown profile: ${name}`);
  store.activeProfile = name;
  writeStore(store);
  const params = mergeParams(store.profiles[name]);
  return {
    activeName: name,
    params,
    names: Object.keys(store.profiles),
    locked: lockedFor(store, name),
  };
}

export function deleteProfile(name) {
  const store = readStore();
  if (!store || !store.profiles[name]) return null;
  delete store.profiles[name];
  delete store.locked[name];
  if (!Object.keys(store.profiles).length) {
    store.profiles.default = freshDefaults();
  }
  if (store.activeProfile === name) {
    store.activeProfile = Object.keys(store.profiles)[0];
  }
  writeStore(store);
  return {
    activeName: store.activeProfile,
    params: mergeParams(store.profiles[store.activeProfile]),
    names: Object.keys(store.profiles),
    locked: lockedFor(store, store.activeProfile),
  };
}

export function resetActiveToDefaults() {
  const store = readStore() || { activeProfile: "default", profiles: {}, locked: {} };
  store.profiles[store.activeProfile] = freshDefaults();
  writeStore(store);
  // Locks are a workflow aid, not part data — preserved across a defaults reset.
  return { params: { ...freshDefaults() }, locked: lockedFor(store, store.activeProfile) };
}
