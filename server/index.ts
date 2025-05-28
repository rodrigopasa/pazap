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
  // Initialize database tables
  try {
    console.log('Initializing database...');
    const { pool } = await import('./db');

    // Check if tables exist and create them if needed
    const checkTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const existingTables = checkTables.rows.map(row => row.table_name);
    console.log('Existing tables:', existingTables);

    // Only create tables that don't exist
    if (!existingTables.includes('users')) {
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created users table');
    }

    if (!existingTables.includes('sessions')) {
      await pool.query(`
        CREATE TABLE sessions (
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
      `);
      console.log('Created sessions table');
    }

    if (!existingTables.includes('session')) {
      await pool.query(`
        CREATE TABLE "session" (
          "sid" varchar NOT NULL PRIMARY KEY,
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL
        );
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
      `);
      console.log('Created session table for express-session');
    }

    if (!existingTables.includes('messages')) {
      await pool.query(`
        CREATE TABLE messages (
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
      `);
      console.log('Created messages table');
    }

    if (!existingTables.includes('campaigns')) {
      await pool.query(`
        CREATE TABLE campaigns (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          name VARCHAR(100) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'draft',
          message_template TEXT,
          media_url TEXT,
          phone_numbers TEXT[],
          target_count INTEGER DEFAULT 0,
          sent_count INTEGER DEFAULT 0,
          success_count INTEGER DEFAULT 0,
          failure_count INTEGER DEFAULT 0,
          scheduled_at TIMESTAMP,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created campaigns table');
    } else {
      // Check if phone_numbers column exists, if not add it
      const columnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'phone_numbers'
      `);

      if (columnsCheck.rows.length === 0) {
        await pool.query(`
          ALTER TABLE campaigns 
          ADD COLUMN phone_numbers TEXT[],
          ADD COLUMN description TEXT,
          ADD COLUMN type VARCHAR(50) DEFAULT 'bulk',
          ADD COLUMN message_template TEXT,
          ADD COLUMN target_count INTEGER DEFAULT 0,
          ADD COLUMN success_count INTEGER DEFAULT 0,
          ADD COLUMN failure_count INTEGER DEFAULT 0,
          ADD COLUMN started_at TIMESTAMP,
          ADD COLUMN completed_at TIMESTAMP
        `);
        console.log('Added missing columns to campaigns table');
      }
    }

    if (!existingTables.includes('contacts')) {
      await pool.query(`
        CREATE TABLE contacts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          name VARCHAR(100),
          phone VARCHAR(20) NOT NULL,
          birthday DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created contacts table');
    }

    if (!existingTables.includes('groups')) {
      await pool.query(`
        CREATE TABLE groups (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          whatsapp_id VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          member_count INTEGER DEFAULT 0,
          is_admin BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created groups table');
    }

    if (!existingTables.includes('logs')) {
      await pool.query(`
        CREATE TABLE logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          session_id INTEGER REFERENCES sessions(id),
          level VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created logs table');
    }

    if (!existingTables.includes('notifications')) {
      await pool.query(`
        CREATE TABLE notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'info',
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created notifications table');
    }

    if (!existingTables.includes('settings')) {
      await pool.query(`
        CREATE TABLE settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          key VARCHAR(100) NOT NULL,
          value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, key)
        );
      `);
      console.log('Created settings table');
    }

    if (!existingTables.includes('birthdays')) {
      await pool.query(`
        CREATE TABLE birthdays (
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
      console.log('Created birthdays table');
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    // Don't throw error - continue with app startup
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
