import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
