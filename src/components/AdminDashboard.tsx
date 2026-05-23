import React, { useState } from "react";
import { TrackedLocation, SystemLog } from "../types";
import { getTrackedLocations, clearDatabase, addTrackedLocation } from "../utils/localStorageDb";
import { 
  Terminal, ShieldCheck, Map, Smartphone, Cpu, RefreshCw, 
  Trash2, Download, Search, Navigation, Layers, Compass, Crosshair,
  Plus, Minus
} from "lucide-react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

interface AdminDashboardProps {
  locations: TrackedLocation[];
  onDatabaseCleared: () => void;
  onMockSignalGenerated: (newLoc: TrackedLocation, log: SystemLog) => void;
}

export default function AdminDashboard({ 
  locations, 
  onDatabaseCleared, 
  onMockSignalGenerated 
}: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<TrackedLocation | null>(locations[0] || null);
  const [mapMode, setMapMode] = useState<"radar" | "google">(hasValidKey ? "google" : "radar");
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 3.1390, lng: 101.6869 });
  const [mapZoom, setMapZoom] = useState<number>(3);
  const [selectedNodeTab, setSelectedNodeTab] = useState<string>("all");

  React.useEffect(() => {
    if (selectedDevice) {
      setMapCenter({ lat: selectedDevice.latitude, lng: selectedDevice.longitude });
      setMapZoom(13); // Zoom in on selection
    }
  }, [selectedDevice]);

  // Compute stats dynamically
  const totalTelemetries = locations.length;
  const uniqueDevices = Array.from(new Set(locations.map(l => l.deviceId))).length;
  const latestDevice = locations[0] ? locations[0].deviceName : "None";
  const lastActiveTimestamp = locations[0] ? new Date(locations[0].timestamp).toLocaleTimeString() : "N/A";

  // Filter locations by both search query and selected device/node tab
  const filteredLocations = locations.filter(loc => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = (
      loc.deviceId.toLowerCase().includes(s) ||
      loc.deviceName.toLowerCase().includes(s) ||
      loc.userAgent.toLowerCase().includes(s) ||
      loc.latitude.toString().includes(s) ||
      loc.longitude.toString().includes(s)
    );
    const matchesTab = selectedNodeTab === "all" || loc.deviceName === selectedNodeTab;
    return matchesSearch && matchesTab;
  });

  const uniqueDevicesList = Array.from(new Set(locations.map(l => l.deviceName)));

  // Simulator: Inject mock workshop coordinate ping
  const handleSimulateDevicePing = () => {
    const agents = [
      { name: "Agent Viper (Pixel 8)", prefix: "LST-VIPER" },
      { name: "Shadow Drone C1 (Embedded Linux)", prefix: "LST-DRONE" },
      { name: "Agent Maverick (Galaxy S24)", prefix: "LST-MAVERICK" },
      { name: "Infiltrator-9 (WebOS Hub)", prefix: "LST-INF-9" }
    ];
    
    // Choose one at random
    const randAgent = agents[Math.floor(Math.random() * agents.length)];
    const randId = `${randAgent.prefix}-${Math.floor(100 + Math.random() * 900)}`;

    // Generate random coordinates around KL or SF or Tokyo
    const sectors = [
      { lat: 3.1390, lng: 101.6869, name: "Kuala Lumpur Grid", city: "Kuala Lumpur, Malaysia" },
      { lat: 35.6762, lng: 139.6503, name: "Tokyo Sub-Grid", city: "Tokyo, Japan" },
      { lat: 37.7749, lng: -122.4194, name: "San Francisco SF Sector", city: "San Francisco, USA" },
      { lat: 51.5074, lng: -0.1278, name: "London Sector", city: "London, UK" }
    ];
    const sector = sectors[Math.floor(Math.random() * sectors.length)];
    const simulatedLat = sector.lat + (Math.random() - 0.5) * 0.05;
    const simulatedLng = sector.lng + (Math.random() - 0.5) * 0.05;

    const newMock: Omit<TrackedLocation, "id"> = {
      deviceId: randId,
      deviceName: randAgent.name,
      latitude: parseFloat(simulatedLat.toFixed(6)),
      longitude: parseFloat(simulatedLng.toFixed(6)),
      timestamp: new Date().toISOString(),
      userAgent: `LOC-SPY Mobile Node v2.4 / Sector ${sector.name}`,
      accuracy: Math.floor(5 + Math.random() * 50),
      status: "active",
      city: sector.city
    };

    const record = addTrackedLocation(newMock);
    const log: SystemLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: "info",
      message: `TEST PACKET RECEIVED: Registered remote test device [${randId}] sector waypoint.`
    };

    onMockSignalGenerated(record, log);
    setSelectedDevice(record);
  };

  // Export db to JSON file
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(locations, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `LOC-SPY-TRACER-EXPORT-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6" id="admin-dashboard-panel">
      
      {/* SECTION 1: Counter Stats Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat item 1 */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg backdrop-blur-sm shadow-cyan-500/[0.01]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block">TOTAL PACKETS</span>
            <span className="text-2xl font-bold font-mono text-cyan-400 block">{totalTelemetries}</span>
          </div>
          <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-lg text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        {/* Stat item 2 */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg backdrop-blur-sm shadow-cyan-500/[0.01]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block">ACTIVE TARGETS</span>
            <span className="text-2xl font-bold font-mono text-emerald-400 block">{uniqueDevices}</span>
          </div>
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Smartphone className="h-5 w-5" />
          </div>
        </div>

        {/* Stat item 3 */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg backdrop-blur-sm shadow-cyan-500/[0.01]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block">LATEST SOURCE</span>
            <span className="text-sm font-bold font-mono text-white block truncate max-w-[150px]">{latestDevice}</span>
          </div>
          <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Cpu className="h-5 w-5" />
          </div>
        </div>

        {/* Stat item 4 */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg backdrop-blur-sm shadow-cyan-500/[0.01]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block">PULSE CLOCK</span>
            <span className="text-lg font-bold font-mono text-amber-500 block">{lastActiveTimestamp}</span>
          </div>
          <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-amber-500">
            <RefreshCw className="h-5 w-5 animate-spin-slow" />
          </div>
        </div>
      </div>

      {/* DYNAMIC NODE TABS SECTOR: Each active device has its own dedicated navigation and workspace tab */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2.5">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <h4 className="text-[11px] font-mono tracking-widest text-[#9ca3af] uppercase font-bold">
              ACTIVE NODE SECTORS (TABS)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider bg-slate-950 px-2.5 py-0.5 rounded border border-slate-850">
            Isolate telemetry Workspace per Device Node
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => setSelectedNodeTab("all")}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all border flex items-center space-x-2.5 cursor-pointer select-none active:scale-95 ${
              selectedNodeTab === "all"
                ? "bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                : "bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:border-slate-700"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>ALL ACTIVE NODES</span>
          </button>

          {uniqueDevicesList.map((devName) => {
            const isTabActive = selectedNodeTab === devName;
            const deviceRecords = locations.filter(l => l.deviceName === devName);
            const latestRec = deviceRecords[0];
            const count = deviceRecords.length;

            return (
              <button
                key={devName}
                type="button"
                onClick={() => {
                  setSelectedNodeTab(devName);
                  if (latestRec) {
                    setSelectedDevice(latestRec);
                  }
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all border flex items-center space-x-3 cursor-pointer select-none text-left active:scale-95 ${
                  isTabActive
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                    : "bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                <Smartphone className="h-4 w-4 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold block leading-tight">{devName}</span>
                  <span className={`text-[9px] font-mono leading-none mt-1 ${isTabActive ? 'text-slate-800' : 'text-slate-500'}`}>
                    Waypoints: {count} • {latestRec?.city || "Unknown"}
                  </span>
                </div>
              </button>
            );
          })}

          {uniqueDevicesList.length === 0 && (
            <div className="text-slate-600 text-[10px] font-mono leading-loose uppercase tracking-widest italic py-2 pl-1">
              • Waiting for telemetry packet signals to initialize Node Workspace tabs •
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Map Radar Visualizer & System Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Holographic Radar / GPS Live Map Screen */}
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between backdrop-blur-md">
          <div className="border-b border-slate-800 bg-[#090d1a] px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2">
              {mapMode === "google" ? (
                <Map className="h-5 w-5 text-cyan-400 animate-pulse" />
              ) : (
                <Crosshair className="h-5 w-5 text-cyan-400 animate-pulse" />
              )}
              <h3 className="text-sm font-bold font-mono text-white uppercase tracking-widest text-left">
                {mapMode === "google" ? "LIVE GEOTARGET GPS TRACKER MAP" : "REAL-TIME RADAR PLOT & COORDINATES"}
              </h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto shrink-0">
              {/* Dropdown for common zoom presets */}
              {mapMode === "google" && (
                <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Map Zoom:</span>
                  <select
                    value={mapZoom <= 4 ? "global" : mapZoom <= 8 ? "continental" : mapZoom <= 13 ? "urban" : "street"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "global") setMapZoom(3);
                      else if (val === "continental") setMapZoom(6);
                      else if (val === "urban") setMapZoom(12);
                      else if (val === "street") setMapZoom(17);
                    }}
                    className="bg-transparent border-none text-[10px] text-cyan-400 font-mono font-semibold uppercase outline-none cursor-pointer pr-1 focus:ring-0"
                  >
                    <option value="global" className="bg-slate-900 text-white">Global (z:3)</option>
                    <option value="continental" className="bg-slate-900 text-white">Continental (z:6)</option>
                    <option value="urban" className="bg-slate-900 text-white">Urban (z:12)</option>
                    <option value="street" className="bg-slate-900 text-white">Street (z:17)</option>
                  </select>
                </div>
              )}

              {/* Tab switch controls */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMapMode("google")}
                  className={`py-1 px-3 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer ${
                    mapMode === "google"
                      ? "bg-cyan-500 text-slate-900 shadow font-extrabold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>GPS MAP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode("radar")}
                  className={`py-1 px-3 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer ${
                    mapMode === "radar"
                      ? "bg-cyan-500 text-slate-900 shadow font-extrabold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>RADAR</span>
                </button>
              </div>
            </div>
          </div>

          {mapMode === "google" ? (
            <div className="h-[380px] w-full relative bg-slate-950/40 flex items-center justify-center overflow-hidden">
              {hasValidKey ? (
                <>
                  <APIProvider apiKey={API_KEY} version="weekly">
                    <GoogleMap
                      center={mapCenter}
                      zoom={mapZoom}
                      onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
                      onZoomChanged={(ev) => setMapZoom(ev.detail.zoom)}
                      mapId="DEMO_MAP_ID"
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      style={{ width: '100%', height: '100%' }}
                      gestureHandling={'cooperative'}
                      disableDefaultUI={true}
                    >
                      {locations.map((loc) => {
                        const isSelected = selectedDevice && selectedDevice.id === loc.id;
                        return (
                          <AdvancedMarker
                            key={loc.id}
                            position={{ lat: loc.latitude, lng: loc.longitude }}
                            onClick={() => setSelectedDevice(loc)}
                          >
                            <Pin
                              background={isSelected ? "#22d3ee" : "#10b981"}
                              borderColor={isSelected ? "#ffffff" : "#064e3b"}
                              glyphColor={isSelected ? "#0f172a" : "#ffffff"}
                              scale={isSelected ? 1.25 : 1.0}
                            />
                          </AdvancedMarker>
                        );
                      })}
                    </GoogleMap>
                  </APIProvider>

                  {/* Custom Zoom Controls HUD element */}
                  <div className="absolute right-4 bottom-4 flex flex-col gap-1.5 z-20">
                    <button
                      type="button"
                      onClick={() => setMapZoom((prev) => Math.min(prev + 1, 21))}
                      className="p-2.5 bg-[#090d1a]/95 hover:bg-[#0f152b] border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.15)] backdrop-blur-md transition-all outline-none cursor-pointer flex items-center justify-center active:scale-95"
                      title="Zoom In"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapZoom((prev) => Math.max(prev - 1, 1))}
                      className="p-2.5 bg-[#090d1a]/95 hover:bg-[#0f152b] border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.15)] backdrop-blur-md transition-all outline-none cursor-pointer flex items-center justify-center active:scale-95"
                      title="Zoom Out"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div role="alert" className="p-8 max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-xl text-center space-y-4 shadow-2xl backdrop-blur-md mx-4">
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full inline-flex animate-pulse">
                    <Compass className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                    Google Maps API Key Required
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400 space-y-2 text-left bg-slate-950 p-4 border border-slate-800/60 rounded-lg">
                    <p className="font-semibold text-cyan-400">Step 1: Get an API Key</p>
                    <p className="leading-tight text-slate-500">
                      Visit: <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">Google Cloud Console</a>
                    </p>
                    <p className="font-semibold text-cyan-400 mt-2">Step 2: Add to AI Studio Secrets</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-500 leading-tight">
                      <li>Open <span className="text-slate-300">Settings</span> (⚙️ gear icon)</li>
                      <li>Go to <span className="text-slate-300">Secrets</span> section</li>
                      <li>Name search key: <code className="text-cyan-300 bg-slate-900/60 px-1 py-0.5 rounded">GOOGLE_MAPS_PLATFORM_KEY</code></li>
                      <li>Paste value & press Enter</li>
                    </ul>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-wider font-mono">
                    The app compiles automatically. No page reload required!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-slate-950/40 relative min-h-[300px] flex items-center justify-center overflow-hidden">
              {/* Background Grid Pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

              {/* Radar Sweeper Animation Overlay */}
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_50%,rgba(6,182,212,0.08))] rounded-full animate-spin duration-3000 pointer-events-none w-[280px] h-[280px] m-auto"></div>

              {/* Circular Radar Rings */}
              <div className="absolute border border-cyan-500/5 rounded-full w-[400px] h-[400px] pointer-events-none"></div>
              <div className="absolute border border-cyan-500/10 rounded-full w-[280px] h-[280px] pointer-events-none"></div>
              <div className="absolute border border-cyan-500/15 rounded-full w-[160px] h-[160px] pointer-events-none"></div>
              <div className="absolute border border-cyan-500/20 rounded-full w-[60px] h-[60px] pointer-events-none"></div>
              
              {/* Axis grid labels */}
              <div className="absolute text-[8px] font-mono text-slate-700 left-3 top-1/2">LAT GRID MIN LIMITS</div>
              <div className="absolute text-[8px] font-mono text-slate-700 right-3 top-1/2">LAT GRID MAX LIMITS</div>
              <div className="absolute text-[8px] font-mono text-slate-700 top-3 left-1/2 -translate-x-1/2">LNG NORTH GRID</div>
              <div className="absolute text-[8px] font-mono text-slate-700 bottom-3 left-1/2 -translate-x-1/2">LNG SOUTH GRID</div>

              {/* Simulated Live Plot Points of Saved Workshop Devices */}
              <div className="relative w-full h-full min-h-[250px] flex items-center justify-center">
                {filteredLocations.slice(0, 15).map((loc, index) => {
                  // Map coordinates mathematically into high-contrast pixel dots
                  // We normalize simple offsets from selected view
                  const baseLat = selectedDevice ? selectedDevice.latitude : 3.1390;
                  const baseLng = selectedDevice ? selectedDevice.longitude : 101.6869;

                  const diffLat = loc.latitude - baseLat;
                  const diffLng = loc.longitude - baseLng;

                  // Scale multiplier for aesthetic disperse representation
                  const scaleX = 350;
                  const scaleY = 180;

                  const leftPos = Math.min(Math.max((diffLng * scaleX) + 150, 15), 280);
                  const topPos = Math.min(Math.max((-diffLat * scaleY) + 120, 15), 230);

                  const isCurrentlySelected = selectedDevice && selectedDevice.id === loc.id;

                  return (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedDevice(loc)}
                      className="absolute group transition-all duration-300 focus:outline-none cursor-pointer z-10"
                      style={{ left: `${leftPos}px`, top: `${topPos}px` }}
                    >
                      {/* Ring highlight */}
                      <span className={`absolute -inset-2.5 rounded-full ${
                        isCurrentlySelected 
                          ? "bg-cyan-500/20 border border-cyan-500/60 animate-ping" 
                          : "bg-transparent group-hover:bg-cyan-500/10"
                      }`}></span>

                      {/* Point Indicator */}
                      <span className={`relative block rounded-full w-2.5 h-2.5 shadow-md border ${
                        isCurrentlySelected
                          ? "bg-cyan-400 border-white scale-125 shadow-[0_0_8px_rgba(6,182,212,1)]"
                          : "bg-emerald-400 border-emerald-950 group-hover:bg-cyan-400"
                      }`}></span>

                      {/* Minimal Tooltip Overlay */}
                      <span className="absolute left-4 -top-1 px-1.5 py-0.5 rounded bg-black/80 border border-slate-700/80 text-[8px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap">
                        {loc.deviceId}
                      </span>
                    </button>
                  );
                })}

                {/* Centered target lock marker of selected device */}
                {selectedDevice && (
                  <div className="text-center p-3 bg-slate-950/90 border border-cyan-500/40 rounded-lg max-w-[200px] backdrop-blur z-20 shadow-xl pointer-events-none font-mono">
                    <span className="block text-[8px] font-mono text-cyan-400 tracking-wider font-bold">TARGET SELECTED</span>
                    <p className="text-xs font-bold text-white truncate my-0.5 font-sans">{selectedDevice.deviceName}</p>
                    <p className="text-[10px] font-mono text-slate-400">
                      Lat: {selectedDevice.latitude.toFixed(5)}<br />
                      Lng: {selectedDevice.longitude.toFixed(5)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map Footer status message */}
          <div className="px-6 py-3 bg-[#090d19] border-t border-slate-850 text-[10px] font-mono text-slate-500 flex justify-between items-center">
            <span className="flex items-center space-x-1.5">
              <Compass className="h-3 w-3 text-cyan-400" />
              <span>{mapMode === "google" ? "SATELLITE GROUND GPS GRID - INTERACTIVE ORBITAL OVERLAY" : "RADAR POSITION REFERENCE CALIBRATED TO SELECTED TARGET"}</span>
            </span>
            <span className="text-slate-600">{mapMode === "google" ? "GMP V3.62" : "GL GRIDS V2.0"}</span>
          </div>
        </div>

        {/* Selected Targeting Inspector Column */}
        <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 flex flex-col justify-between backdrop-blur-md">
          <div>
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-widest border-b border-slate-800 pb-3 mb-4 flex items-center space-x-2">
              <Navigation className="h-4 w-4 text-cyan-400" />
              <span>COURIER POSITION INSPECTOR</span>
            </h3>

            {selectedDevice ? (
              <div className="space-y-4 font-mono text-[11px]">
                {/* Visual diagnostic block */}
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-855 space-y-2">
                  <span className="block text-[10px] text-cyan-400 font-bold uppercase tracking-wider">TELEMETRY PACK SPEC:</span>
                  <div className="grid grid-cols-2 gap-2 text-white">
                    <span className="text-slate-500">NODE TYPE:</span>
                    <span className="text-right font-sans font-medium truncate">{selectedDevice.deviceName}</span>

                    <span className="text-slate-500">RESOLVED CITY:</span>
                    <span className="text-right text-amber-500 font-bold truncate">{selectedDevice.city || "Sector Unresolved"}</span>

                    <span className="text-slate-500">BEACON ID:</span>
                    <span className="text-right text-cyan-400 truncate font-semibold">{selectedDevice.deviceId}</span>

                    <span className="text-slate-500">LATITUDE:</span>
                    <span className="text-right text-emerald-400 font-bold">{selectedDevice.latitude.toFixed(6)}</span>

                    <span className="text-slate-500">LONGITUDE:</span>
                    <span className="text-right text-emerald-400 font-bold">{selectedDevice.longitude.toFixed(6)}</span>

                    <span className="text-slate-500">ACCURACY:</span>
                    <span className="text-right text-amber-500">± {selectedDevice.accuracy || 15}m</span>
                  </div>
                </div>

                {/* Timestamp tag */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-855 space-y-1">
                  <span className="block text-[10px] text-slate-600">INBOUND SIGNAL TIMESTAMP:</span>
                  <span className="block text-white font-medium text-[11px]">{new Date(selectedDevice.timestamp).toLocaleString()}</span>
                </div>

                {/* HTTP User-Agent disclosure */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-855 space-y-1">
                  <span className="block text-[10px] text-slate-600">HTTP BROWSER ENVELOPE HEADER:</span>
                  <p className="text-[#9ca3af] text-[10px] leading-relaxed break-all font-sans">{selectedDevice.userAgent}</p>
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-lg">
                <Smartphone className="h-8 w-8 text-slate-700 animate-bounce mb-2" />
                <p className="text-xs text-slate-500 font-mono">NO ACTIVE TARGET SELECTED</p>
                <p className="text-[10px] text-slate-600 mt-1">Select any coordinate waypoint or list participant row to scan</p>
              </div>
            )}
          </div>

          {/* Clean telemetry database actions */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-[#d1d5db] text-[10px] font-mono uppercase rounded-md tracking-wider flex items-center justify-center space-x-1 transition-all outline-none cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>EXPORT DATA</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to permanently clear the telemetry tracker database?")) {
                    clearDatabase();
                    onDatabaseCleared();
                  }
                }}
                className="py-1.5 px-3 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/10 hover:border-rose-500/40 text-rose-500 text-[10px] font-mono uppercase rounded-md flex items-center justify-center transition-all outline-none cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Live Grid Records logs table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
        
        {/* Table header menu controls */}
        <div className="px-6 py-4 bg-[#090d1a] border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Terminal className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono text-white tracking-widest uppercase">
              REGISTERED COURIERS DATABASE (PERSISTED IN LOCALSTORAGE)
            </h3>
          </div>

          <div className="relative max-w-xs w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input
              type="text"
              placeholder="Filter by ID, name, or OS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-700 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Database Grid Table body */}
        <div className="overflow-x-auto">
          {filteredLocations.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-950/80 text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                  <th className="py-3 px-6">NODE TYPE / DEVICE NAME</th>
                  <th className="py-3 px-6">CRYPTOGRAPHIC ID</th>
                  <th className="py-3 px-6 text-center">COORDINATES</th>
                  <th className="py-3 px-6 text-center">ACCURACY</th>
                  <th className="py-3 px-6">TRANSMISSION AGENT</th>
                  <th className="py-3 px-6">TIME SIGNAL</th>
                  <th className="py-3 px-6 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50 text-xs font-mono">
                {filteredLocations.map((loc) => {
                  const isSelected = selectedDevice && selectedDevice.id === loc.id;
                  return (
                    <tr 
                      key={loc.id}
                      onClick={() => setSelectedDevice(loc)}
                      className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        isSelected ? "bg-cyan-500/5 text-white" : "text-[#9ca3af]"
                      }`}
                    >
                      <td className="py-3.5 px-6 font-sans font-medium text-white">
                        <div className="flex items-start space-x-2">
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            loc.status === "active" ? "bg-emerald-400" : loc.status === "triangulating" ? "bg-amber-400" : "bg-slate-600"
                          }`}></span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{loc.deviceName}</span>
                            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mt-0.5">{loc.city || "Sector Unresolved"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-semibold select-all text-cyan-400">
                        <code>{loc.deviceId}</code>
                      </td>
                      <td className="py-3.5 px-6 text-center text-white">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                          {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className="text-amber-500">{loc.accuracy || "15"}m</span>
                      </td>
                      <td className="py-3.5 px-6 max-w-[200px] truncate">
                        <span className="text-[10px] text-slate-500" title={loc.userAgent}>{loc.userAgent}</span>
                      </td>
                      <td className="py-3.5 px-6 text-[#9ca3af]">
                        {new Date(loc.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const existing = getTrackedLocations();
                            const fixed = existing.filter(el => el.id !== loc.id);
                            localStorage.setItem("loc-spy-tracer-db", JSON.stringify(fixed));
                            onDatabaseCleared(); // update parent state trigger
                          }}
                          className="hover:text-rose-500 p-1 rounded hover:bg-rose-500/15 transition-all cursor-pointer"
                          title="Wipe record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-600 italic">
              No participant telemetry records found matching search queries. Use "Simulate Random Agent Ping" to generate new grid nodes coordinates.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
