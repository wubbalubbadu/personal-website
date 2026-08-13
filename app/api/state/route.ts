import { ensureSchema } from "../_db";

export async function GET() {
  const db = await ensureSchema();
  const [messages, proposals] = await db.batch([
    db.prepare("SELECT id, user_text AS userText, assistant_text AS assistantText, created_at AS createdAt FROM messages ORDER BY created_at DESC LIMIT 30"),
    db.prepare("SELECT id, message_id AS messageId, category, title, details, status, created_at AS createdAt FROM proposals ORDER BY created_at DESC LIMIT 100"),
  ]);
  return Response.json({ messages: messages.results, proposals: proposals.results });
}
