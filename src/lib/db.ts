import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "satstack.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
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
}
