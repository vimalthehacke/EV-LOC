import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health and fallback API checks first
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
