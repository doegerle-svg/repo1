import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const stats = db
    .prepare(
      `SELECT
         COUNT(DISTINCT v.user_id) as total_stackers,
         COALESCE(SUM(v.total_btc), 0) as total_btc,
         COUNT(v.id) as total_verifications
       FROM verifications v
       WHERE v.status = 'verified' AND v.expires_at > datetime('now')`
    )
    .get() as { total_stackers: number; total_btc: number; total_verifications: number };

  const tierCounts = db
    .prepare(
      `SELECT v.tier, COUNT(DISTINCT v.user_id) as count
       FROM verifications v
       WHERE v.status = 'verified' AND v.expires_at > datetime('now')
       GROUP BY v.tier
       ORDER BY count DESC`
    )
    .all() as Array<{ tier: string; count: number }>;

  const topTier = tierCounts.length > 0 ? tierCounts[0].tier : null;

  return NextResponse.json({
    success: true,
    data: {
      totalStackers: stats.total_stackers,
      totalBtc: Math.round(stats.total_btc * 100) / 100,
      totalVerifications: stats.total_verifications,
      topTier,
      tierCounts: Object.fromEntries(tierCounts.map((t) => [t.tier, t.count])),
    },
  });
}
