import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true, // Ignore ESLint errors during build
  },
  typescript: {
    ignoreBuildErrors: true, // Ignore TypeScript errors during build
  },
  webpack: (config, { isServer }) => {
    // Disable webpack's cache to prevent memory issues
    config.cache = false;
    
    // Important: return the modified config
    return config;
  },
  productionBrowserSourceMaps: false, // Disable source maps in production to reduce memory usage
  reactStrictMode: false, // Disable React Strict Mode for now to prevent double rendering
  images: {
    unoptimized: true, // Disable image optimization if not needed
  },
};

export default nextConfig;