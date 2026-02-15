import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  // Get latest verification
  const db = getDb();
  const verification = db
    .prepare(
      `SELECT * FROM verifications
       WHERE user_id = ? AND status = 'verified'
       ORDER BY verified_at DESC LIMIT 1`
    )
    .get(user.id) as Record<string, unknown> | undefined;

  return NextResponse.json({
    success: true,
    data: {
      user,
      verification: verification
        ? {
            id: verification.id,
            totalBtc: verification.total_btc,
            totalSatoshis: verification.total_satoshis,
            tier: verification.tier,
            verifiedAt: verification.verified_at,
            expiresAt: verification.expires_at,
          }
        : null,
    },
  });
}
