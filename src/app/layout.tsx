import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "BOX Score | Tournament Grade Scoreboard Platform",
  description: "Dual-Screen Decoupled Digital Scoreboard Engine for Tournament Execution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="boxScoreDark">
      <body className="antialiased min-h-screen bg-base-100 text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
