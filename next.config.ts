
import type {NextConfig} from 'next';

const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:9002',
  'http://127.0.0.1:9002',
].filter((origin): origin is string => Boolean(origin));

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Genkit's OpenTelemetry SDK supports Jaeger optionally. This product does
      // not enable that exporter, so keep the abandoned package out of the
      // production bundle instead of installing it only to satisfy resolution.
      config.resolve.alias['@opentelemetry/exporter-jaeger'] = false;
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
