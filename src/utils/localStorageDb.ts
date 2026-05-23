import { TrackedLocation } from "../types";

const LOCAL_STORAGE_KEY = "loc-spy-tracer-db";
const DEVICE_ID_KEY = "loc-spy-tracer-my-device-id";

// Default tracked locations list starts empty to ensure zero fake logs populate the database
const DEFAULT_LOCATIONS: TrackedLocation[] = [];

export const getOrInitDeviceId = (): string => {
  if (typeof window === "undefined") return "LST-BROWSER-MOCK";
  let existingId = localStorage.getItem(DEVICE_ID_KEY);
  if (!existingId) {
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const hexPart = Math.random().toString(16).substring(2, 6).toUpperCase();
    existingId = `LST-BEACON-${randPart}-${hexPart}`;
    localStorage.setItem(DEVICE_ID_KEY, existingId);
  }
  return existingId;
};

export const getTrackedLocations = (): TrackedLocation[] => {
  if (typeof window === "undefined") return DEFAULT_LOCATIONS;
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    // Initialize DB with beautiful dummy workshop records
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_LOCATIONS));
    return DEFAULT_LOCATIONS;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse LOC-SPY-TRACER local DB. Reinitializing...", e);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_LOCATIONS));
    return DEFAULT_LOCATIONS;
  }
};

export const saveTrackedLocations = (locations: TrackedLocation[]): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(locations));
};

export const addTrackedLocation = (loc: Omit<TrackedLocation, "id">): TrackedLocation => {
  const list = getTrackedLocations();
  const idValue = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record: TrackedLocation = {
    ...loc,
    id: idValue,
  };
  const updated = [record, ...list];
  saveTrackedLocations(updated);
  return record;
};

export const clearDatabase = (): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_LOCATIONS));
};
