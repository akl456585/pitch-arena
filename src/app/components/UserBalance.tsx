"use client";

import { useState, useEffect } from "react";

type User = { username: string; balance: number | null } | null;

export function UserBalance() {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUser(data));
  }, []);

  // Anonymous visitor — no row yet, render nothing.
  if (!user) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">{user.username}</span>
      <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
        ${(user.balance || 0).toLocaleString()}
      </span>
    </div>
  );
}
