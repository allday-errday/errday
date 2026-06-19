import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Errday",
  description: "All day. Errday.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Errday",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#8b82f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className={manrope.variable} lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
