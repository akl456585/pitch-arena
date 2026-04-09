"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type LeaderboardEntry = {
  userId: number;
  username: string;
  balance: number;
  totalInvested: number;
  investmentCount: number;
  portfolioValue: number;
  totalValue: number;
};

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm text-zinc-500 w-6 text-center font-mono">{rank}</span>;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setLeaderboard(data.leaderboard);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
        <p className="text-zinc-400">
          Top investors ranked by total portfolio value.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-lg font-medium">No investors yet</p>
          <p className="text-sm mt-1">
            Be the first to{" "}
            <Link href="/" className="text-indigo-400 hover:underline">
              invest in an idea
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-zinc-500 uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Investor</div>
            <div className="col-span-2 text-right">Balance</div>
            <div className="col-span-2 text-right">Portfolio</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1 text-right">Bets</div>
          </div>

          {leaderboard.map((entry, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;

            return (
              <div
                key={entry.userId}
                className={`grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-xl border transition-colors ${
                  isTop3
                    ? "border-zinc-700 bg-zinc-900/70"
                    : "border-zinc-800/50 hover:bg-zinc-900/30"
                }`}
              >
                <div className="col-span-1 flex justify-center">
                  <Medal rank={rank} />
                </div>
                <div className="col-span-4">
                  <span className={`font-medium ${isTop3 ? "text-white" : "text-zinc-300"}`}>
                    {entry.username}
                  </span>
                </div>
                <div className="col-span-2 text-right font-mono text-sm text-zinc-400">
                  ${(entry.balance || 0).toLocaleString()}
                </div>
                <div className="col-span-2 text-right font-mono text-sm text-zinc-400">
                  ${entry.portfolioValue.toLocaleString()}
                </div>
                <div className="col-span-2 text-right font-mono text-sm font-bold text-white">
                  ${entry.totalValue.toLocaleString()}
                </div>
                <div className="col-span-1 text-right font-mono text-sm text-zinc-500">
                  {entry.investmentCount}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
