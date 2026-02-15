import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SatStack - Bitcoin Leaderboard",
  description:
    "Prove your Bitcoin holdings on-chain with PSBT verification. Compete on the leaderboard. Flex your stack.",
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
