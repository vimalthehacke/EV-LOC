import React, { useState, useEffect } from "react";
import { getTrackedLocations, clearDatabase } from "./utils/localStorageDb";
import { TrackedLocation, SystemLog } from "./types";
import UserBeacon from "./components/UserBeacon";
import AdminDashboard from "./components/AdminDashboard";
import { 
  Terminal, ShieldAlert, Radio, Eye, Settings, 
  Database, Activity, Wifi, User, Skull, Lock, Unlock 
} from "lucide-react";

// PASSWORD ACCESS GATE COMPONENT
interface PasswordGateProps {
  onSuccess: () => void;
}

function PasswordGate({ onSuccess }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "EVLOC") {
      onSuccess();
    } else {
      setErrorVisible(true);
      // Brief vibration alert feedback delay
      const timer = setTimeout(() => setErrorVisible(false), 2400);
      return () => clearTimeout(timer);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.1)] backdrop-blur-md relative overflow-hidden select-none">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500/10 via-cyan-400 to-cyan-500/10"></div>
      
      <div className="text-center space-y-6">
        <div className={`p-4 bg-slate-950/80 border ${errorVisible ? 'border-rose-500/40 text-rose-400' : 'border-cyan-500/20 text-cyan-400'} rounded-2xl inline-flex relative justify-center items-center`}>
          <Lock className={`h-8 w-8 ${errorVisible ? 'animate-bounce text-rose-500' : 'animate-pulse'}`} />
          {errorVisible && (
            <span className="absolute inset-0 rounded-2xl bg-rose-500/5 border border-rose-500 animate-ping"></span>
          )}
        </div>
        
        <div className="space-y-2">
          <h2 className="text-sm font-bold font-mono text-white tracking-widest uppercase">
            RESTRICTED ADMIN PROTOCOL
          </h2>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider leading-relaxed">
            SECURE LINK IDENTITY VERIFICATION CHALLENGE REQUIRED. SUBMIT AUTHORIZED SYSTEM DECRYPTER KEY TO PROCEED.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ENTER SECURE PASSWORD"
              className={`w-full bg-slate-950 border ${errorVisible ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500'} rounded-xl px-4 py-3 text-center text-xs font-mono font-semibold text-white tracking-widest placeholder-slate-800 outline-none transition-all`}
              autoFocus
            />
          </div>

          {errorVisible && (
            <p className="text-[10px] font-mono text-rose-500 uppercase tracking-widest animate-pulse font-bold">
              ⚠️ CHALLENGE FAILURE: INVALID SECURITY KEY
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold uppercase rounded-xl tracking-wider transition-all select-none cursor-pointer outline-none flex items-center justify-center space-x-2 active:scale-95"
          >
            <Unlock className="h-3.5 w-3.5" />
            <span>ESTABLISH SECURE LINK</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-950 text-[9px] font-mono text-slate-600 uppercase tracking-widest">
          COCKPIT DEPLOYMENT NODE IDENT: ID-0x9AA16
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"user" | "admin">("user");
  const [locations, setLocations] = useState<TrackedLocation[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [time, setTime] = useState(new Date());

  // Password-gated visibility route conditions
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem("loc-spy-admin-auth") === "unlocked";
  });
  const [secretClicks, setSecretClicks] = useState(0);

  const checkRoute = () => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    const search = window.location.search;
    
    const hasAdminString = 
      path === "/admin-16" || 
      path.endsWith("/admin-16") || 
      hash === "#admin-16" || 
      hash === "#/admin-16" ||
      hash.includes("admin-16") ||
      search.includes("admin-16") ||
      search.includes("admin=16");
    
    setIsAdminRoute(hasAdminString);
    if (hasAdminString) {
      setActiveTab("admin");
    } else {
      setActiveTab("user");
    }
  };

  // Keyboard shortcut for sandbox: typing "admin" automatically sets high-clearance hash
  useEffect(() => {
    let pressedBuffer = "";
    const handleKeys = (e: KeyboardEvent) => {
      pressedBuffer = (pressedBuffer + e.key.toLowerCase()).slice(-5);
      if (pressedBuffer === "admin") {
        window.location.hash = "admin-16";
        checkRoute();
        const infoLog: SystemLog = {
          id: `key_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "info",
          message: "KEYBOARD SHORTCUT BYPASS TARGET: Routed to /admin-16 high-privilege area."
        };
        setSystemLogs(prev => [infoLog, ...prev]);
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, []);

  // Monitor URL states
  useEffect(() => {
    checkRoute();
    window.addEventListener("hashchange", checkRoute);
    window.addEventListener("popstate", checkRoute);
    return () => {
      window.removeEventListener("hashchange", checkRoute);
      window.removeEventListener("popstate", checkRoute);
    };
  }, []);

  // Visual easter egg trigger
  const handleLogoClick = () => {
    setSecretClicks(prev => {
      const next = prev + 1;
      if (next >= 3) {
        window.location.hash = "admin-16";
        checkRoute();
        // Insert system trace logs
        const secretLog: SystemLog = {
          id: `sec_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "success",
          message: "ADMIN ROUTE BYPASS UNLOCKED VIA TRIPLE LOGO TAP CHALLENGE."
        };
        setSystemLogs(prevLogs => [secretLog, ...prevLogs]);
        return 0;
      }
      return next;
    });
  };

  // Initialize data on mount
  useEffect(() => {
    // Load tracking coordinates asynchronously from the server database
    const loadInitialData = async () => {
      try {
        const res = await fetch("/api/locations");
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
          if (data.length > 0) {
            const syncLog: SystemLog = {
              id: `sys_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: "success",
              message: `Telemetry server synchronized. Loaded ${data.length} global tracking records.`
            };
            setSystemLogs(prev => [syncLog, ...prev]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch initial telemetry from server", e);
      }
    };
    loadInitialData();

    // Live ticking time clock indicator
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live polling: reload coordinates every 5 seconds in the admin dashboard from the central server
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/locations");
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
        }
      } catch (e) {
        console.warn("Telemetry live-poll issue:", e);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update locations list and push console logs
  const handleLocationLogged = async (newLoc: TrackedLocation, log: SystemLog) => {
    // First save locally to client storage to enable offline redundancy
    const updatedLocal = getTrackedLocations();
    
    try {
      // Dispatch tracking coordinate packet to global server
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newLoc)
      });
      if (res.ok) {
        const data = await res.json();
        // Reload all visitor records globally to display on map immediately
        const freshRes = await fetch("/api/locations");
        if (freshRes.ok) {
          const allLocs = await freshRes.json();
          setLocations(allLocs);
        }
      } else {
        setLocations(updatedLocal);
      }
    } catch (e) {
      console.warn("Failed posting telemetry packet to central server, using local fallback", e);
      setLocations(updatedLocal);
    }
    
    setSystemLogs(prev => [log, ...prev].slice(0, 15)); // Cap logs history
  };

  const handleDatabaseCleared = async () => {
    clearDatabase(); // Purge local storage
    
    try {
      // Purge server database remotely
      await fetch("/api/locations/clear", { method: "POST" });
      setLocations([]);
    } catch (e) {
      console.error("Failed purging central server database", e);
      setLocations([]);
    }
    
    const freshLog: SystemLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: "warning",
      message: "ADMIN ACTION: Purged global telemetry tracker records across all devices on server."
    };
    setSystemLogs(prev => [freshLog, ...prev].slice(0, 15));
  };

  const handleUnlockSuccess = () => {
    sessionStorage.setItem("loc-spy-admin-auth", "unlocked");
    setIsAdminUnlocked(true);
    
    const unlockLog: SystemLog = {
      id: `unlock_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: "success",
      message: "AUTHORITY PROTOCOL UNLOCKED: Admin cockpit session authorized successfully."
    };
    setSystemLogs(prev => [unlockLog, ...prev]);
  };

  // Isolate normal tracking viewers from administrative tactical metrics
  if (!isAdminRoute) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-300 font-sans flex flex-col items-center justify-center p-6 selection:bg-emerald-500 selection:text-slate-900">
        <UserBeacon onLocationLogged={handleLocationLogged} />
        
        {/* Small subtle administrative gateway anchor at the bottom of the page */}
        <div 
          onClick={handleLogoClick}
          className="mt-6 text-[9px] text-[#1e293b] font-mono tracking-widest cursor-pointer select-none hover:text-slate-700 transition-colors uppercase"
          title="Administrative decrypter path"
        >
          ZONE-DELIVERY CO. SECURITY GATEWAY VER 2.4.0
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-cyan-500 selection:text-slate-900 pb-12">
      
      {/* ⚠️ TOP EMERGENCY ALERT MARQUEE BANNER */}
      <div 
        onClick={handleLogoClick}
        className="bg-slate-950 border-b border-cyan-500/10 px-4 py-2 text-center flex items-center justify-center space-x-2.5 text-[10px] text-cyan-400 uppercase font-mono tracking-widest leading-none select-none cursor-pointer hover:bg-slate-900 transition-colors"
        title="Decrypt terminal route (3 click sequence)"
      >
        <Skull className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
        <span>CLASSIFIED SECURE NETWORK AREA // LOC-SPY-TRACER WORKSHOP // PROTOCOL VER: 2.4.0</span>
        <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
        <span className="hidden md:inline text-slate-500">LIVE WEBSOCKET CHANNEL SECURED</span>
      </div>

      {/* TACTICAL HEADER PANEL */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-[0_0_30px_rgba(6,182,212,0.05)] backdrop-blur-md">
          
          <div 
            onClick={handleLogoClick} 
            className="flex items-center space-x-3.5 select-none cursor-pointer group"
          >
            <div className="p-3 bg-cyan-500 rounded-lg flex items-center justify-center text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.5)] group-hover:scale-105 transition-transform">
              <Radio className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tighter text-white font-sans">
                  LOC-<span className="text-cyan-400">SPY</span>-TRACER
                </h1>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[8px] font-mono text-cyan-400 tracking-widest uppercase">
                  ONLINE
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 tracking-widest mt-0.5 uppercase">
                COURIER TELEMETRY & GPS COCKPIT
              </p>
            </div>
          </div>

          {/* Quick Metrics & Dynamic Clock */}
          <div className="flex items-center justify-between md:justify-end gap-6 font-mono border-t border-slate-800 md:border-t-0 pt-3 md:pt-0">
            <div className="hidden sm:block text-right">
              <span className="block text-[9px] text-slate-500 uppercase">System Status</span>
              <span className="text-xs text-cyan-400 font-bold flex items-center justify-end space-x-1">
                <Wifi className="h-3.5 w-3.5 mr-1 text-cyan-400 animate-pulse" />
                <span>SECURE ENCRYPTED</span>
              </span>
            </div>

            <div className="text-right">
              <span className="block text-[9px] text-slate-500 uppercase text-right">Telemetry Pulse</span>
              <span className="text-xs font-mono font-bold text-white tracking-widest">
                {time.toLocaleTimeString()} UTC
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* CORE WRAPPER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-6">

        {/* 🎛️ PRIMARY TAB CONTROLS (Only visible if URL/hash matches admin-16 to completely hide default access) */}
        {isAdminRoute ? (
          <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700 max-w-md mx-auto shadow-xl">
            <button
              type="button"
              onClick={() => setActiveTab("user")}
              className={`flex-1 py-1.5 px-6 rounded-md text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === "user"
                  ? "bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>USER VIEW</span>
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`flex-1 py-1.5 px-6 rounded-md text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === "admin"
                  ? "bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>ADMIN COCKPIT</span>
            </button>
          </div>
        ) : null}

        {/* 📦 ACTIVE VIEW SWITCH RENDER */}
        <div className="transition-all duration-300">
          {activeTab === "user" ? (
            <UserBeacon onLocationLogged={handleLocationLogged} />
          ) : (
            // Secure decrypted administration dashboard
            !isAdminUnlocked ? (
              <PasswordGate onSuccess={handleUnlockSuccess} />
            ) : (
              <AdminDashboard 
                locations={locations} 
                onDatabaseCleared={handleDatabaseCleared}
                onMockSignalGenerated={handleLocationLogged}
              />
            )
          )}
        </div>

        {/* 📟 BOTTOM TELEMETRY CONSOLE STREAM */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-2xl space-y-3 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-cyan-400 animate-pulse" />
              <h3 className="text-xs font-bold font-mono text-slate-400 tracking-widest uppercase">
                LOC-SPY-TRACER ACTIVE FEED
              </h3>
            </div>
            <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">
              REAL-TIME BUFFER SIG
            </div>
          </div>

          <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-400 space-y-1.5 max-h-[140px] overflow-y-auto border border-slate-900 select-text">
            {systemLogs.length > 0 ? (
              systemLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2 text-[11px] leading-relaxed">
                  <span className="text-slate-600">[{log.timestamp}]</span>
                  <span className={`px-1 rounded text-[9px] font-bold leading-none py-0.5 uppercase tracking-wider ${
                    log.type === "success" 
                      ? "bg-cyan-950/40 text-cyan-400 border border-cyan-800/30" 
                      : log.type === "warning" 
                      ? "bg-amber-900/40 text-amber-400 border border-amber-800/30" 
                      : "bg-[#1a2035] text-cyan-300 border border-[#3b82f6]/20"
                  }`}>
                    {log.type}
                  </span>
                  <span className={log.type === "success" ? "text-cyan-300" : log.type === "warning" ? "text-amber-300" : "text-slate-400"}>
                    {log.message}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[#4b5563] italic">No active system transmissions intercepted yet...</div>
            )}
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 mt-8 text-center text-[10px] font-mono text-slate-600 uppercase tracking-widest">
        <p>© 2026 LOC-SPY-TRACER CERTIFIED STACK • ALL COURIER TELEMETRIES PERSISTED LOCALLY</p>
        <p className="mt-1">VER: 2.4.0-STABLE // BUILD: 0xA4F2 // LOC-SPY-TRACER PROTOCOL</p>
      </footer>

    </div>
  );
}
