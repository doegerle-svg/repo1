import { NextResponse } from "next/server";
import { getSession, destroySession } from "@/lib/auth";
import { getDb } from "@/lib/db";

// Delete account and all associated data
export async function DELETE() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const db = getDb();

  // Cascade deletes handle verifications, challenges, sessions
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  await destroySession();

  return NextResponse.json({ success: true });
}
