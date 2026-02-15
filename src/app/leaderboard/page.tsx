"use client";

import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Trophy } from "lucide-react";

export default function LeaderboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-bitcoin/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-bitcoin" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Leaderboard</h1>
            <p className="text-secondary">
              On-chain verified Bitcoin holdings ranked by balance
            </p>
          </div>
        </div>
      </div>

      <LeaderboardTable />
    </div>
  );
}
