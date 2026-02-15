"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Trophy, User, Upload, LogOut, Menu, X, Bitcoin } from "lucide-react";

interface UserData {
  id: string;
  xUsername: string;
  xDisplayName: string;
  xProfileImage: string;
}

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setUser(data.data.user);
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  const handleDemoLogin = async () => {
    const res = await fetch("/api/auth/demo", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      window.location.href = "/profile";
    }
  };

  const navLinks = [
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ...(user
      ? [
          { href: "/verify", label: "Verify", icon: Upload },
          { href: "/profile", label: "Profile", icon: User },
        ]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bitcoin to-amber-600 flex items-center justify-center btc-glow">
                <Bitcoin className="w-6 h-6 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent">
              SatStack
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-bitcoin/15 text-bitcoin"
                      : "text-secondary hover:text-foreground hover:bg-card"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Auth section */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-xs font-bold">
                    {user.xDisplayName[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">@{user.xUsername}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-secondary hover:text-foreground hover:bg-card transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDemoLogin}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:text-foreground bg-card hover:bg-card-hover border border-border transition-all duration-200"
                >
                  Demo Login
                </button>
                <Link
                  href="/api/auth/x"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-bitcoin to-amber-600 text-white hover:shadow-lg hover:shadow-bitcoin/25 transition-all duration-200"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Sign in with X
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-secondary hover:text-foreground hover:bg-card"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-[#0a0a0f]/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-secondary hover:text-foreground hover:bg-card transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-border">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-secondary hover:text-foreground hover:bg-card transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign out
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleDemoLogin}
                    className="w-full px-4 py-3 rounded-lg text-sm font-medium text-secondary bg-card border border-border"
                  >
                    Demo Login
                  </button>
                  <Link
                    href="/api/auth/x"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-bitcoin to-amber-600 text-white"
                  >
                    Sign in with X
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
