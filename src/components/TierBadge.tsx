"use client";

import { BalanceTier, TIER_CONFIG } from "@/types";

interface TierBadgeProps {
  tier: BalanceTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function TierBadge({ tier, size = "md", showLabel = true }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];

  const sizeClasses = {
    sm: "text-lg px-2 py-0.5",
    md: "text-2xl px-3 py-1",
    lg: "text-4xl px-4 py-2",
  };

  const labelSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${config.gradient} bg-opacity-10 ${sizeClasses[size]}`}
      style={{ backgroundColor: `${config.color}15` }}
    >
      <span className="drop-shadow-md">{config.emoji}</span>
      {showLabel && (
        <span
          className={`font-bold ${labelSizes[size]}`}
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
