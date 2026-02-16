import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const PERIOD_MAP: Record<string, string> = {
  "24h": "datetime('now', '-1 day')",
  "7d": "datetime('now', '-7 days')",
  "30d": "datetime('now', '-30 days')",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const tier = searchParams.get("tier");
  const period = searchParams.get("period");
  const offset = (page - 1) * limit;

  const db = getDb();

  let whereClause = "WHERE v.status = 'verified' AND v.expires_at > datetime('now')";
  const params: (string | number)[] = [];

  if (tier) {
    whereClause += " AND v.tier = ?";
    params.push(tier);
  }

  if (period && PERIOD_MAP[period]) {
    whereClause += ` AND v.verified_at >= ${PERIOD_MAP[period]}`;
  }

  const countRow = db
    .prepare(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       JOIN verifications v ON v.user_id = u.id
       ${whereClause}`
    )
    .get(...params) as { total: number };

  params.push(limit, offset);

  const rows = db
    .prepare(
      `SELECT u.id as user_id, u.x_username, u.x_display_name, u.x_profile_image,
              v.total_btc, v.tier, v.verified_at
       FROM users u
       JOIN verifications v ON v.user_id = u.id
       ${whereClause}
       ORDER BY v.total_btc DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params) as Array<Record<string, unknown>>;

  const entries = rows.map((row, i) => ({
    rank: offset + i + 1,
    userId: row.user_id,
    xUsername: row.x_username,
    xDisplayName: row.x_display_name,
    xProfileImage: row.x_profile_image,
    tier: row.tier,
    totalBtc: row.total_btc,
    verifiedAt: row.verified_at,
  }));

  return NextResponse.json({
    success: true,
    data: {
      entries,
      pagination: {
        page,
        limit,
        total: countRow.total,
        totalPages: Math.ceil(countRow.total / limit),
      },
    },
  });
}
