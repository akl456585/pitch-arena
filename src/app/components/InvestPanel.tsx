"use client";

import { useState, useEffect } from "react";

type User = {
  id: number;
  username: string;
  balance: number;
};

const DEFAULT_STARTING_BALANCE = 10000;

export function InvestPanel({ ideaId }: { ideaId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUser(data));
  }, []);

  async function invest() {
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/invest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId, amount }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      // /api/invest always returns { id, username, balance } of the (possibly
      // just-created) user, so this also populates the panel on first invest.
      setUser({ id: data.user.id, username: data.user.username, balance: data.user.balance });
      setMessage({ text: `Invested $${amount}!`, type: "success" });
    } else {
      setMessage({ text: data.error || "Investment failed", type: "error" });
    }
  }

  const balance = user?.balance ?? DEFAULT_STARTING_BALANCE;
  const presets = [100, 500, 1000, 2500];

  return (
    <div className="border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Invest</h3>
        <div className="text-sm text-zinc-400">
          <span className="text-zinc-500">Balance:</span>{" "}
          <span className="font-mono text-white">${balance.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(p)}
            className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
              amount === p
                ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            ${p.toLocaleString()}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          min={1}
          max={balance}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={invest}
          disabled={loading || amount <= 0 || amount > balance}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? "..." : "Invest"}
        </button>
      </div>

      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === "success" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      {user && (
        <p className="mt-3 text-xs text-zinc-600">
          As <span className="text-zinc-400">{user.username}</span>
        </p>
      )}
    </div>
  );
}
