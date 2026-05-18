import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin", "thai"],
  display: "swap"
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono"
});

export const metadata: Metadata = {
  title: "Sales CRM Dashboard",
  description: "Modern CRM for tracking sales and quotations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${ibmPlexSansThai.className} ${ibmPlexMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
