const SESSION_COOKIE = "fgms_session";
const SESSION_DAYS = 14;
const PBKDF2_ITERATIONS = 120000;

export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function requireDb(env) {
  if (!env.DB) {
    throw new Error("Missing D1 binding named DB. Add a Cloudflare D1 binding called DB.");
  }
  return env.DB;
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function safeName(name) {
  return String(name || "").trim().slice(0, 80);
}

export function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function sessionCookie(token, expiresAt) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expiresAt.toUTCString()}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function randomToken(bytes = 32) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return base64Url(values);
}

export function randomSalt() {
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);
  return base64Url(values);
}

export async function hashPassword(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: PBKDF2_ITERATIONS
    },
    keyMaterial,
    256
  );
  return base64Url(new Uint8Array(bits));
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

export async function createSession(env, userId) {
  const db = requireDb(env);
  const token = randomToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db
    .prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, tokenHash, expiresAt.toISOString())
    .run();
  return { token, expiresAt };
}

export async function getCurrentUser(request, env) {
  const db = requireDb(env);
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  return await db
    .prepare(
      `SELECT users.id, users.email, users.name, users.created_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > datetime('now')
       LIMIT 1`
    )
    .bind(tokenHash)
    .first();
}

export async function requireUser(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) return { error: json({ error: "Please sign in first." }, 401) };
  return { user };
}

export async function deleteCurrentSession(request, env) {
  const db = requireDb(env);
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return;
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
