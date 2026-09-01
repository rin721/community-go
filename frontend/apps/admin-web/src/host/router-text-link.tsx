'use client';

import { TextLink, type TextLinkProps } from '@community-go/ui-adapter/navigation';
import { useRouter } from 'next/navigation';

import { beginNavigation } from './navigation-progress';
import { markForwardRouteIntent, pageTransitionTypes } from './route-transition-constants';

type RouterTextLinkProps = Omit<TextLinkProps, 'onNavigate'>;

export function RouterTextLink({ href, ...props }: RouterTextLinkProps) {
  const router = useRouter();
  return (
    <TextLink
      {...props}
      href={href}
      onNavigate={() => {
        markForwardRouteIntent();
        beginNavigation();
        void router.push(href, { transitionTypes: [pageTransitionTypes.forward] });
      }}
    />
  );
}
