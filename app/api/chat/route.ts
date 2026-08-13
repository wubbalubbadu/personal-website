import { ensureSchema } from "../_db";

type ExtractedItem = { category: "task" | "idea" | "diary" | "expense" | "health"; title: string; details: string };

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string", enum: ["task", "idea", "diary", "expense", "health"] },
          title: { type: "string" },
          details: { type: "string" },
        },
        required: ["category", "title", "details"],
      },
    },
  },
  required: ["reply", "items"],
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "OpenAI API key is not configured" }, { status: 503 });
  const { text } = await request.json() as { text?: string };
  if (!text?.trim()) return Response.json({ error: "Message is required" }, { status: 400 });

  const db = await ensureSchema();
  const recent = await db.prepare("SELECT user_text AS userText, assistant_text AS assistantText FROM messages ORDER BY created_at DESC LIMIT 8").all();
  const history = [...recent.results].reverse().map((m) => `User: ${m.userText}\nCompanion: ${m.assistantText}`).join("\n\n");
  const prompt = `You are Within, Haylie's warm but clear personal companion. Respond naturally and concisely. Extract only concrete information worth saving. Tasks are actionable commitments. Ideas may remain non-actionable. Diary is a meaningful reflection or event. Expense requires an amount or clear spending event. Health covers food, exercise, sleep, or wellbeing observations without diagnosis or moral judgment. Do not invent dates, amounts, or commitments. The user will confirm every extracted item.\n\nRecent context:\n${history || "No earlier conversation."}\n\nNew message:\n${text.trim()}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      input: prompt,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "within_message", strict: true, schema } },
    }),
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => ({})) as { error?: { message?: string } };
    return Response.json({ error: failure.error?.message ?? "The AI request failed" }, { status: response.status });
  }
  const raw = await response.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const outputText = raw.output?.flatMap(o => o.content ?? []).find(c => c.type === "output_text")?.text;
  if (!outputText) return Response.json({ error: "The AI returned no usable response" }, { status: 502 });
  const result = JSON.parse(outputText) as { reply: string; items: ExtractedItem[] };
  const messageId = crypto.randomUUID();
  const now = Date.now();
  const statements = [db.prepare("INSERT INTO messages (id, user_text, assistant_text, created_at) VALUES (?, ?, ?, ?)").bind(messageId, text.trim(), result.reply, now)];
  for (const item of result.items) statements.push(db.prepare("INSERT INTO proposals (id, message_id, category, title, details, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)").bind(crypto.randomUUID(), messageId, item.category, item.title, item.details, now));
  await db.batch(statements);
  return Response.json({ message: { id: messageId, userText: text.trim(), assistantText: result.reply, createdAt: now }, items: result.items });
}
