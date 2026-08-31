import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: 'dist',
  output: 'export',
  transpilePackages: [
    '@community-go/core',
    '@community-go/design-system',
    '@community-go/admin-foundation',
    '@community-go/form-foundation',
    '@community-go/i18n',
    '@community-go/types',
    '@community-go/ui-adapter',
  ],
};

export default nextConfig;
