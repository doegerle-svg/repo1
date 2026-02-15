"use client";

import { useState, useEffect } from "react";
import { TierBadge } from "./TierBadge";
import { BitcoinAmount } from "./BitcoinAmount";
import { LeaderboardEntry, BalanceTier, TIER_CONFIG } from "@/types";
import { Trophy, ChevronLeft, ChevronRight, Filter } from "lucide-react";

export function LeaderboardTable() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [tierFilter, setTierFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (tierFilter) params.set("tier", tierFilter);

    fetch(`/api/leaderboard?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEntries(data.data.entries);
          setTotalPages(data.data.pagination.totalPages);
          setTotal(data.data.pagination.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, tierFilter]);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { class: "rank-gold", icon: "👑" };
    if (rank === 2) return { class: "rank-silver", icon: "🥈" };
    if (rank === 3) return { class: "rank-bronze", icon: "🥉" };
    return { class: "text-secondary", icon: null };
  };

  const tiers = Object.entries(TIER_CONFIG) as [BalanceTier, typeof TIER_CONFIG[BalanceTier]][];

  return (
    <div className="space-y-6">
      {/* Tier filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-secondary" />
        <button
          onClick={() => { setTierFilter(""); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !tierFilter
              ? "bg-bitcoin/20 text-bitcoin border border-bitcoin/30"
              : "bg-card text-secondary border border-border hover:border-secondary"
          }`}
        >
          All
        </button>
        {tiers.map(([key, config]) => (
          <button
            key={key}
            onClick={() => { setTierFilter(key); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              tierFilter === key
                ? "bg-bitcoin/20 text-bitcoin border border-bitcoin/30"
                : "bg-card text-secondary border border-border hover:border-secondary"
            }`}
          >
            {config.emoji} {config.label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm text-secondary">
        <span>{total} verified stacker{total !== 1 ? "s" : ""}</span>
        <span>Page {page} of {Math.max(1, totalPages)}</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-card/50 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider w-16">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                  Stacker
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider">
                  Verified BTC
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider hidden sm:table-cell">
                  Verified
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="shimmer">
                    <td colSpan={5} className="px-4 py-5">
                      <div className="h-4 bg-card rounded" />
                    </td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-muted" />
                    <p className="text-secondary text-lg font-medium">No verified stackers yet</p>
                    <p className="text-muted text-sm mt-1">Be the first to verify your stack!</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const rankStyle = getRankDisplay(entry.rank);
                  return (
                    <tr
                      key={entry.userId}
                      className="hover:bg-card/50 transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <span className={`text-lg font-bold ${rankStyle.class}`}>
                          {rankStyle.icon ? (
                            <span className="mr-1">{rankStyle.icon}</span>
                          ) : (
                            `#${entry.rank}`
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-sm font-bold shrink-0">
                            {entry.xDisplayName[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="font-semibold group-hover:text-bitcoin transition-colors">
                              {entry.xDisplayName}
                            </p>
                            <p className="text-xs text-muted">@{entry.xUsername}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <TierBadge tier={entry.tier as BalanceTier} size="sm" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <BitcoinAmount btc={entry.totalBtc} size="sm" />
                      </td>
                      <td className="px-4 py-4 text-right hidden sm:table-cell">
                        <span className="text-xs text-muted">
                          {new Date(entry.verifiedAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-card border border-border text-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            if (pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                  pageNum === page
                    ? "bg-bitcoin text-white"
                    : "bg-card border border-border text-secondary hover:text-foreground"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-card border border-border text-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
