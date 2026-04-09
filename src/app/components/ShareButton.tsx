"use client";

import { useState } from "react";

export function ShareButton({ ideaId, ideaName }: { ideaId: number; ideaName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/idea/${ideaId}`;
    const text = `Check out "${ideaName}" on Pitch Arena — AI-generated startup ideas judged by AI`;

    if (navigator.share) {
      try {
        await navigator.share({ title: ideaName, text, url });
        return;
      } catch {
        // fallback to clipboard
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={share}
      className="flex items-center gap-2 px-4 py-2 text-sm border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-300"
    >
      {copied ? (
        <>
          <span>✓</span> Copied!
        </>
      ) : (
        <>
          <span>↗</span> Share
        </>
      )}
    </button>
  );
}
