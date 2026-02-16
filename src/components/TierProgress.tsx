"use client";

import { BalanceTier, TIER_CONFIG } from "@/types";

const TIER_ORDER: BalanceTier[] = [
  "shrimp",
  "crab",
  "fish",
  "dolphin",
  "shark",
  "whale",
  "humpback",
];

export function TierProgress({
  btc,
  tier,
}: {
  btc: number;
  tier: BalanceTier;
}) {
  const currentIndex = TIER_ORDER.indexOf(tier);
  const isMaxTier = currentIndex === TIER_ORDER.length - 1;

  const currentConfig = TIER_CONFIG[tier];
  const nextTier = isMaxTier ? null : TIER_ORDER[currentIndex + 1];
  const nextConfig = nextTier ? TIER_CONFIG[nextTier] : null;

  let progress = 100;
  let remaining = 0;

  if (!isMaxTier && nextConfig) {
    const rangeStart = currentConfig.minBtc;
    const rangeEnd = nextConfig.minBtc;
    progress = Math.min(
      100,
      Math.max(0, ((btc - rangeStart) / (rangeEnd - rangeStart)) * 100)
    );
    remaining = Math.max(0, rangeEnd - btc);
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-secondary">
          {currentConfig.emoji} {currentConfig.label}
        </span>
        {nextConfig && nextTier ? (
          <span className="text-xs text-muted">
            {nextConfig.emoji} {nextConfig.label} ({remaining.toFixed(remaining < 1 ? 4 : 2)} BTC to go)
          </span>
        ) : (
          <span className="text-xs text-gold font-medium">Max Tier!</span>
        )}
      </div>
      <div className="w-full h-2 bg-[#0a0a0f] rounded-full border border-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${currentConfig.color}, ${
              nextConfig?.color || "#ffd700"
            })`,
          }}
        />
      </div>
      {/* Tier dots */}
      <div className="flex items-center justify-between mt-1.5">
        {TIER_ORDER.map((t, i) => (
          <div
            key={t}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              i <= currentIndex ? "opacity-100" : "opacity-30"
            }`}
            style={{ backgroundColor: TIER_CONFIG[t].color }}
            title={`${TIER_CONFIG[t].emoji} ${TIER_CONFIG[t].label}`}
          />
        ))}
      </div>
    </div>
  );
}
