import 'dotenv/config';
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add your Neon connection string to the environment.");
}

const isProduction = process.env.NODE_ENV === "production";
const requiredTables = ["users", "content", "badges"];

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
  max: isProduction ? 5 : 10, // Connection pool size
  idleTimeoutMillis: 30_000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10_000, // Timeout after 10 seconds
});

// Handle pool errors to prevent crashes
pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

/**
 * Verifies database connection and schema
 * @throws {Error} If connection fails or required tables are missing
 */
export async function verifyDatabaseConnection(): Promise<void> {
  const client = await pool.connect();

  try {
    // Test basic connection
    await client.query("SELECT 1");
    console.log("✅ Database connection successful");

    // Verify required tables exist
    const missingTables: string[] = [];

    for (const tableName of requiredTables) {
      const result = await client.query<{ table_ref: string | null }>(
        "SELECT to_regclass($1) AS table_ref",
        [`public.${tableName}`],
      );

      if (!result.rows[0]?.table_ref) {
        missingTables.push(tableName);
      }
    }

    if (missingTables.length > 0) {
      throw new Error(
        `Database schema is missing required tables (${missingTables.join(", ")}). Run "npm run db:push" with DATABASE_URL pointing to your Neon database.`,
      );
    }

    console.log("✅ Database schema verified");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    throw new Error(`Failed to connect to the Neon database. ${message}`);
  } finally {
    client.release();
  }
}

// Initialize database connection with drizzle
export const db = drizzle(pool, { schema });
export type Database = typeof db;

// Export for use in other modules
export default db;