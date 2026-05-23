import { TrackedLocation } from "../types";

const LOCAL_STORAGE_KEY = "loc-spy-tracer-db";
const DEVICE_ID_KEY = "loc-spy-tracer-my-device-id";

// Pre-populated workshop agent locations to demonstrate spatial intelligence in the Admin Cockpit
const DEFAULT_LOCATIONS: TrackedLocation[] = [
  {
    id: "rec_1",
    deviceId: "LST-AGENT-KRAKEN",
    deviceName: "Redmi Note Pro (Agent Kraken)",
    latitude: 3.1390, // Kuala Lumpur Workshop HQ
    longitude: 101.6869,
    timestamp: "2026-05-23T03:30:15Z",
    userAgent: "Mozilla/5.0 (Linux; Android 13; Redmi Note 11) AppleWebKit/537.36",
    accuracy: 12,
    status: "active",
    city: "Kuala Lumpur, Malaysia"
  },
  {
    id: "rec_2",
    deviceId: "LST-SPECTRE-8",
    deviceName: "iPhone Pro Max (Spectre 8)",
    latitude: 35.6762, // Shibuya Grid
    longitude: 139.6503,
    timestamp: "2026-05-23T03:28:40Z",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15",
    accuracy: 4,
    status: "active",
    city: "Tokyo, Japan"
  },
  {
    id: "rec_3",
    deviceId: "LST-BEACON-ALPHA",
    deviceName: "HackerOne ThinkPad (Alpha)",
    latitude: 37.7749, // San Francisco Hub
    longitude: -122.4194,
    timestamp: "2026-05-23T03:15:10Z",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    accuracy: 35,
    status: "offline",
    city: "San Francisco, USA"
  },
  {
    id: "rec_4",
    deviceId: "LST-SHADOW-X",
    deviceName: "Raspberry Pi Geotracker (ShadowX)",
    latitude: 51.5074, // London Safehouse
    longitude: -0.1278,
    timestamp: "2026-05-23T03:34:22Z",
    userAgent: "Python-urllib/3.10 (Raspbian OS)",
    accuracy: 75,
    status: "triangulating",
    city: "London, UK"
  },
  {
    id: "rec_5",
    deviceId: "LST-GHOST-NET",
    deviceName: "PinePhone Pro (GhostNet)",
    latitude: -33.8688, // Sydney Harbour Grid
    longitude: 151.2093,
    timestamp: "2026-05-23T03:10:05Z",
    userAgent: "Mozilla/5.0 (X11; Mobile; rv:109.0) Gecko/109.0 Firefox/115.0",
    accuracy: 18,
    status: "offline",
    city: "Sydney, Australia"
  }
];

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
