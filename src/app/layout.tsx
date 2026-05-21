import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const prompt = Prompt({ 
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ["latin", "thai"],
  display: "swap",
  variable: "--font-prompt"
});

export const metadata: Metadata = {
  title: "Sales CRM Dashboard",
  description: "Modern CRM for tracking sales and quotations",
};

import { GlobalProgressBar } from "./components/GlobalProgressBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${prompt.variable} ${prompt.className} antialiased`}>
        <GlobalProgressBar />
        {children}
      </body>
    </html>
  );
}
