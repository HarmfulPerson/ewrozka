/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Cache static assets aggressively (CDN will respect these headers)
  headers: async () => [
    {
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/images/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
      ],
    },
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'api.ewrozka.online',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'api-staging.ewrozka.online',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
