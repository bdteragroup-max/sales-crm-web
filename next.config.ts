import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/bd/tickets/tv',
        destination: '/tv-views/bd-tickets',
      },
    ]
  },
};

export default nextConfig;
