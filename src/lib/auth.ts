import { getDb } from "./db";
import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";

const SESSION_COOKIE = "satstack_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionUser {
  id: string;
  xId: string;
  xUsername: string;
  xDisplayName: string;
  xProfileImage: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.id as session_id, s.expires_at,
              u.id, u.x_id, u.x_username, u.x_display_name, u.x_profile_image
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`
    )
    .get(sessionId) as Record<string, string> | undefined;

  if (!row) return null;

  return {
    id: row.id,
    xId: row.x_id,
    xUsername: row.x_username,
    xDisplayName: row.x_display_name,
    xProfileImage: row.x_profile_image,
  };
}

export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  ).run(sessionId, userId, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return sessionId;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    cookieStore.delete(SESSION_COOKIE);
  }
}

export function findOrCreateUser(profile: {
  xId: string;
  xUsername: string;
  xDisplayName: string;
  xProfileImage: string;
}): string {
  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM users WHERE x_id = ?")
    .get(profile.xId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE users SET x_username = ?, x_display_name = ?, x_profile_image = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(profile.xUsername, profile.xDisplayName, profile.xProfileImage, existing.id);
    return existing.id;
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO users (id, x_id, x_username, x_display_name, x_profile_image)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, profile.xId, profile.xUsername, profile.xDisplayName, profile.xProfileImage);

  return id;
}
