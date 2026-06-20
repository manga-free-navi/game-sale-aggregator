import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/game-sale-aggregator',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
