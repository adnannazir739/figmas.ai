import { json, readJson, requireDb } from "../../_lib/api.js";

export async function onRequestPost({ request, env }) {
  try {
    const auth = requireAdmin(request, env);
    if (auth) return auth;

    const body = await readJson(request);
    const purchaseId = String(body.purchaseId || "").trim();
    const action = String(body.action || "").trim();
    const adminNote = String(body.adminNote || "").trim().slice(0, 500);

    if (!purchaseId) return json({ error: "Missing purchase id." }, 400);
    if (!["Approved", "Rejected"].includes(action)) {
      return json({ error: "Action must be Approved or Rejected." }, 400);
    }

    const result = await requireDb(env)
      .prepare(
        `UPDATE purchases
         SET status = ?, admin_note = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(action, adminNote || null, purchaseId)
      .run();

    if (!result.meta?.changes) return json({ error: "Purchase not found." }, 404);
    return json({ ok: true, status: action });
  } catch (error) {
    return json({ error: error.message || "Could not review purchase." }, 500);
  }
}

function requireAdmin(request, env) {
  const expected = env.ADMIN_PASSCODE;
  const provided = request.headers.get("X-Admin-Passcode");
  if (!expected) return json({ error: "Missing ADMIN_PASSCODE environment variable." }, 500);
  if (!provided || provided !== expected) return json({ error: "Invalid owner passcode." }, 401);
  return null;
}
