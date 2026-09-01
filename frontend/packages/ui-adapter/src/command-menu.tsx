import { Button as HeroButton } from '@heroui/react/button';
import { Label } from '@heroui/react/label';
import { ListBox } from '@heroui/react/list-box';
import { Modal } from '@heroui/react/modal';
import { useMemo, useState } from 'react';

import { SearchBox } from './search-box';

export type CommandItem = Readonly<{
  id: string;
  label: string;
  description: string;
  keywords?: readonly string[];
}>;

export type CommandMenuProps = Readonly<{
  triggerLabel: string;
  title: string;
  searchLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  items: readonly CommandItem[];
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAction: (id: string) => void;
}>;

export function CommandMenu({
  triggerLabel,
  title,
  searchLabel,
  searchPlaceholder,
  emptyLabel,
  items,
  defaultOpen = false,
  isOpen,
  onOpenChange,
  onAction,
}: CommandMenuProps) {
  const [query, setQuery] = useState('');
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      [item.label, item.description, ...(item.keywords ?? [])].some((value) =>
        value.toLocaleLowerCase().includes(normalized),
      ),
    );
  }, [items, query]);

  return (
    <Modal
      defaultOpen={defaultOpen}
      {...(isOpen !== undefined ? { isOpen } : {})}
      {...(onOpenChange ? { onOpenChange } : {})}
    >
      <HeroButton className="ui-overlay-trigger">{triggerLabel}</HeroButton>
      <Modal.Backdrop className="bg-scrim backdrop-blur-sm">
        <Modal.Container placement="top" size="lg">
          <Modal.Dialog className="ui-overlay-surface mt-16 w-full overflow-hidden">
            <Modal.Heading className="border-b border-border px-5 py-4 text-base font-bold text-ink">
              {title}
            </Modal.Heading>
            <Modal.Body className="p-0">
              <div className="border-b border-border p-3">
                <SearchBox
                  label={searchLabel}
                  placeholder={searchPlaceholder}
                  value={query}
                  onValueChange={setQuery}
                />
              </div>
              {visibleItems.length > 0 ? (
                <ListBox
                  aria-label={title}
                  className="max-h-80 overflow-auto p-2 outline-none"
                  onAction={(key) => onAction(String(key))}
                >
                  {visibleItems.map((item) => (
                    <ListBox.Item
                      className="ui-option"
                      id={item.id}
                      key={item.id}
                      textValue={item.label}
                    >
                      <span className="min-w-0">
                        <Label className="block font-semibold text-ink">{item.label}</Label>
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">
                          {item.description}
                        </span>
                      </span>
                    </ListBox.Item>
                  ))}
                </ListBox>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-ink-muted">{emptyLabel}</p>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
