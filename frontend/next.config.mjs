/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  experimental: {
    webpackBuildWorker: false,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.cache = false;
    }
    // Disable source maps in production to avoid JSON parsing errors
    config.devtool = false;
    // Disable module concatenation to avoid JSON parsing errors in ConcatenationScope
    config.optimization.concatenateModules = false;
    return config;
  },
};

export default nextConfig;
