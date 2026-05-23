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
    <div className="max-w-xl mx-auto my-4 w-full px-4 sm:px-0" id="user-view-panel">
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.06)] backdrop-blur-xl relative overflow-hidden select-none">
        
        {/* Decorative pro glowing vector stripe */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/20 via-emerald-400 to-emerald-500/20"></div>

        <div className="text-center space-y-8">
          
          {/* ZONEDEL COMPANY pristine branding badge */}
          <div className="space-y-3">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl inline-flex relative justify-center items-center shadow-[0_0_20px_rgba(16,185,129,0.05)]">
              <MapPin className="h-9 w-9 text-emerald-400 animate-pulse" />
              <span className="absolute inset-0 rounded-3xl bg-emerald-400/5 animate-ping"></span>
            </div>
            
            <h1 className="text-2xl font-black font-sans tracking-tight text-white uppercase mt-4">
              ZONEDEL COMPANY
            </h1>
            <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full inline-block">
              GLOBAL ROUTING VALIDATOR
            </p>
          </div>

          {/* Shipment delivery track module */}
          <div className="space-y-4 bg-slate-950/70 border border-slate-900 rounded-2xl p-6 relative">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <h2 className="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase">
                COURIER WAYPOINT LOGISTICS
              </h2>
              <span className="text-[8px] font-mono text-emerald-500 tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-black">
                SECURE SSL
              </span>
            </div>
            
            <p className="text-[11px] text-[#9ca3af] font-sans leading-relaxed max-w-sm mx-auto">
              Please authenticate and synchronize your shipping coordinates to immediately assign local couriers and estimate precise delivery timeframes.
            </p>

            <div className="space-y-5 pt-3">
              <div className="relative text-left">
                <label className="block text-[9px] font-mono font-bold tracking-widest text-[#9ca3af] uppercase mb-1.5 pl-1">
                  SHIPMENT WAYBILL ID / REF
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                  placeholder="ZD-84091-621"
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3.5 text-center text-xs font-mono font-bold text-white tracking-widest placeholder-slate-800 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner"
                />
              </div>

              {/* Transit milestones diagram */}
              <div className="border-t border-slate-900/80 pt-4 text-left">
                <span className="block text-[9px] font-mono font-bold tracking-widest text-[#9ca3af] uppercase mb-4 pl-1">
                  DISPATCH ROUTE MILESTONES
                </span>
                
                <div className="space-y-4 relative pl-1">
                  <div className="flex items-center space-x-3.5 text-xs">
                    <span className="w-5.3 h-5.3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-400 flex items-center justify-center">01</span>
                    <span className="text-[#9ca3af] font-sans font-medium">Parcel Registered & Labelled</span>
                  </div>
                  <div className="flex items-center space-x-3.5 text-xs">
                    <span className="w-5.3 h-5.3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-400 flex items-center justify-center">02</span>
                    <span className="text-[#9ca3af] font-sans font-medium">Regional Fulfillment Sorting</span>
                  </div>
                  <div className="flex items-center space-x-3.5 text-xs">
                    <span className={`w-5.3 h-5.3 rounded-full text-[9px] font-mono font-bold flex items-center justify-center transition-all ${orderLocated ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'bg-slate-950 border border-slate-850 text-slate-700'}`}>03</span>
                    <span className={`font-sans font-semibold transition-colors ${orderLocated ? "text-emerald-400" : "text-slate-600"}`}>
                      {orderLocated ? `Active Zone Connected: ${resolvedCity}` : "Destination Route Coordination Sync"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action core controls */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleAskLocation}
              disabled={isLocating}
              className={`w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans text-xs sm:text-sm font-bold uppercase rounded-xl tracking-widest transition-all select-none cursor-pointer outline-none flex items-center justify-center space-x-3 active:scale-98 shadow-[0_8px_30px_rgba(16,185,129,0.15)] disabled:opacity-50 ${isLocating ? 'animate-pulse' : ''}`}
            >
              <RefreshCw className={`h-4.5 w-4.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? "SYNCHRONIZING SECURE GPS CHOP..." : "ASK LOCATION"}</span>
            </button>

            {orderLocated && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1.5 text-center animate-fade-in shadow-inner">
                <span className="block text-[10px] font-mono text-emerald-400 font-extrabold uppercase tracking-widest">
                  ✓ SHIPPING ROUTE SECURED & REGISTERED
                </span>
                <span className="block text-[10.5px] text-slate-400 font-sans leading-relaxed">
                  Your active delivery quadrant at <span className="text-white font-semibold select-all bg-slate-950 py-0.5 px-1.5 rounded border border-slate-900 ml-1">{resolvedCity}</span> has been logged to coordinate dispatch dispatchers.
                </span>
              </div>
            )}

            {gpsPermissionError && (
              <div className="p-4 bg-rose-950/30 border border-rose-500/20 rounded-xl space-y-2 text-center animate-fade-in">
                <div className="flex items-center justify-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse shrink-0" />
                  <span className="block text-[10px] font-mono text-rose-400 font-bold uppercase tracking-widest">
                    ROUTING AUTHORIZATION FAILED
                  </span>
                </div>
                <span className="block text-[10px] font-sans leading-relaxed text-rose-300">
                  {gpsPermissionError}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-950 text-[9px] font-mono text-slate-600 uppercase tracking-widest flex items-center justify-center space-x-1 select-none">
            <span>ZONEDEL TRANSPORT SECURITY REGISTER</span>
          </div>

        </div>
      </div>
    </div>
  );
}
