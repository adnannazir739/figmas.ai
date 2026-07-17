import { json, requireDb } from "../../_lib/api.js";

export async function onRequestGet({ request, env }) {
  try {
    const auth = requireAdmin(request, env);
    if (auth) return auth;

    const { results } = await requireDb(env)
      .prepare(
        `SELECT users.id, users.email, users.name, users.email_verified_at, users.created_at,
          COALESCE(SUM(CASE WHEN purchases.status = 'Approved' THEN purchases.token_amount ELSE 0 END), 0) AS approved_tokens,
          COALESCE(SUM(CASE WHEN purchases.status = 'Pending' THEN purchases.token_amount ELSE 0 END), 0) AS pending_tokens,
          COUNT(purchases.id) AS purchase_count
         FROM users
         LEFT JOIN purchases ON purchases.user_id = users.id
         GROUP BY users.id
         ORDER BY users.created_at DESC`
      )
      .all();

    return json({ users: results || [] });
  } catch (error) {
    return json({ error: error.message || "Could not load users." }, 500);
  }
}

function requireAdmin(request, env) {
  const expected = env.ADMIN_PASSCODE;
  const provided = request.headers.get("X-Admin-Passcode");
  if (!expected) return json({ error: "Missing ADMIN_PASSCODE environment variable." }, 500);
  if (!provided || provided !== expected) return json({ error: "Invalid owner passcode." }, 401);
  return null;
}
