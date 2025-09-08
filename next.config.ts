import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Don’t fail the Vercel build on ESLint errors
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Optional: you can keep using <img> without Next/Image
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

