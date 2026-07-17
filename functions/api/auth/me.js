import { getCurrentUser, json, requireDb } from "../../_lib/api.js";

export async function onRequestGet({ request, env }) {
  try {
    const db = requireDb(env);
    const user = await getCurrentUser(request, env);
    if (!user) return json({ user: null, summary: null, purchases: [] });

    const summary = await db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN status = 'Approved' THEN token_amount ELSE 0 END), 0) AS approved_tokens,
          COALESCE(SUM(CASE WHEN status = 'Pending' THEN token_amount ELSE 0 END), 0) AS pending_tokens,
          COALESCE(SUM(CASE WHEN status = 'Approved' THEN usdt_amount ELSE 0 END), 0) AS approved_usdt,
          COUNT(*) AS purchase_count
        FROM purchases
        WHERE user_id = ?`
      )
      .bind(user.id)
      .first();

    const { results } = await db
      .prepare(
        `SELECT id, usdt_amount, token_amount, token_symbol, stage_number, token_price,
          tx_hash, sender_wallet, status, admin_note, created_at, reviewed_at
         FROM purchases
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .bind(user.id)
      .all();

    return json({ user, summary, purchases: results || [] });
  } catch (error) {
    return json({ error: error.message || "Could not load account." }, 500);
  }
}
