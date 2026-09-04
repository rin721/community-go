'use client';

import { TextLink, type TextLinkProps } from '@community-go/ui-adapter/navigation';
import { useRouter } from 'next/navigation';

import { shouldProceedWithNavigation } from './navigation-lifecycle';
import { markForwardRouteIntent, pageTransitionTypes } from './route-transition-constants';

type RouterTextLinkProps = Omit<TextLinkProps, 'onNavigate'>;

export function RouterTextLink({ href, ...props }: RouterTextLinkProps) {
  const router = useRouter();
  return (
    <TextLink
      {...props}
      href={href}
      onNavigate={() => {
        // no-op 短路：同 resolved target 不导航、不启动 Progress。
        if (!shouldProceedWithNavigation(href)) return;
        markForwardRouteIntent();
        void router.push(href, { transitionTypes: [pageTransitionTypes.forward] });
      }}
    />
  );
}
