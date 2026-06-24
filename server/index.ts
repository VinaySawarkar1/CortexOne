import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pdfGenerator } from './pdf-generator';
import { initializeStorage, getStorage } from './storage-init';
import { setupAuth } from './auth';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
async function hashPwd(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize storage before setting up routes
  await initializeStorage();

  // Seed superuser if not present
  try {
    const storage = getStorage();
    const existing = await storage.getUserByUsername('superadmin');
    if (!existing) {
      const hashed = await hashPwd('Admin@123');
      // Create a placeholder company for superuser
      let superCompany: any;
      try {
        superCompany = await storage.createCompany({
          name: 'Reckonix System',
          email: 'superadmin@reckonix.com',
          status: 'active',
          maxUsers: 999,
        });
      } catch {}
      await storage.createUser({
        username: 'superadmin',
        password: hashed,
        name: 'Super Admin',
        email: 'superadmin@reckonix.com',
        role: 'superuser',
        isActive: true,
        companyId: superCompany?.id ?? 0,
        permissions: [],
      });
      log('Superuser "superadmin" created with password "Admin@123"');
    }
  } catch (e) {
    console.warn('Superuser seed failed (non-fatal):', e);
  }

  // Setup authentication
  await setupAuth(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // In production (Render), bind to the provided PORT on 0.0.0.0
  const port = Number(process.env.PORT || (app.get("env") === "development" ? 3001 : 10000));
  const host = process.env.HOST || "0.0.0.0";
  server.listen({
    port,
    host,
  }, () => {
    log(`serving on ${host}:${port}`);
  });
})();

process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  await pdfGenerator.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down server...');
  await pdfGenerator.close();
  process.exit(0);
});
