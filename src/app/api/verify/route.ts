import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { verifyPSBT, satsToBtc } from "@/lib/psbt-verify";
import { getTierForBtc } from "@/types";
import { v4 as uuidv4 } from "uuid";

const VERIFICATION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const db = getDb();

  let body: { psbt: string; challengeId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { psbt, challengeId } = body;

  if (!psbt || !challengeId) {
    return NextResponse.json(
      { success: false, error: "Missing psbt or challengeId" },
      { status: 400 }
    );
  }

  // Validate challenge
  const challenge = db
    .prepare(
      `SELECT * FROM challenges
       WHERE id = ? AND user_id = ? AND used = 0 AND expires_at > datetime('now')`
    )
    .get(challengeId, user.id) as Record<string, string> | undefined;

  if (!challenge) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid or expired challenge. Please generate a new one.",
      },
      { status: 400 }
    );
  }

  // Mark challenge as used
  db.prepare("UPDATE challenges SET used = 1 WHERE id = ?").run(challengeId);

  // Verify the PSBT
  const result = verifyPSBT(psbt, challenge.nonce);

  const verificationId = uuidv4();
  const now = new Date().toISOString();

  if (!result.valid) {
    db.prepare(
      `INSERT INTO verifications (id, user_id, challenge, status, error_message, expires_at)
       VALUES (?, ?, ?, 'failed', ?, ?)`
    ).run(
      verificationId,
      user.id,
      challenge.nonce,
      result.error || "Verification failed",
      now
    );

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  }

  const totalBtc = satsToBtc(result.totalSatoshis);
  const tier = getTierForBtc(totalBtc);
  const expiresAt = new Date(
    Date.now() + VERIFICATION_DURATION_MS
  ).toISOString();

  // Check for UTXO overlap with other users
  const existingAddresses = db
    .prepare(
      `SELECT utxo_addresses, user_id FROM verifications
       WHERE status = 'verified' AND user_id != ? AND expires_at > datetime('now')`
    )
    .all(user.id) as Array<{ utxo_addresses: string; user_id: string }>;

  for (const existing of existingAddresses) {
    const addrs: string[] = JSON.parse(existing.utxo_addresses);
    const overlap = result.utxoAddresses.filter((a) => addrs.includes(a));
    if (overlap.length > 0) {
      db.prepare(
        `INSERT INTO verifications (id, user_id, challenge, status, error_message, expires_at)
         VALUES (?, ?, ?, 'failed', ?, ?)`
      ).run(
        verificationId,
        user.id,
        challenge.nonce,
        `UTXO address(es) already claimed by another user: ${overlap.join(", ")}`,
        now
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "One or more UTXOs are already verified by another user. Each UTXO can only be claimed by one account.",
        },
        { status: 409 }
      );
    }
  }

  // Expire previous verifications for this user
  db.prepare(
    `UPDATE verifications SET status = 'expired'
     WHERE user_id = ? AND status = 'verified'`
  ).run(user.id);

  // Save the new verification
  db.prepare(
    `INSERT INTO verifications (id, user_id, txids, utxo_addresses, total_satoshis, total_btc, tier, status, challenge, verified_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?, ?)`
  ).run(
    verificationId,
    user.id,
    JSON.stringify(result.txids),
    JSON.stringify(result.utxoAddresses),
    result.totalSatoshis,
    totalBtc,
    tier,
    challenge.nonce,
    now,
    expiresAt
  );

  return NextResponse.json({
    success: true,
    data: {
      verificationId,
      totalSatoshis: result.totalSatoshis,
      totalBtc,
      tier,
      utxoCount: result.utxoAddresses.length,
      expiresAt,
    },
  });
}
