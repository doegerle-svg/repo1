import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

const CHALLENGE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function POST() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const db = getDb();

  // Invalidate any existing unused challenges for this user
  db.prepare(
    "UPDATE challenges SET used = 1 WHERE user_id = ? AND used = 0"
  ).run(user.id);

  const id = uuidv4();
  const nonce = `satstack:${crypto.randomBytes(16).toString("hex")}`;
  const expiresAt = new Date(Date.now() + CHALLENGE_DURATION_MS).toISOString();

  db.prepare(
    "INSERT INTO challenges (id, user_id, nonce, expires_at) VALUES (?, ?, ?, ?)"
  ).run(id, user.id, nonce, expiresAt);

  return NextResponse.json({
    success: true,
    data: {
      challengeId: id,
      nonce,
      expiresAt,
      instructions: [
        "1. Open your Bitcoin wallet software (e.g., Sparrow, Electrum, Bitcoin Core)",
        "2. Create a new transaction spending from the UTXOs you want to verify",
        `3. Add an OP_RETURN output with the data: ${nonce}`,
        "4. Sign the transaction (DO NOT broadcast it)",
        "5. Export/save as a PSBT file",
        "6. Upload the .psbt file below",
      ],
    },
  });
}
