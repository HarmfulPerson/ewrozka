/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone mode: Next.js generuje minimalny bundle z własnym serwerem node
  output: 'standalone',
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
