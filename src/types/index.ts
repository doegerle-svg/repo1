export interface User {
  id: string;
  xId: string;
  xUsername: string;
  xDisplayName: string;
  xProfileImage: string;
  createdAt: string;
  updatedAt: string;
}

export interface Verification {
  id: string;
  userId: string;
  txids: string[];
  utxoAddresses: string[];
  totalSatoshis: number;
  totalBtc: number;
  tier: BalanceTier;
  status: "pending" | "verified" | "expired" | "failed";
  challenge: string;
  verifiedAt: string | null;
  expiresAt: string;
  createdAt: string;
  errorMessage?: string;
}

export type BalanceTier =
  | "shrimp"      // < 0.01 BTC
  | "crab"        // 0.01 - 0.1 BTC
  | "fish"        // 0.1 - 1 BTC
  | "dolphin"     // 1 - 10 BTC
  | "shark"       // 10 - 100 BTC
  | "whale"       // 100 - 1000 BTC
  | "humpback";   // 1000+ BTC

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  xUsername: string;
  xDisplayName: string;
  xProfileImage: string;
  tier: BalanceTier;
  totalBtc: number;
  verifiedAt: string;
}

export interface Challenge {
  id: string;
  userId: string;
  nonce: string;
  expiresAt: string;
  used: boolean;
}

export interface PSBTVerificationResult {
  valid: boolean;
  totalSatoshis: number;
  utxoAddresses: string[];
  txids: string[];
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export const TIER_CONFIG: Record<BalanceTier, { label: string; emoji: string; minBtc: number; maxBtc: number; color: string; gradient: string }> = {
  shrimp:   { label: "Shrimp",   emoji: "🦐", minBtc: 0,     maxBtc: 0.01,    color: "#94a3b8", gradient: "from-slate-400 to-slate-500" },
  crab:     { label: "Crab",     emoji: "🦀", minBtc: 0.01,  maxBtc: 0.1,     color: "#f97316", gradient: "from-orange-400 to-orange-600" },
  fish:     { label: "Fish",     emoji: "🐟", minBtc: 0.1,   maxBtc: 1,       color: "#3b82f6", gradient: "from-blue-400 to-blue-600" },
  dolphin:  { label: "Dolphin",  emoji: "🐬", minBtc: 1,     maxBtc: 10,      color: "#8b5cf6", gradient: "from-violet-400 to-violet-600" },
  shark:    { label: "Shark",    emoji: "🦈", minBtc: 10,    maxBtc: 100,     color: "#6366f1", gradient: "from-indigo-400 to-indigo-600" },
  whale:    { label: "Whale",    emoji: "🐋", minBtc: 100,   maxBtc: 1000,    color: "#f59e0b", gradient: "from-amber-400 to-amber-600" },
  humpback: { label: "Humpback", emoji: "🐳", minBtc: 1000,  maxBtc: Infinity, color: "#eab308", gradient: "from-yellow-300 to-amber-500" },
};

export function getTierForBtc(btc: number): BalanceTier {
  if (btc >= 1000) return "humpback";
  if (btc >= 100) return "whale";
  if (btc >= 10) return "shark";
  if (btc >= 1) return "dolphin";
  if (btc >= 0.1) return "fish";
  if (btc >= 0.01) return "crab";
  return "shrimp";
}
