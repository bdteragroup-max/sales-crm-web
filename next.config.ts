import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'tesseract.js', 'sharp'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/@sparticuz/chromium/**/*'],
    '/api/scan-document/**/*': [
      './node_modules/tesseract.js/**/*',
      './node_modules/tesseract.js-core/**/*',
      './eng.traineddata',
      './tha.traineddata',
    ],
  },
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
