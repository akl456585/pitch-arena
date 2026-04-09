"use client";

import { useState, useEffect } from "react";

export function UserBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((user) => {
        setBalance(user.balance);
        setUsername(user.username);
      });
  }, []);

  if (balance === null) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">{username}</span>
      <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
        ${(balance || 0).toLocaleString()}
      </span>
    </div>
  );
}
