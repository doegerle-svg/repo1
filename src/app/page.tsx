"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Trophy, Upload, Zap, Bitcoin, ArrowRight, Lock, Eye, Users, TrendingUp, CheckCircle } from "lucide-react";
import { TIER_CONFIG, BalanceTier } from "@/types";

interface Stats {
  totalStackers: number;
  totalBtc: number;
  totalVerifications: number;
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(value, increment * step);
      setDisplay(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const formatted = value >= 1
    ? display.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : display.toFixed(8);

  return <span>{formatted}{suffix}</span>;
}

export default function HomePage() {
  const tiers = Object.entries(TIER_CONFIG) as [BalanceTier, typeof TIER_CONFIG[BalanceTier]][];
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-grid">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-bitcoin/5 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bitcoin/10 border border-bitcoin/20 text-bitcoin text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              On-chain verified Bitcoin holdings
            </div>

            <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6">
              <span className="bg-gradient-to-r from-foreground via-foreground to-secondary bg-clip-text text-transparent">
                Prove Your{" "}
              </span>
              <span className="bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent btc-glow inline-block">
                Stack
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-secondary max-w-2xl mx-auto mb-12 leading-relaxed">
              The Bitcoin leaderboard where your holdings are
              <span className="text-foreground font-semibold"> cryptographically verified </span>
              on-chain using PSBT files. No trust required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/api/auth/x"
                className="group flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-bitcoin to-amber-600 text-white hover:shadow-2xl hover:shadow-bitcoin/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Sign in with X
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/leaderboard"
                className="flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-medium bg-card border border-border text-secondary hover:text-foreground hover:border-secondary transition-all duration-300"
              >
                <Trophy className="w-5 h-5" />
                View Leaderboard
              </Link>
            </div>
          </div>

          {/* Live stats social proof */}
          {stats && stats.totalStackers > 0 && (
            <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-bitcoin" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  <AnimatedCounter value={stats.totalStackers} />
                </div>
                <p className="text-xs text-muted mt-1">Verified Stackers</p>
              </div>
              <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Bitcoin className="w-4 h-4 text-bitcoin" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-bitcoin">
                  <AnimatedCounter value={stats.totalBtc} />
                </div>
                <p className="text-xs text-muted mt-1">BTC Proven</p>
              </div>
              <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  <AnimatedCounter value={stats.totalVerifications} />
                </div>
                <p className="text-xs text-muted mt-1">Verifications</p>
              </div>
            </div>
          )}

          {/* Floating BTC symbols */}
          <div className="absolute top-20 left-10 opacity-10 float-animation hidden lg:block">
            <Bitcoin className="w-24 h-24 text-bitcoin" />
          </div>
          <div className="absolute bottom-20 right-10 opacity-10 float-animation hidden lg:block" style={{ animationDelay: "2s" }}>
            <Bitcoin className="w-16 h-16 text-bitcoin" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-secondary text-lg max-w-2xl mx-auto">
            Three simple steps to prove your Bitcoin holdings and claim your spot on the leaderboard
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Lock,
              step: "01",
              title: "Sign in with X",
              description:
                "Connect your X account to create your public identity on the leaderboard. Your holdings will be linked to your handle.",
            },
            {
              icon: Upload,
              step: "02",
              title: "Create & Upload PSBT",
              description:
                "Generate a signed PSBT from your wallet with our unique challenge nonce. This proves key ownership without broadcasting anything.",
            },
            {
              icon: Shield,
              step: "03",
              title: "Get Verified",
              description:
                "We verify the signatures and UTXO values on-chain. Your proven balance appears on the leaderboard with your tier rank.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative group"
            >
              <div className="bg-card border border-border rounded-2xl p-8 hover:border-bitcoin/30 hover:bg-card-hover transition-all duration-300 h-full">
                <div className="text-5xl font-black text-bitcoin/10 mb-4">
                  {item.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-bitcoin/10 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-bitcoin" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-secondary leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tier showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Tier Rankings</h2>
          <p className="text-secondary text-lg max-w-2xl mx-auto">
            Your verified balance determines your tier. How high can you stack?
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {tiers.map(([key, config]) => (
            <div
              key={key}
              className="bg-card border border-border rounded-xl p-6 text-center hover:border-bitcoin/30 hover:bg-card-hover transition-all duration-300 group"
            >
              <div className="text-4xl mb-3 group-hover:scale-125 transition-transform duration-300">
                {config.emoji}
              </div>
              <h3
                className="font-bold text-sm mb-1"
                style={{ color: config.color }}
              >
                {config.label}
              </h3>
              <p className="text-xs text-muted">
                {config.maxBtc === Infinity
                  ? `${config.minBtc.toLocaleString()}+ BTC`
                  : `${config.minBtc} - ${config.maxBtc} BTC`}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Security note */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="bg-card border border-border rounded-2xl p-8 sm:p-12">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <Eye className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3">Security First</h3>
              <div className="space-y-3 text-secondary leading-relaxed">
                <p>
                  <strong className="text-foreground">Nothing is broadcast.</strong> Your PSBT is
                  never sent to the Bitcoin network. We only verify the signatures offline.
                </p>
                <p>
                  <strong className="text-foreground">Challenge-response.</strong> Each verification
                  uses a unique nonce so old PSBTs can&apos;t be replayed.
                </p>
                <p>
                  <strong className="text-foreground">Hardware wallet friendly.</strong> Create and
                  sign PSBTs entirely on your Coldcard, Ledger, or Trezor without exposing keys.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bitcoin to-amber-600 flex items-center justify-center">
                <Bitcoin className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent">
                SatStack
              </span>
            </div>
            <p className="text-sm text-muted">
              Verify on-chain. Trust no one. Stack sats.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
