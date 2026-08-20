/**
 * Neon client.
 *
 * The database is the source for what the dashboard renders, but it is not
 * allowed to be a single point of failure for a live demo: every read falls
 * back to the exported bundle that ships with the build. A database outage
 * therefore degrades to stale-but-correct numbers rather than a blank page,
 * which is the right trade for something that gets shown on a stage.
 */
import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;

export function db() {
  if (!process.env.DATABASE_URL) return null;
  if (!client) client = neon(process.env.DATABASE_URL);
  return client;
}

export async function tryQuery<T>(fn: (sql: NonNullable<ReturnType<typeof db>>) => Promise<T>): Promise<T | null> {
  const sql = db();
  if (!sql) return null;
  try {
    return await fn(sql);
  } catch (err) {
    console.error("[db] falling back to bundle:", err instanceof Error ? err.message : err);
    return null;
  }
}
