import 'dotenv/config';
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add your Neon connection string to the environment.");
}

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  max: isProduction ? 5 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

export async function verifyDatabaseConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to Neon PostgreSQL database');
    client.release();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    throw new Error(`Failed to connect to the Neon database. ${message}`);
  }
}

export const db = drizzle(pool, { schema });
export type Database = typeof db;