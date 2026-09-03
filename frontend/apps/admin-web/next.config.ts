import type { NextConfig } from 'next';

/**
 * Host Deployment Mode（三档递增，属 Host 构建/部署配置，不属于 Plugin Contract）：
 * - static：output:"export"，只允许构建期确定的静态 URL；
 * - static-enumerated：仍 output:"export"，动态 page 靠 Next 原生 generateStaticParams 枚举；
 * - server：真实 Next Runtime Server（不设 output:"export"），动态/request-time 按 Next 原生开放。
 * 缺省 = static（与历史行为一致）。配置来自 apps/admin-web/.env（Next 原生加载）。
 * 兼容旧布尔键 ADMIN_SURFACE_DYNAMIC_ROUTES=true → static-enumerated。
 */
function resolveDeploymentMode(): 'static' | 'static-enumerated' | 'server' {
  const raw = process.env.ADMIN_HOST_DEPLOYMENT_MODE ?? '';
  if (raw === 'static-enumerated' || raw === 'server' || raw === 'static') return raw;
  if (process.env.ADMIN_SURFACE_DYNAMIC_ROUTES === 'true') return 'static-enumerated';
  return 'static';
}

const deploymentMode = resolveDeploymentMode();

const nextConfig: NextConfig = {
  // Playwright 的 dev server 使用独立目录，避免 production build 覆盖正在运行的开发缓存。
  distDir: process.env.NEXT_DIST_DIR ?? 'dist',
  // server Mode 不设 output（真实 Next Runtime Server）；static / static-enumerated 用静态导出。
  ...(deploymentMode === 'server' ? {} : { output: 'export' as const }),
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
