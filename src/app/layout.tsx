import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0f",
};

export const metadata: Metadata = {
  title: "SatStack - Bitcoin Leaderboard",
  description:
    "Prove your Bitcoin holdings on-chain with PSBT verification. Compete on the leaderboard. Flex your stack.",
  openGraph: {
    title: "SatStack - Prove Your Bitcoin Stack",
    description:
      "The Bitcoin leaderboard where holdings are cryptographically verified on-chain. Don't trust. Verify.",
    siteName: "SatStack",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SatStack - Prove Your Bitcoin Stack",
    description:
      "Cryptographically verify your BTC holdings and compete on the leaderboard. No trust required.",
  },
  keywords: [
    "bitcoin",
    "leaderboard",
    "proof of reserves",
    "PSBT",
    "BIP 127",
    "whale",
    "UTXO",
    "verification",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-background text-foreground min-h-screen">
        <Navbar />
        <main className="min-h-[calc(100vh-72px)]">{children}</main>
      </body>
    </html>
  );
}
