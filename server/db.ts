import 'dotenv/config';
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pg;

export const pool = new Pool({
  host: "127.0.0.1",
  user: "postgres",
  password: "postgres",
  database: "kid_learn",
  port: 5432,
  ssl: false,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
