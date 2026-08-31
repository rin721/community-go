import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: 'dist',
  output: 'export',
  transpilePackages: [
    '@community-go/core',
    '@community-go/design-system',
    '@community-go/reference',
    '@community-go/schemas',
    '@community-go/types',
    '@community-go/ui-adapter',
  ],
};

export default nextConfig;
