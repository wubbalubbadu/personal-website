import { ensureSchema } from "../_db";

export async function PATCH(request: Request) {
  const { id, status } = await request.json() as { id?: string; status?: string };
  if (!id || !["approved", "rejected", "pending"].includes(status ?? "")) {
    return Response.json({ error: "Invalid proposal update" }, { status: 400 });
  }
  const db = await ensureSchema();
  await db.prepare("UPDATE proposals SET status = ? WHERE id = ?").bind(status, id).run();
  return Response.json({ ok: true });
}
