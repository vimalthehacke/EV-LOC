export interface TrackedLocation {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  userAgent: string;
  deviceName: string;
  accuracy?: number; // GPS accuracy in meters (visual detail)
  status?: "active" | "offline" | "triangulating";
  city?: string; // Resolved city name for the target coordinates
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: "info" | "warning" | "success" | "error";
  message: string;
}
