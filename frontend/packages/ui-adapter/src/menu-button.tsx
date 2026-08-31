import { Dropdown } from '@heroui/react/dropdown';
import { Label } from '@heroui/react/label';
import type { ReactNode } from 'react';

export type MenuAction = Readonly<{
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}>;

export type MenuButtonProps = Readonly<{
  label: ReactNode;
  ariaLabel: string;
  items: readonly MenuAction[];
  defaultOpen?: boolean;
  onAction: (id: string) => void;
}>;

export function MenuButton({
  label,
  ariaLabel,
  items,
  defaultOpen = false,
  onAction,
}: MenuButtonProps) {
  return (
    <Dropdown defaultOpen={defaultOpen}>
      <Dropdown.Trigger className="ui-overlay-trigger">{label}</Dropdown.Trigger>
      <Dropdown.Popover className="ui-overlay-surface min-w-60 p-1.5" placement="bottom end">
        <Dropdown.Menu
          aria-label={ariaLabel}
          disabledKeys={items.filter((item) => item.disabled).map((item) => item.id)}
          onAction={(key) => onAction(String(key))}
        >
          {items.map((item) => (
            <Dropdown.Item
              className={`ui-option ${item.tone === 'danger' ? 'text-danger data-[focused]:bg-danger-soft' : 'text-ink'}`}
              id={item.id}
              key={item.id}
              textValue={item.label}
            >
              {item.icon ? <span className="text-ink-muted">{item.icon}</span> : null}
              <span className="min-w-0 flex-1">
                <Label className="block truncate font-medium">{item.label}</Label>
                {item.description ? (
                  <span className="mt-0.5 block text-xs text-ink-muted">{item.description}</span>
                ) : null}
              </span>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
