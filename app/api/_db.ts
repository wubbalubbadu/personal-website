import { env } from "cloudflare:workers";

export async function ensureSchema() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, user_text TEXT NOT NULL, assistant_text TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS proposals (id TEXT PRIMARY KEY, message_id TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, details TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_proposals_status_created ON proposals(status, created_at)"),
  ]);
  return env.DB;
}
