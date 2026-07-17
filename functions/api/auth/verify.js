import { createSession, json, sessionCookie, sha256, requireDb } from "../../_lib/api.js";

export async function onRequestGet({ request, env }) {
  try {
    const db = requireDb(env);
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) return json({ error: "Missing verification token." }, 400);

    const tokenHash = await sha256(token);
    const row = await db
      .prepare(
        `SELECT email_verification_tokens.id AS token_id, email_verification_tokens.user_id,
          users.email, users.name
         FROM email_verification_tokens
         JOIN users ON users.id = email_verification_tokens.user_id
         WHERE email_verification_tokens.token_hash = ?
           AND email_verification_tokens.used_at IS NULL
           AND email_verification_tokens.expires_at > datetime('now')
         LIMIT 1`
      )
      .bind(tokenHash)
      .first();

    if (!row) return json({ error: "Verification link is invalid or expired." }, 400);

    await db.batch([
      db.prepare("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(row.user_id),
      db.prepare("UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?").bind(row.token_id)
    ]);

    const session = await createSession(env, row.user_id);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${url.origin}/?verified=1`,
        "Set-Cookie": sessionCookie(session.token, session.expiresAt)
      }
    });
  } catch (error) {
    return json({ error: error.message || "Verification failed." }, 500);
  }
}
