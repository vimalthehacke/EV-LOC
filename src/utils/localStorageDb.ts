import { TrackedLocation } from "../types";

const DEVICE_ID_KEY = "zonedel-courier-device-id";

// Clean in-memory reference to satisfy "no database storage" requirements
export const getOrInitDeviceId = (): string => {
  if (typeof window === "undefined") return "ZD-BROWSER-NODE";
  let existingId = localStorage.getItem(DEVICE_ID_KEY);
  if (!existingId) {
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const hexPart = Math.random().toString(16).substring(2, 6).toUpperCase();
    existingId = `ZONEDEL-${randPart}-${hexPart}`;
    localStorage.setItem(DEVICE_ID_KEY, existingId);
  }
  return existingId;
};

// Return empty list of locations to prevent any client-side persistence of coordinates
export const getTrackedLocations = (): TrackedLocation[] => {
  return [];
};

export const saveTrackedLocations = (locations: TrackedLocation[]): void => {
  // No-op: Satisfies NO DB STORAGE
};

export const addTrackedLocation = (loc: Omit<TrackedLocation, "id">): TrackedLocation => {
  const idValue = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record: TrackedLocation = {
    ...loc,
    id: idValue,
  };
  return record;
};

export const clearDatabase = (): void => {
  // No-op: Pure transient memory system
};
