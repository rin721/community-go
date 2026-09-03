/**
 * Admin Surface —— 受控语义 Icon 呈现组件（只导出组件，满足 Fast Refresh）。
 *
 * 消费方只认识 semantic iconId，不接触具体图标库；iconId → Icon Component
 * 唯一映射在 `./navigation-icon-components`（经 @community-go/admin-surface/
 * icon-components 暴露给 Shell resolver）。
 */

'use client';

import type { ComponentType } from 'react';

import { resolveIconComponent } from './navigation-icon-components';
import type { AdminNavigationIconId } from './navigation-icon';

/** 受控语义 Icon 呈现组件：消费方只认识 iconId，不接触具体图标库。 */
export function AdminNavigationIcon({
  iconId,
  size = 'size-4',
  className,
  strokeWidth,
}: Readonly<{
  iconId: AdminNavigationIconId;
  size?: string;
  className?: string;
  strokeWidth?: number;
}>) {
  const Icon = resolveIconComponent(iconId) as ComponentType<{
    className?: string;
    'aria-hidden'?: boolean;
    strokeWidth?: number;
  }>;
  return (
    <Icon
      className={className ?? size}
      aria-hidden={true}
      {...(strokeWidth !== undefined ? { strokeWidth } : {})}
    />
  );
}
