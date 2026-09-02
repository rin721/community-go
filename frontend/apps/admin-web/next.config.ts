import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Playwright 的 dev server 使用独立目录，避免 production build 覆盖正在运行的开发缓存。
  distDir: process.env.NEXT_DIST_DIR ?? 'dist',
  output: 'export',
  transpilePackages: [
    '@community-go/core',
    '@community-go/design-system',
    '@community-go/admin-foundation',
    '@community-go/admin-framework',
    '@community-go/admin-surface',
    '@community-go/form-foundation',
    '@community-go/i18n',
    '@community-go/types',
    '@community-go/ui-adapter',
  ],
};

export default nextConfig;
