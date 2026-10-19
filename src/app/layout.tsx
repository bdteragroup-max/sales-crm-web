import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Sales CRM Dashboard",
  description: "Modern CRM for tracking sales and quotations",
  manifest: "/manifest.json",
  icons: {
    icon: "/app-icon.jpg",
    apple: "/app-icon.jpg",
    shortcut: "/app-icon.jpg",
  },
};

import { GlobalProgressBar } from "./components/GlobalProgressBar";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${inter.variable} ${inter.className} antialiased`}>
        <Suspense fallback={null}>
          <GlobalProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
