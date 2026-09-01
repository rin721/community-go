'use client';

import type {} from 'react/canary';
import { ViewTransition, type ReactNode } from 'react';

export type ContentSwapTransitionProps = Readonly<{
  contentKey: string;
  children: ReactNode;
}>;

/** ContentSwapTransition 主持同一路由内容域的替换，不承担数据请求状态。 */
export function ContentSwapTransition({ contentKey, children }: ContentSwapTransitionProps) {
  return (
    <ViewTransition
      key={contentKey}
      default="none"
      enter="content-swap"
      exit="content-swap"
      update="content-swap"
    >
      {children}
    </ViewTransition>
  );
}
