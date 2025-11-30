/**
 * Drizzle ORM database client
 *
 * Connects to Supabase PostgreSQL database using the postgres driver.
 * Uses the same schema as platform/ (managed via Supabase migrations).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL not set - database queries will fail");
}

// Create postgres connection
// Using connection pooling settings suitable for serverless/edge
const client = postgres(DATABASE_URL || "", {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for convenience
export { schema };

// Export types
export type Database = typeof db;

