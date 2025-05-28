import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL || 
  process.env.POSTGRES_URL ||
  process.env.DB_URL ||
  // Fallback for development
  `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'whatsapp_system'}`;

if (!databaseUrl || databaseUrl.includes('undefined')) {
  console.error("Database configuration missing. Available env vars:");
  console.error("DATABASE_URL:", process.env.DATABASE_URL);
  console.error("PGUSER:", process.env.PGUSER);
  console.error("PGHOST:", process.env.PGHOST);
  console.error("PGPORT:", process.env.PGPORT);
  console.error("PGDATABASE:", process.env.PGDATABASE);
  
  throw new Error(
    "Database configuration missing. Please set DATABASE_URL or individual PostgreSQL environment variables (PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE).",
  );
}

console.log("Connecting to database:", databaseUrl.replace(/:[^:]*@/, ':***@'));

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });