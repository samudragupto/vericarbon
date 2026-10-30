import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeriCarbon — Zero-Knowledge Verifiable MRV",
  description:
    "Research prototype for zero-knowledge verifiable MRV and cross-registry nullifiers in carbon credit markets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

