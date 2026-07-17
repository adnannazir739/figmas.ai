import { clearSessionCookie, deleteCurrentSession, json } from "../../_lib/api.js";

export async function onRequestPost({ request, env }) {
  try {
    await deleteCurrentSession(request, env);
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
  } catch (error) {
    return json({ error: error.message || "Signout failed." }, 500);
  }
}
