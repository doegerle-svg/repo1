"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Upload,
  Trash2,
  Loader2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { TierBadge } from "@/components/TierBadge";
import { BitcoinAmount } from "@/components/BitcoinAmount";
import { BalanceTier } from "@/types";

interface UserData {
  id: string;
  xUsername: string;
  xDisplayName: string;
  xProfileImage: string;
}

interface VerificationData {
  id: string;
  totalBtc: number;
  totalSatoshis: number;
  tier: BalanceTier;
  verifiedAt: string;
  expiresAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [verification, setVerification] = useState<VerificationData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setUser(data.data.user);
          setVerification(data.data.verification);
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await fetch("/api/user", { method: "DELETE" });
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-bitcoin animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isExpired =
    verification && new Date(verification.expiresAt) < new Date();
  const daysUntilExpiry = verification
    ? Math.max(
        0,
        Math.ceil(
          (new Date(verification.expiresAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center">
            <User className="w-6 h-6 text-accent-purple" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-secondary">Manage your account and verification</p>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-2xl font-bold">
            {user.xDisplayName[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.xDisplayName}</h2>
            <a
              href={`https://x.com/${user.xUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-bitcoin transition-colors inline-flex items-center gap-1"
            >
              @{user.xUsername}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Verification status */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-bitcoin" />
            <h3 className="text-lg font-bold">Verification Status</h3>
          </div>
          <button
            onClick={() => router.push("/verify")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-bitcoin/10 text-bitcoin hover:bg-bitcoin/20 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {verification ? "Re-verify" : "Verify Now"}
          </button>
        </div>

        {verification && !isExpired ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0a0a0f] rounded-xl p-6 border border-border">
              <div>
                <p className="text-sm text-secondary mb-2">Verified Balance</p>
                <BitcoinAmount btc={verification.totalBtc} size="lg" />
              </div>
              <TierBadge tier={verification.tier} size="md" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0a0a0f] rounded-xl p-4 border border-border">
                <p className="text-xs text-muted mb-1">Verified On</p>
                <p className="font-medium text-sm">
                  {new Date(verification.verifiedAt).toLocaleDateString(
                    undefined,
                    { year: "numeric", month: "long", day: "numeric" }
                  )}
                </p>
              </div>
              <div className="bg-[#0a0a0f] rounded-xl p-4 border border-border">
                <p className="text-xs text-muted mb-1">Expires</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-secondary" />
                  <p className="font-medium text-sm">
                    {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""}{" "}
                    remaining
                  </p>
                </div>
              </div>
            </div>

            {daysUntilExpiry <= 7 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-medium text-sm">
                    Verification expiring soon
                  </p>
                  <p className="text-amber-400/70 text-xs mt-1">
                    Re-verify your holdings to maintain your leaderboard
                    position.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto mb-3 text-muted" />
            <p className="text-secondary font-medium mb-1">
              {isExpired ? "Verification Expired" : "Not Yet Verified"}
            </p>
            <p className="text-muted text-sm">
              {isExpired
                ? "Your previous verification has expired. Re-verify to restore your leaderboard position."
                : "Verify your Bitcoin holdings to appear on the leaderboard."}
            </p>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-red-500/20 rounded-2xl p-8">
        <h3 className="text-lg font-bold text-red-400 mb-2">Danger Zone</h3>
        <p className="text-secondary text-sm mb-6">
          Permanently delete your account and all associated verification data.
          This action cannot be undone.
        </p>

        {deleteConfirm ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-all"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Yes, Delete My Account
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="px-6 py-3 rounded-xl font-medium bg-card border border-border text-secondary hover:text-foreground transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        )}
      </div>
    </div>
  );
}
