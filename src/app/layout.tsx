import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pitch Arena — AI Startup Ideas, Judged by AI",
  description:
    "A never-ending stream of AI-generated startup pitches, scored by a panel of AI judges. Browse, invest, and compete.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">🏟️</span>
              <span className="font-bold text-lg tracking-tight">
                Pitch Arena
              </span>
            </a>
            <nav className="flex gap-4 text-sm text-zinc-400">
              <a href="/" className="hover:text-white transition-colors">
                Feed
              </a>
              <a
                href="/leaderboard"
                className="hover:text-white transition-colors"
              >
                Leaderboard
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
