import { json, requireDb } from "../../_lib/api.js";

export async function onRequestGet({ request, env }) {
  try {
    const auth = requireAdmin(request, env);
    if (auth) return auth;

    const { results } = await requireDb(env)
      .prepare(
        `SELECT purchases.id, purchases.email, purchases.usdt_amount, purchases.token_amount,
          purchases.token_symbol, purchases.stage_number, purchases.token_price, purchases.tx_hash,
          purchases.sender_wallet, purchases.status, purchases.admin_note, purchases.created_at,
          purchases.reviewed_at, users.name
         FROM purchases
         JOIN users ON users.id = purchases.user_id
         ORDER BY purchases.created_at DESC`
      )
      .all();

    return json({ purchases: results || [] });
  } catch (error) {
    return json({ error: error.message || "Could not load admin purchases." }, 500);
  }
}

function requireAdmin(request, env) {
  const expected = env.ADMIN_PASSCODE;
  const provided = request.headers.get("X-Admin-Passcode");
  if (!expected) return json({ error: "Missing ADMIN_PASSCODE environment variable." }, 500);
  if (!provided || provided !== expected) return json({ error: "Invalid owner passcode." }, 401);
  return null;
}
