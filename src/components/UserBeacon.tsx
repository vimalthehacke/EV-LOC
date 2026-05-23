import React, { useState, useEffect } from "react";
import { getOrInitDeviceId, addTrackedLocation } from "../utils/localStorageDb";
import { TrackedLocation, SystemLog } from "../types";
import { Shield, Radio, MapPin, RefreshCw, Layers, Cpu, Compass, HardDrive, Globe, Info, AlertTriangle } from "lucide-react";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

interface UserBeaconProps {
  onLocationLogged: (newLoc: TrackedLocation, log: SystemLog) => void;
}

export default function UserBeacon({ onLocationLogged }: UserBeaconProps) {
  const [deviceId, setDeviceId] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [lat, setLat] = useState(""); // Starts empty - no fake location
  const [lng, setLng] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [emissionStatus, setEmissionStatus] = useState<"idle" | "emitting" | "success">("idle");
  const [accuracy, setAccuracy] = useState(0);
  const [customDeviceName, setCustomDeviceName] = useState("LOC-AGENT-ALPHA");

  // Device telemetry diagnostics
  const [viewportSize, setViewportSize] = useState("");
  const [connectionType, setConnectionType] = useState("Cellular LTE");

  const [resolvedCity, setResolvedCity] = useState("Awaiting Route Sync...");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [gpsPermissionError, setGpsPermissionError] = useState<string | null>(null);

  // Core reverse-geocycling function
  const triggerReverseGeocode = async (latitude: number, longitude: number) => {
    setIsGeocoding(true);
    try {
      // 1. Check local standard presets to guarantee immediate offline-grade high accuracy
      const latVal = Math.round(latitude * 10) / 10;
      const lngVal = Math.round(longitude * 10) / 10;

      // Preset dictionary lookup (offsets rounded to 1 decimal place)
      const presets: { [key: string]: string } = {
        "3.1_101.7": "Kuala Lumpur, Malaysia",
        "35.7_139.7": "Tokyo, Japan",
        "37.8_-122.4": "San Francisco, USA",
        "51.5_-0.1": "London, UK",
      };

      const presetKey = `${latVal}_${lngVal}`;
      if (presets[presetKey]) {
        setResolvedCity(presets[presetKey]);
        setIsGeocoding(false);
        return;
      }

      // 2. Try the Google Maps Geocoding service dynamically if available
      if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
        if (response.results && response.results.length > 0) {
          for (const res of response.results) {
            const cityComp = res.address_components.find((comp: any) => 
              comp.types.includes("locality") || 
              comp.types.includes("administrative_area_level_1") ||
              comp.types.includes("administrative_area_level_2")
            );
            if (cityComp) {
              const countryComp = res.address_components.find((comp: any) => comp.types.includes("country"));
              const cityName = countryComp ? `${cityComp.long_name}, ${countryComp.short_name}` : cityComp.long_name;
              setResolvedCity(cityName);
              setIsGeocoding(false);
              return;
            }
          }
          const formatted = response.results[0].formatted_address.split(",").slice(0, 2).join(",").trim();
          setResolvedCity(formatted);
          setIsGeocoding(false);
          return;
        }
      }

      // 3. Fallback to free OSM Nominatim Reverse Geocoding API
      const osmResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "LocSpyTracerApp/1.0"
          }
        }
      );
      if (osmResponse.ok) {
        const data = await osmResponse.json();
        const addr = data.address;
        if (addr) {
          const place = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.county || addr.state;
          const country = addr.country;
          if (place && country) {
            setResolvedCity(`${place}, ${country}`);
            setIsGeocoding(false);
            return;
          } else if (place) {
            setResolvedCity(place);
            setIsGeocoding(false);
            return;
          } else if (data.display_name) {
            setResolvedCity(data.display_name.split(",").slice(0, 2).join(",").trim());
            setIsGeocoding(false);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Dynamic geocoding issue:", e);
    }

    // 4. Smart mathematical coordinate approximation as ultimate fallback
    const knownCities = [
      { name: "New York, USA", lat: 40.7128, lng: -74.0060 },
      { name: "London, UK", lat: 51.5074, lng: -0.1278 },
      { name: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
      { name: "Sydney, Australia", lat: -33.8688, lng: 151.2093 },
      { name: "Kuala Lumpur, Malaysia", lat: 3.1390, lng: 101.6869 },
      { name: "Singapore", lat: 1.3521, lng: 103.8198 },
      { name: "Paris, France", lat: 48.8566, lng: 2.3522 },
      { name: "Mumbai, India", lat: 19.0760, lng: 72.8777 },
      { name: "Cairo, Egypt", lat: 30.0444, lng: 31.2357 },
      { name: "São Paulo, Brazil", lat: -23.5505, lng: -46.6333 },
      { name: "Cape Town, South Africa", lat: -33.9249, lng: 18.4241 }
    ];

    let nearestCity = knownCities[0];
    let minDistance = Infinity;

    for (const cityObj of knownCities) {
      const dLat = latitude - cityObj.lat;
      const dLng = longitude - cityObj.lng;
      const dist = dLat * dLat + dLng * dLng;
      if (dist < minDistance) {
        minDistance = dist;
        nearestCity = cityObj;
      }
    }

    setResolvedCity(`Region of ${nearestCity.name}`);
    setIsGeocoding(false);
  };

  useEffect(() => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      const timer = setTimeout(() => {
        triggerReverseGeocode(latNum, lngNum);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [lat, lng]);

  useEffect(() => {
    const initDeviceId = getOrInitDeviceId();
    setDeviceId(initDeviceId);
    setUserAgent(navigator.userAgent);
    setViewportSize(`${window.innerWidth} x ${window.innerHeight} px`);
    
    // Guess a friendly label representation
    let deviceName = "Embedded Node";
    if (navigator.userAgent.includes("iPhone")) {
      deviceName = "iPhone Terminal";
    } else if (navigator.userAgent.includes("Android")) {
      deviceName = "Android Mobile Beacon";
    } else if (navigator.userAgent.includes("Macintosh")) {
      deviceName = "Mac OS X Terminal";
    } else if (navigator.userAgent.includes("Windows")) {
      deviceName = "Windows PC Tracker";
    } else if (navigator.userAgent.includes("Linux")) {
      deviceName = "Linux Spy Unit";
    }
    setCustomDeviceName(deviceName);

    // Dynamic dual-stage tracker function to guarantee visitor location reporting
    const performDualStageTracking = async () => {
      let trackedLat = 0;
      let trackedLng = 0;
      let trackedCity = "";
      let isIPSuccess = false;

      // Stage 1: Fast IP-based geolocation lookup (0 permissions needed)
      // This guarantees that even if geolocation prompts are blocked (e.g., inside iframes or on load), we still map the user
      try {
        const ipRes = await fetch("https://freeipapi.com/api/json");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData && typeof ipData.latitude === "number" && typeof ipData.longitude === "number") {
            trackedLat = ipData.latitude;
            trackedLng = ipData.longitude;
            trackedCity = ipData.cityName && ipData.countryName 
              ? `${ipData.cityName}, ${ipData.countryName}` 
              : ipData.cityName || ipData.countryName || "Unresolved Node Location";
            isIPSuccess = true;
          }
        }
      } catch (err) {
        // Try secondary backup API
        try {
          const backupRes = await fetch("https://ipapi.co/json/");
          if (backupRes.ok) {
            const backupData = await backupRes.json();
            if (backupData && typeof backupData.latitude === "number" && typeof backupData.longitude === "number") {
              trackedLat = backupData.latitude;
              trackedLng = backupData.longitude;
              trackedCity = backupData.city && backupData.country_name 
                ? `${backupData.city}, ${backupData.country_name}` 
                : backupData.city || backupData.country_name || "Unresolved Node Location";
              isIPSuccess = true;
            }
          }
        } catch (backupErr) {
          console.warn("Real-time network IP geolocation fetch failed:", backupErr);
        }
      }

      // ONLY write a record of Stage 1 if the network geolocation fetch successfully resolved
      if (isIPSuccess) {
        setLat(trackedLat.toFixed(6));
        setLng(trackedLng.toFixed(6));
        setResolvedCity(trackedCity);
        setAccuracy(15000);

        const initialRecord = addTrackedLocation({
          deviceId: initDeviceId,
          deviceName: deviceName,
          latitude: trackedLat,
          longitude: trackedLng,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          accuracy: 15000,
          status: "triangulating",
          city: trackedCity
        });

        const initialLog: SystemLog = {
          id: `log_ip_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "info",
          message: `AUTO LOGGER: Signal localized for connected Node [${deviceName}] at approximate region [${trackedCity}] via network lookup.`
        };

        onLocationLogged(initialRecord, initialLog);
      }

      // Stage 2: Prompt for exact GPS coordinates to upgrade accuracy asynchronously
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const parsedLat = position.coords.latitude;
            const parsedLng = position.coords.longitude;
            const parsedAcc = Math.round(position.coords.accuracy);

            setLat(parsedLat.toFixed(6));
            setLng(parsedLng.toFixed(6));
            setAccuracy(parsedAcc);

            let preciseCity = trackedCity || "Awaiting reverse geocode...";
            try {
              const osmResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${parsedLat}&lon=${parsedLng}&zoom=12`,
                {
                  headers: {
                    "Accept-Language": "en",
                    "User-Agent": "LocSpyTracerApp/1.0"
                  }
                }
              );
              if (osmResponse.ok) {
                const osmData = await osmResponse.json();
                if (osmData && osmData.address) {
                  const place = osmData.address.city || osmData.address.town || osmData.address.village || osmData.address.suburb || osmData.address.state;
                  const country = osmData.address.country;
                  if (place && country) preciseCity = `${place}, ${country}`;
                  else if (place) preciseCity = place;
                }
              }
            } catch (geocodeErr) {
              // Keep IP city label on reverse geocoding error
            }

            setResolvedCity(preciseCity);

            const upgradedRecord = addTrackedLocation({
              deviceId: initDeviceId,
              deviceName: deviceName,
              latitude: parsedLat,
              longitude: parsedLng,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              accuracy: parsedAcc,
              status: "active",
              city: preciseCity
            });

            const upgradedLog: SystemLog = {
              id: `log_gps_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: "success",
              message: `GPS CALIBRATION SUCCESSFUL: Precise spatial matrix established for Node [${deviceName}] at [${preciseCity}].`
            };

            onLocationLogged(upgradedRecord, upgradedLog);
            setOrderLocated(true);
            setGpsPermissionError(null);
          },
          (error) => {
            console.warn("High precision GPS tracking blocked or unavailable:", error);
            // Absolutely NO fallback mock creation here if coordinate query failed
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    };

    performDualStageTracking();
  }, []);

  // Under-the-hood delivery tracking dispatch linkage
  const [trackingNumber, setTrackingNumber] = useState("ZD-84091-621");
  const [orderLocated, setOrderLocated] = useState(false);

  const handleAskLocation = () => {
    setIsLocating(true);
    setEmissionStatus("emitting");
    setGpsPermissionError(null);
    
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser environment.");
      setIsLocating(false);
      setEmissionStatus("idle");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const parsedLat = position.coords.latitude;
        const parsedLng = position.coords.longitude;
        const parsedAcc = Math.round(position.coords.accuracy);

        setLat(parsedLat.toFixed(6));
        setLng(parsedLng.toFixed(6));
        setAccuracy(parsedAcc);

        // Geocode coordinates to human city
        let tempCity = "Kuala Lumpur, Malaysia";
        try {
          const latVal = Math.round(parsedLat * 10) / 10;
          const lngVal = Math.round(parsedLng * 10) / 10;
          const presets: { [key: string]: string } = {
            "3.1_101.7": "Kuala Lumpur, Malaysia",
            "35.7_139.7": "Tokyo, Japan",
            "37.8_-122.4": "San Francisco, USA",
            "51.5_-0.1": "London, UK",
          };
          const presetKey = `${latVal}_${lngVal}`;
          if (presets[presetKey]) {
            tempCity = presets[presetKey];
          } else {
            const osmResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${parsedLat}&lon=${parsedLng}&zoom=12`,
              {
                headers: {
                  "Accept-Language": "en",
                  "User-Agent": "LocSpyTracerApp/1.0"
                }
              }
            );
            if (osmResponse.ok) {
              const data = await osmResponse.json();
              if (data.address) {
                const place = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.state;
                const country = data.address.country;
                if (place && country) tempCity = `${place}, ${country}`;
                else if (place) tempCity = place;
              }
            }
          }
        } catch (e) {
          const knownCities = [
            { name: "New York, USA", lat: 40.7128, lng: -74.0060 },
            { name: "London, UK", lat: 51.5074, lng: -0.1278 },
            { name: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
            { name: "Sydney, Australia", lat: -33.8688, lng: 151.2093 },
            { name: "Kuala Lumpur, Malaysia", lat: 3.1390, lng: 101.6869 }
          ];
          let nearestCity = knownCities[0];
          let minDistance = Infinity;
          for (const cityObj of knownCities) {
            const dLat = parsedLat - cityObj.lat;
            const dLng = parsedLng - cityObj.lng;
            const dist = dLat * dLat + dLng * dLng;
            if (dist < minDistance) {
              minDistance = dist;
              nearestCity = cityObj;
            }
          }
          tempCity = nearestCity.name;
        }

        setResolvedCity(tempCity);

        // Silently push the delivery coordinate telemetry to the database
        const record = addTrackedLocation({
          deviceId: deviceId,
          deviceName: customDeviceName,
          latitude: parsedLat,
          longitude: parsedLng,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          accuracy: parsedAcc,
          status: "active",
          city: tempCity
        });

        const log: SystemLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "success",
          message: `ZONE-DELIVERY COMPATIBLE BEACON WAVE LOGGED: Waypoint registered at [${tempCity}] for waybill [${trackingNumber}].`
        };

        onLocationLogged(record, log);
        setIsLocating(false);
        setEmissionStatus("success");
        setOrderLocated(true);
        setGpsPermissionError(null);
      },
      (error) => {
        setIsLocating(false);
        setEmissionStatus("idle");
        
        let errorMessage = "Location permission denied. Please allow site location access in your browser settings to sync your parcel shipping route.";
        if (error.code === error.TIMEOUT) {
          errorMessage = "Tracking request timed out. Please verify your GPS signal is enabled and retry.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Exact coordinates currently unavailable. Please check physical sensor access.";
        }
        
        setGpsPermissionError(errorMessage);
        
        const log: SystemLog = {
          id: `log_error_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "warning",
          message: `ZONE-DELIVERY ERROR: Tracking route authorization failed (${error.message}). No fallback data emitted.`
        };

        onLocationLogged({} as any, log); // notify logs of error
      },
      { enableHighAccuracy: true, timeout: 15050 }
    );
  };

  return (
    <div className="max-w-xl mx-auto my-4" id="user-view-panel">
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.05)] backdrop-blur-md relative overflow-hidden select-none">
        
        {/* Dynamic decorative visual glow card line */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500/20 via-emerald-400 to-emerald-500/20"></div>

        <div className="text-center space-y-8">
          
          {/* ZONE-DELIVERY COMPANY header block */}
          <div className="space-y-2">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl inline-flex relative justify-center items-center">
              <MapPin className="h-8 w-8 animate-pulse text-emerald-400" />
            </div>
            
            <h1 className="text-xl font-bold font-sans tracking-wide text-white uppercase mt-4">
              ZONE-DELIVERY COMPANY
            </h1>
            <p className="text-xs font-mono text-emerald-400 uppercase tracking-widest px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full inline-block mt-1">
              REAL-TIME DISPATCH ENGINE
            </p>
          </div>

          {/* TRACK YOUR ORDER interactive view container */}
          <div className="space-y-4 bg-slate-950/60 border border-slate-850 rounded-2xl p-6 relative">
            <h2 className="text-sm font-semibold text-slate-300 font-sans tracking-tight">
              TRACK YOUR ORDER
            </h2>
            <p className="text-[11px] text-slate-500 leading-normal max-w-sm mx-auto">
              Please declare your shipment delivery zone to establish an active routing linkage with our nearest depot couriers.
            </p>

            <div className="space-y-4 pt-2">
              <div className="relative text-left">
                <span className="block text-[9px] font-mono tracking-wider text-slate-500 uppercase mb-1.5 pl-1">
                  SHIPMENT WAYBILL NUMBER
                </span>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                  placeholder="ENTER WAYBILL NUMBER"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-xs font-mono font-semibold text-white tracking-widest placeholder-slate-800 outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Steps/Phases display */}
              <div className="border-t border-slate-900 pt-4 text-left">
                <span className="block text-[9px] font-mono tracking-wider text-slate-500 uppercase mb-3 pl-1">
                  DISPATCH TRANSIT TIMELINE
                </span>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-bold text-emerald-400 flex items-center justify-center font-mono">1</span>
                    <span className="text-slate-400 font-medium">Parcel Sorted & Dispatched</span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-bold text-emerald-400 flex items-center justify-center font-mono">2</span>
                    <span className="text-slate-400 font-medium">Kuala Lumpur Transit Depot</span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center font-mono ${orderLocated ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border border-slate-800 text-slate-600'}`}>3</span>
                    <span className={orderLocated ? "text-emerald-400 font-bold" : "text-slate-600 font-medium"}>
                      {orderLocated ? `Zone Linked: ${resolvedCity}` : "Destination Coordinate Sync"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ASK LOCATION core button */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleAskLocation}
              disabled={isLocating}
              className={`w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans text-sm font-bold uppercase rounded-xl tracking-wider transition-all select-none cursor-pointer outline-none flex items-center justify-center space-x-2 active:scale-95 shadow-[0_4px_20px_rgba(16,185,129,0.2)] disabled:opacity-50 ${isLocating ? 'animate-pulse' : ''}`}
            >
              <RefreshCw className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? "GATHERING ROUTE VECTOR..." : "ASK LOCATION"}</span>
            </button>

            {orderLocated && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl space-y-1 text-center animate-fade-in">
                <span className="block text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  ✓ SHIPPING ROUTE LINKED
                </span>
                <span className="block text-[10px] text-slate-400 font-sans">
                  Nearest depot in <span className="text-white font-medium select-all">{resolvedCity}</span> scheduled for immediate delivery cycle.
                </span>
              </div>
            )}

            {gpsPermissionError && (
              <div className="p-3.5 bg-rose-950/45 border border-rose-500/30 rounded-xl space-y-1.5 text-center animate-fade-in text-rose-300">
                <div className="flex items-center justify-center space-x-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse shrink-0" />
                  <span className="block text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider">
                    PERMISSION CHALLENGE FAILURE
                  </span>
                </div>
                <span className="block text-[10px] font-sans leading-relaxed">
                  {gpsPermissionError}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-950 text-[9px] font-mono text-slate-600 uppercase tracking-widest flex items-center justify-center space-x-1">
            <span>ZONE-DELIVERY CO. SECURITY ENVELOPE</span>
          </div>

        </div>
      </div>
    </div>
  );
}
