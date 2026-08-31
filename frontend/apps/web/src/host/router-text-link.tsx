'use client';

import { TextLink, type TextLinkProps } from '@community-go/ui-adapter/navigation';
import { useRouter } from 'next/navigation';

type RouterTextLinkProps = Omit<TextLinkProps, 'onNavigate'>;

export function RouterTextLink({ href, ...props }: RouterTextLinkProps) {
  const router = useRouter();
  return <TextLink {...props} href={href} onNavigate={() => void router.push(href)} />;
}
