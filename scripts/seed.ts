/**
 * Seed script: Populates the database with test users and verified verifications
 * across all 7 tiers so the leaderboard is fully populated.
 *
 * Usage: npx tsx scripts/seed.ts
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "satstack.db");

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables if they don't exist (same schema as the app)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    x_id TEXT UNIQUE NOT NULL,
    x_username TEXT NOT NULL,
    x_display_name TEXT NOT NULL,
    x_profile_image TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    txids TEXT NOT NULL DEFAULT '[]',
    utxo_addresses TEXT NOT NULL DEFAULT '[]',
    total_satoshis INTEGER NOT NULL DEFAULT 0,
    total_btc REAL NOT NULL DEFAULT 0,
    tier TEXT NOT NULL DEFAULT 'shrimp',
    status TEXT NOT NULL DEFAULT 'pending',
    challenge TEXT NOT NULL,
    error_message TEXT,
    verified_at TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nonce TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
  CREATE INDEX IF NOT EXISTS idx_challenges_user ON challenges(user_id);
  CREATE INDEX IF NOT EXISTS idx_challenges_nonce ON challenges(nonce);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

function uuid(): string {
  return crypto.randomUUID();
}

function randomTxid(): string {
  return crypto.randomBytes(32).toString("hex");
}

function randomAddress(): string {
  // Generate a realistic-looking bc1q (bech32) address
  const chars = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  let addr = "bc1q";
  for (let i = 0; i < 38; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function getTier(btc: number): string {
  if (btc >= 1000) return "humpback";
  if (btc >= 100) return "whale";
  if (btc >= 10) return "shark";
  if (btc >= 1) return "dolphin";
  if (btc >= 0.1) return "fish";
  if (btc >= 0.01) return "crab";
  return "shrimp";
}

const SATOSHIS_PER_BTC = 100_000_000;

interface TestUser {
  username: string;
  displayName: string;
  btc: number;
  verifiedDaysAgo: number;
}

const testUsers: TestUser[] = [
  // Humpback tier (1000+ BTC) - 2 users
  { username: "nakamoto_legacy", displayName: "Nakamoto Legacy Fund", btc: 15420.5, verifiedDaysAgo: 2 },
  { username: "whale_capital", displayName: "Whale Capital", btc: 2150.75, verifiedDaysAgo: 5 },

  // Whale tier (100-1000 BTC) - 3 users
  { username: "deep_cold_storage", displayName: "Deep Cold Storage", btc: 850.25, verifiedDaysAgo: 1 },
  { username: "bitcoin_citadel", displayName: "Bitcoin Citadel", btc: 420.69, verifiedDaysAgo: 7 },
  { username: "hodl_treasury", displayName: "HODL Treasury", btc: 157.33, verifiedDaysAgo: 10 },

  // Shark tier (10-100 BTC) - 5 users
  { username: "stack_sats_daily", displayName: "Stack Sats Daily", btc: 88.42, verifiedDaysAgo: 3 },
  { username: "orange_pilled", displayName: "Orange Pilled", btc: 55.0, verifiedDaysAgo: 4 },
  { username: "full_node_runner", displayName: "Full Node Runner", btc: 34.21, verifiedDaysAgo: 6 },
  { username: "lightning_lord", displayName: "Lightning Lord", btc: 21.0, verifiedDaysAgo: 8 },
  { username: "proof_of_work", displayName: "Proof of Work", btc: 12.85, verifiedDaysAgo: 12 },

  // Dolphin tier (1-10 BTC) - 7 users
  { username: "whole_coiner", displayName: "Whole Coiner", btc: 8.88, verifiedDaysAgo: 2 },
  { username: "self_custody_ape", displayName: "Self Custody Ape", btc: 6.5, verifiedDaysAgo: 5 },
  { username: "utxo_management", displayName: "UTXO Management", btc: 4.2, verifiedDaysAgo: 9 },
  { username: "cold_card_enjoyer", displayName: "Coldcard Enjoyer", btc: 3.14159, verifiedDaysAgo: 3 },
  { username: "sats_stacker_21m", displayName: "21M Sats Stacker", btc: 2.1, verifiedDaysAgo: 11 },
  { username: "bitcoin_maxi_nyc", displayName: "Bitcoin Maxi NYC", btc: 1.5, verifiedDaysAgo: 7 },
  { username: "sovereign_individual", displayName: "Sovereign Individual", btc: 1.05, verifiedDaysAgo: 14 },

  // Fish tier (0.1-1 BTC) - 8 users
  { username: "dca_warrior", displayName: "DCA Warrior", btc: 0.85, verifiedDaysAgo: 1 },
  { username: "nostr_pleb", displayName: "Nostr Pleb", btc: 0.69, verifiedDaysAgo: 6 },
  { username: "plebian_stacker", displayName: "Plebian Stacker", btc: 0.55, verifiedDaysAgo: 4 },
  { username: "mempool_watcher", displayName: "Mempool Watcher", btc: 0.42, verifiedDaysAgo: 8 },
  { username: "sparrow_user", displayName: "Sparrow User", btc: 0.33, verifiedDaysAgo: 10 },
  { username: "block_height_fan", displayName: "Block Height Fan", btc: 0.25, verifiedDaysAgo: 13 },
  { username: "timechain_surfer", displayName: "Timechain Surfer", btc: 0.18, verifiedDaysAgo: 2 },
  { username: "difficulty_adj", displayName: "Difficulty Adjustment", btc: 0.11, verifiedDaysAgo: 15 },

  // Crab tier (0.01-0.1 BTC) - 7 users
  { username: "humble_stacker", displayName: "Humble Stacker", btc: 0.088, verifiedDaysAgo: 3 },
  { username: "sats_per_dollar", displayName: "Sats Per Dollar", btc: 0.065, verifiedDaysAgo: 5 },
  { username: "newbie_bitcoiner", displayName: "Newbie Bitcoiner", btc: 0.05, verifiedDaysAgo: 7 },
  { username: "bitcoin_curious", displayName: "Bitcoin Curious", btc: 0.035, verifiedDaysAgo: 9 },
  { username: "first_sat_buyer", displayName: "First Sat Buyer", btc: 0.025, verifiedDaysAgo: 11 },
  { username: "fiat_refugee", displayName: "Fiat Refugee", btc: 0.018, verifiedDaysAgo: 4 },
  { username: "orange_pill_me", displayName: "Orange Pill Me", btc: 0.012, verifiedDaysAgo: 14 },

  // Shrimp tier (< 0.01 BTC) - 5 users
  { username: "just_started", displayName: "Just Started", btc: 0.008, verifiedDaysAgo: 2 },
  { username: "micro_stacker", displayName: "Micro Stacker", btc: 0.005, verifiedDaysAgo: 6 },
  { username: "satoshi_collector", displayName: "Satoshi Collector", btc: 0.003, verifiedDaysAgo: 8 },
  { username: "one_dollar_btc", displayName: "One Dollar BTC", btc: 0.001, verifiedDaysAgo: 12 },
  { username: "baby_steps_btc", displayName: "Baby Steps BTC", btc: 0.0005, verifiedDaysAgo: 1 },
];

console.log("Seeding SatStack database...\n");

const insertUser = db.prepare(
  `INSERT OR IGNORE INTO users (id, x_id, x_username, x_display_name, x_profile_image, created_at, updated_at)
   VALUES (?, ?, ?, ?, '', ?, ?)`
);

const insertVerification = db.prepare(
  `INSERT INTO verifications (id, user_id, txids, utxo_addresses, total_satoshis, total_btc, tier, status, challenge, verified_at, expires_at, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?, ?, ?)`
);

const seedAll = db.transaction(() => {
  let count = 0;
  for (const testUser of testUsers) {
    const userId = uuid();
    const xId = `seed_${testUser.username}`;
    const createdAt = daysAgo(testUser.verifiedDaysAgo + 5);

    insertUser.run(userId, xId, testUser.username, testUser.displayName, createdAt, createdAt);

    // Check if user was actually inserted (might already exist from a previous seed)
    const existingUser = db
      .prepare("SELECT id FROM users WHERE x_id = ?")
      .get(xId) as { id: string } | undefined;

    const actualUserId = existingUser?.id || userId;

    // Only insert verification if user doesn't already have one
    const existingVerification = db
      .prepare(
        "SELECT id FROM verifications WHERE user_id = ? AND status = 'verified' AND expires_at > datetime('now')"
      )
      .get(actualUserId) as { id: string } | undefined;

    if (existingVerification) {
      console.log(`  Skipping ${testUser.username} (already verified)`);
      continue;
    }

    const verificationId = uuid();
    const totalSatoshis = Math.round(testUser.btc * SATOSHIS_PER_BTC);
    const tier = getTier(testUser.btc);
    const nonce = `satstack:${crypto.randomBytes(16).toString("hex")}`;
    const verifiedAt = daysAgo(testUser.verifiedDaysAgo);
    const expiresAt = daysFromNow(30 - testUser.verifiedDaysAgo);

    // Generate realistic UTXO data
    const numUtxos = Math.min(Math.ceil(testUser.btc * 3) + 1, 10);
    const txids: string[] = [];
    const addresses: string[] = [];
    for (let i = 0; i < numUtxos; i++) {
      txids.push(randomTxid());
      addresses.push(randomAddress());
    }

    insertVerification.run(
      verificationId,
      actualUserId,
      JSON.stringify(txids),
      JSON.stringify(addresses),
      totalSatoshis,
      testUser.btc,
      tier,
      nonce,
      verifiedAt,
      expiresAt,
      verifiedAt
    );

    count++;
    const tierEmoji: Record<string, string> = {
      humpback: "🐳", whale: "🐋", shark: "🦈", dolphin: "🐬",
      fish: "🐟", crab: "🦀", shrimp: "🦐",
    };
    console.log(
      `  ${tierEmoji[tier]} ${testUser.displayName.padEnd(28)} ${testUser.btc.toString().padStart(12)} BTC  [${tier}]`
    );
  }
  return count;
});

const count = seedAll();

console.log(`\nSeeded ${count} test users with verified balances.`);
console.log(`Database: ${DB_PATH}`);
console.log("\nTier distribution:");

const tiers = ["humpback", "whale", "shark", "dolphin", "fish", "crab", "shrimp"];
for (const tier of tiers) {
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM verifications WHERE tier = ? AND status = 'verified' AND expires_at > datetime('now')"
    )
    .get(tier) as { count: number };
  console.log(`  ${tier.padEnd(10)} ${row.count} users`);
}

const total = db
  .prepare(
    "SELECT COUNT(*) as count FROM verifications WHERE status = 'verified' AND expires_at > datetime('now')"
  )
  .get() as { count: number };
console.log(`\nTotal verified users on leaderboard: ${total.count}`);

db.close();
