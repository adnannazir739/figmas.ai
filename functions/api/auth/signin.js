import {
  createSession,
  hashPassword,
  isValidEmail,
  json,
  normalizeEmail,
  readJson,
  requireDb,
  sessionCookie
} from "../../_lib/api.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDb(env);
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!isValidEmail(email) || !password) {
      return json({ error: "Enter your email and password." }, 400);
    }

    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (!user) return json({ error: "Invalid email or password." }, 401);

    const passwordHash = await hashPassword(password, user.password_salt);
    if (passwordHash !== user.password_hash) {
      return json({ error: "Invalid email or password." }, 401);
    }

    if (!user.email_verified_at) {
      return json({ error: "Please confirm your email before signing in.", requiresVerification: true }, 403);
    }

    const session = await createSession(env, user.id);
    return json(
      { user: { id: user.id, email: user.email, name: user.name } },
      200,
      { "Set-Cookie": sessionCookie(session.token, session.expiresAt) }
    );
  } catch (error) {
    return json({ error: error.message || "Signin failed." }, 500);
  }
}
