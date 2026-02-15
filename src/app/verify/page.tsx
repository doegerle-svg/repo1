"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  Shield,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { TierBadge } from "@/components/TierBadge";
import { BitcoinAmount } from "@/components/BitcoinAmount";
import { BalanceTier } from "@/types";

interface Challenge {
  challengeId: string;
  nonce: string;
  expiresAt: string;
  instructions: string[];
}

interface VerificationResult {
  verificationId: string;
  totalSatoshis: number;
  totalBtc: number;
  tier: BalanceTier;
  utxoCount: number;
  expiresAt: string;
}

type Step = "generate" | "upload" | "success";

export default function VerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("generate");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setAuthenticated(data.success))
      .catch(() => setAuthenticated(false));
  }, []);

  const generateChallenge = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/challenge", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to generate challenge");
        return;
      }
      setChallenge(data.data);
      setStep("upload");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyNonce = async () => {
    if (!challenge) return;
    await navigator.clipboard.writeText(challenge.nonce);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const submitPSBT = async () => {
    if (!selectedFile || !challenge) return;
    setLoading(true);
    setError("");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          psbt: base64,
          challengeId: challenge.challengeId,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Verification failed");
        return;
      }

      setResult(data.data);
      setStep("success");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-bitcoin animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <Shield className="w-16 h-16 mx-auto mb-6 text-muted" />
        <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
        <p className="text-secondary mb-8 text-lg">
          You need to sign in with your X account before verifying your Bitcoin
          holdings.
        </p>
        <a
          href="/api/auth/x"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-bitcoin to-amber-600 text-white hover:shadow-2xl hover:shadow-bitcoin/30 transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Sign in with X
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-bitcoin/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-bitcoin" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Verify Your Stack</h1>
            <p className="text-secondary">
              Prove your Bitcoin holdings using a signed PSBT
            </p>
          </div>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-10">
        {(["generate", "upload", "success"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s
                  ? "bg-bitcoin text-white"
                  : i < ["generate", "upload", "success"].indexOf(step)
                  ? "bg-green-500 text-white"
                  : "bg-card border border-border text-muted"
              }`}
            >
              {i < ["generate", "upload", "success"].indexOf(step) ? (
                <Check className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && (
              <div
                className={`w-16 sm:w-24 h-0.5 ${
                  i < ["generate", "upload", "success"].indexOf(step)
                    ? "bg-green-500"
                    : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Generate challenge */}
      {step === "generate" && (
        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-2">Generate Challenge</h2>
          <p className="text-secondary mb-6">
            We&apos;ll create a unique challenge nonce for you. You&apos;ll include this in
            your PSBT as an OP_RETURN output to prove freshness.
          </p>

          <div className="bg-[#0a0a0f] rounded-xl p-6 mb-6 border border-border">
            <h3 className="text-sm font-semibold text-secondary mb-3">
              What you&apos;ll need:
            </h3>
            <ul className="space-y-2 text-sm text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-bitcoin mt-0.5">1.</span>
                A Bitcoin wallet that supports PSBT (Sparrow, Electrum, Bitcoin
                Core, Coldcard, etc.)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-bitcoin mt-0.5">2.</span>
                UTXOs you want to prove ownership of
              </li>
              <li className="flex items-start gap-2">
                <span className="text-bitcoin mt-0.5">3.</span>
                Ability to add an OP_RETURN output to a transaction
              </li>
            </ul>
          </div>

          <button
            onClick={generateChallenge}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-bitcoin to-amber-600 text-white hover:shadow-lg hover:shadow-bitcoin/25 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Generate Challenge
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Upload PSBT */}
      {step === "upload" && challenge && (
        <div className="space-y-6">
          {/* Challenge info */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4">Your Challenge Nonce</h2>
            <p className="text-secondary text-sm mb-4">
              Include this exact string as an OP_RETURN output in your PSBT:
            </p>

            <div className="flex items-center gap-2 bg-[#0a0a0f] rounded-xl p-4 border border-border">
              <code className="flex-1 text-sm font-mono text-bitcoin break-all">
                {challenge.nonce}
              </code>
              <button
                onClick={copyNonce}
                className="shrink-0 p-2 rounded-lg bg-card hover:bg-card-hover border border-border transition-colors"
                title="Copy nonce"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-secondary" />
                )}
              </button>
            </div>

            <div className="mt-4 text-xs text-muted">
              Expires:{" "}
              {new Date(challenge.expiresAt).toLocaleString()}
            </div>

            {/* Instructions */}
            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-semibold text-secondary">
                Instructions:
              </h3>
              {challenge.instructions.map((instruction, i) => (
                <p key={i} className="text-sm text-secondary">
                  {instruction}
                </p>
              ))}
            </div>
          </div>

          {/* Upload area */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4">Upload Signed PSBT</h2>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                dragOver
                  ? "border-bitcoin bg-bitcoin/5"
                  : selectedFile
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-border hover:border-secondary"
              }`}
            >
              <input
                type="file"
                accept=".psbt,.txt"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {selectedFile ? (
                <div className="space-y-3">
                  <FileText className="w-12 h-12 mx-auto text-green-400" />
                  <p className="font-medium text-green-400">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-muted">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 mx-auto text-muted" />
                  <p className="text-secondary font-medium">
                    Drop your .psbt file here or click to browse
                  </p>
                  <p className="text-xs text-muted">
                    Supports .psbt and .txt files up to 1MB
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => {
                  setStep("generate");
                  setChallenge(null);
                  setSelectedFile(null);
                  setError("");
                }}
                className="px-6 py-3 rounded-xl font-medium bg-card border border-border text-secondary hover:text-foreground transition-all"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                New Challenge
              </button>
              <button
                onClick={submitPSBT}
                disabled={!selectedFile || loading}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-bitcoin to-amber-600 text-white hover:shadow-lg hover:shadow-bitcoin/25 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Verify PSBT
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === "success" && result && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-400" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Verification Successful!</h2>
          <p className="text-secondary mb-8">
            Your Bitcoin holdings have been cryptographically verified on-chain.
          </p>

          <div className="bg-[#0a0a0f] rounded-xl p-8 mb-8 border border-border inline-block">
            <div className="mb-4">
              <TierBadge tier={result.tier} size="lg" />
            </div>
            <div className="mb-2">
              <BitcoinAmount btc={result.totalBtc} size="lg" />
            </div>
            <p className="text-sm text-muted">
              {result.utxoCount} UTXO{result.utxoCount !== 1 ? "s" : ""}{" "}
              verified &bull; Expires{" "}
              {new Date(result.expiresAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push("/leaderboard")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-bitcoin to-amber-600 text-white hover:shadow-lg transition-all"
            >
              View Leaderboard
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-card border border-border text-secondary hover:text-foreground transition-all"
            >
              Go to Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
