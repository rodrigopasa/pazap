import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { schedulerService } from "./services/scheduler";
import { whatsappService } from "./services/whatsapp";
import { createAdminUser } from "./setup/createAdmin";
import { ensureSessionTable } from "./setup/database";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const app = express();

// Session configuration for PaZap authentication
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'pazap-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

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
  // Run database migrations first
  try {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const { db } = await import('./db');
    
    console.log('Running database migrations...');
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Database migration failed:', error);
    
    // If migrations fail, try to create tables using schema
    try {
      console.log('Attempting to sync database schema...');
      const { drizzle } = await import('drizzle-orm/node-postgres');
      const { pool } = await import('./db');
      const schema = await import('../shared/schema');
      
      const db = drizzle({ client: pool, schema });
      
      // Create tables manually if needed
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          session_id VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          status VARCHAR(20) DEFAULT 'disconnected',
          qr_code TEXT,
          is_active BOOLEAN DEFAULT false,
          last_seen TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL
        ) WITH (OIDS=FALSE);
        ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        CREATE INDEX "IDX_session_expire" ON "session" ("expire");
        
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          session_id INTEGER REFERENCES sessions(id),
          user_id INTEGER REFERENCES users(id),
          phone VARCHAR(20) NOT NULL,
          content TEXT NOT NULL,
          media_url TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          scheduled_at TIMESTAMP,
          sent_at TIMESTAMP,
          error TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS campaigns (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          name VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          media_url TEXT,
          status VARCHAR(20) DEFAULT 'draft',
          scheduled_at TIMESTAMP,
          total_recipients INTEGER DEFAULT 0,
          sent_count INTEGER DEFAULT 0,
          failed_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS contacts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          name VARCHAR(100),
          phone VARCHAR(20) NOT NULL,
          birthday DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS groups (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          whatsapp_id VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          member_count INTEGER DEFAULT 0,
          is_admin BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          session_id INTEGER REFERENCES sessions(id),
          level VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'info',
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          key VARCHAR(100) NOT NULL,
          value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, key)
        );
        
        CREATE TABLE IF NOT EXISTS birthdays (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          contact_id INTEGER REFERENCES contacts(id),
          name VARCHAR(100) NOT NULL,
          birthday DATE NOT NULL,
          message TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('Database schema created successfully');
    } catch (schemaError) {
      console.error('Schema creation also failed:', schemaError);
      throw schemaError;
    }
  }
  
  // Criar usuário admin automaticamente
  await createAdminUser();
  
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

  // Ensure session table exists
  await ensureSessionTable();

  // Initialize scheduler service
  log("Initializing scheduler service...");

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log("WhatsApp Manager ready!");
  });
})();
