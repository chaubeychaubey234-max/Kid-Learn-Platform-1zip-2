import 'dotenv/config'

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { verifyDatabaseConnection } from "./db.js";
import { createServer } from "http";
import { setupVite } from "./vite.js";
import { serveStatic } from "./static.js";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

const appReady = (async () => {
  await verifyDatabaseConnection();
  await registerRoutes(httpServer, app);

  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV === "development") {
      await setupVite(httpServer, app);
    } else {
      serveStatic(app);
    }
  }

  if (!process.env.TAVILY_API_KEY) {
    console.warn("TAVILY_API_KEY is not set — /api/safe-search will fallback to safe alternatives (e.g., Wikipedia)");
  }

  log("server initialized for Vercel serverless runtime");
})();

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 5000;

  appReady
    .then(() => {
      httpServer.listen(port, "0.0.0.0", () => {
        log(`Server running on port ${port} in ${process.env.NODE_ENV || "development"} mode`);
      });
    })
    .catch((error) => {
      console.error("Server initialization failed:", error);
      process.exit(1);
    });
}

app.use(async (_req, _res, next) => {
  try {
    await appReady;
    next();
  } catch (error) {
    next(error);
  }
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
});

export default app;