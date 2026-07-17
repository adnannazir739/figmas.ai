import {
  createEmailVerification,
  isValidEmail,
  json,
  normalizeEmail,
  readJson,
  requireDb,
  sendVerificationEmail
} from "../../_lib/api.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDb(env);
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return json({ error: "Enter a valid email address." }, 400);

    const user = await db
      .prepare("SELECT id, email, name, email_verified_at FROM users WHERE email = ?")
      .bind(email)
      .first();

    if (!user) return json({ ok: true });
    if (user.email_verified_at) return json({ ok: true, message: "Email is already verified." });

    const verification = await createEmailVerification(env, user.id);
    const emailResult = await sendVerificationEmail(env, request, user, verification.token);

    return json({
      ok: true,
      emailSent: emailResult.sent,
      verificationUrl: emailResult.verifyUrl,
      message: emailResult.sent ? "Verification email sent." : emailResult.reason
    });
  } catch (error) {
    return json({ error: error.message || "Could not resend verification email." }, 500);
  }
}
