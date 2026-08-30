import { TextLink, type TextLinkProps } from '@community-go/ui-adapter';
import { useNavigate } from 'react-router';

type RouterTextLinkProps = Omit<TextLinkProps, 'onNavigate'>;

export function RouterTextLink({ href, ...props }: RouterTextLinkProps) {
  const navigate = useNavigate();
  return <TextLink {...props} href={href} onNavigate={() => void navigate(href)} />;
}
