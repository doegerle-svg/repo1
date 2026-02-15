import { NextResponse } from "next/server";
import { createSession, findOrCreateUser } from "@/lib/auth";

// Demo login for development/testing - creates a mock X user
export async function POST() {
  const demoUsers = [
    { xId: "demo_001", xUsername: "satoshi_fan", xDisplayName: "Satoshi Fan", xProfileImage: "" },
    { xId: "demo_002", xUsername: "btc_maximalist", xDisplayName: "BTC Maximalist", xProfileImage: "" },
    { xId: "demo_003", xUsername: "hodl_queen", xDisplayName: "HODL Queen", xProfileImage: "" },
  ];

  const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
  const userId = findOrCreateUser(randomUser);
  await createSession(userId);

  return NextResponse.json({
    success: true,
    data: { userId, username: randomUser.xUsername },
  });
}
