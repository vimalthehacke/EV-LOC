import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON parsing for incoming telemetry payloads
  app.use(express.json());

  // Shared in-memory location records database across all visiting clients
  let globalLocations: any[] = [];

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Retrieve current active telemetry location records of all users
  app.get("/api/locations", (req, res) => {
    res.json(globalLocations);
  });

  // Store a newly captured client beacon geolocation transmission
  app.post("/api/locations", (req, res) => {
    const loc = req.body;
    if (!loc) {
      return res.status(400).json({ error: "No telemetry data provided" });
    }

    // Standardize IDs and timestamps
    if (!loc.id) {
      loc.id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }
    if (!loc.timestamp) {
      loc.timestamp = new Date().toISOString();
    }

    // Insert at front of active stack
    globalLocations.unshift(loc);

    // Bound memory footprint to 500 entries
    if (globalLocations.length > 500) {
      globalLocations = globalLocations.slice(0, 500);
    }

    res.json(loc);
  });

  // Clear server telemetry records
  app.post("/api/locations/clear", (req, res) => {
    globalLocations = [];
    res.json({ success: true, message: "Global coordinates tracking database has been purged." });
  });

  // Single-page-app routing fallback for specific direct paths like admin-16
  app.get("/admin-16", (req, res, next) => {
    if (process.env.NODE_ENV !== "production") {
      // Allow Vite's dev middleware to handle it via spa fallback
      next();
    } else {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    }
  });

  // Serve Vite hot module/middleware in dev, and static production bundle assets in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for any other non-resolved routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULL-STACK DEV] Server running on http://localhost:${PORT}`);
  });
}

startServer();
