import {
  createEmailVerification,
  hashPassword,
  isValidEmail,
  json,
  normalizeEmail,
  randomSalt,
  readJson,
  requireDb,
  safeName,
  sendVerificationEmail
} from "../../_lib/api.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDb(env);
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const name = safeName(body.name);
    const password = String(body.password || "");

    if (!isValidEmail(email)) return json({ error: "Enter a valid email address." }, 400);
    if (name.length < 2) return json({ error: "Enter your name." }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);

    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) return json({ error: "An account already exists for this email." }, 409);

    const salt = randomSalt();
    const passwordHash = await hashPassword(password, salt);
    const userId = crypto.randomUUID();

    await db
      .prepare(
        "INSERT INTO users (id, email, name, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(userId, email, name, passwordHash, salt)
      .run();

    const verification = await createEmailVerification(env, userId);
    const emailResult = await sendVerificationEmail(env, request, { email, name }, verification.token);
    return json(
      {
        ok: true,
        requiresVerification: true,
        emailSent: emailResult.sent,
        verificationUrl: emailResult.verifyUrl,
        message: emailResult.sent
          ? "Account created. Check your email to confirm your account."
          : emailResult.reason
      },
      201
    );
  } catch (error) {
    return json({ error: error.message || "Signup failed." }, 500);
  }
}
