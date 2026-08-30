import {
  AlertDialog,
  Button as HeroButton,
  Dropdown,
  Input,
  Label,
  ListBox,
  Modal,
  Popover,
  Tooltip,
  Drawer,
  SearchField,
} from '@heroui/react';
import { useMemo, useState, type ReactNode } from 'react';

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

export type PopoverCardProps = Readonly<{
  triggerLabel: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}>;

export function PopoverCard({
  triggerLabel,
  title,
  children,
  defaultOpen = false,
}: PopoverCardProps) {
  return (
    <Popover defaultOpen={defaultOpen}>
      <Popover.Trigger className="ui-overlay-trigger">{triggerLabel}</Popover.Trigger>
      <Popover.Content className="ui-overlay-surface max-w-sm" placement="bottom start">
        <Popover.Arrow className="fill-surface-raised stroke-border" />
        <Popover.Dialog className="p-4">
          <Popover.Heading className="text-sm font-bold text-ink">{title}</Popover.Heading>
          <div className="mt-2 text-sm leading-6 text-ink-muted">{children}</div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export type TooltipActionProps = Readonly<{
  label: string;
  tooltip: string;
  defaultOpen?: boolean;
}>;

export function TooltipAction({ label, tooltip, defaultOpen = false }: TooltipActionProps) {
  return (
    <Tooltip defaultOpen={defaultOpen} delay={100}>
      <Tooltip.Trigger className="ui-overlay-trigger">{label}</Tooltip.Trigger>
      <Tooltip.Content
        className="rounded-control border border-border bg-ink px-3 py-2 text-xs font-medium text-surface shadow-overlay"
        placement="top"
        showArrow
      >
        {tooltip}
      </Tooltip.Content>
    </Tooltip>
  );
}

export type DialogSurfaceProps = Readonly<{
  triggerLabel: string;
  title: string;
  description: string;
  children: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  defaultOpen?: boolean;
  confirmDisabled?: boolean;
  failureMessage?: string;
  onConfirm: () => void | Promise<void>;
}>;

export function DialogSurface({
  triggerLabel,
  title,
  description,
  children,
  cancelLabel,
  confirmLabel,
  defaultOpen = false,
  confirmDisabled = false,
  failureMessage,
  onConfirm,
}: DialogSurfaceProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const confirm = async () => {
    setPending(true);
    setFailed(false);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal isOpen={open} onOpenChange={setOpen}>
      <HeroButton className="ui-overlay-trigger" onPress={() => setOpen(true)}>
        {triggerLabel}
      </HeroButton>
      <Modal.Backdrop className="bg-scrim backdrop-blur-sm">
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog className="ui-overlay-surface w-full">
            <Modal.Header className="border-b border-border px-6 py-5">
              <Modal.Heading className="text-lg font-bold text-ink">{title}</Modal.Heading>
              <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
            </Modal.Header>
            <Modal.Body className="px-6 py-5">{children}</Modal.Body>
            {failed && failureMessage ? (
              <p className="px-6 pb-4 text-sm font-medium text-danger" role="alert">
                {failureMessage}
              </p>
            ) : null}
            <Modal.Footer className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <Modal.CloseTrigger
                aria-label={cancelLabel}
                className="static inline-flex h-10 w-auto min-w-20 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-semibold leading-none text-ink shadow-sm hover:bg-surface-muted"
                isDisabled={pending}
              >
                {cancelLabel}
              </Modal.CloseTrigger>
              <HeroButton
                className="inline-flex h-10 items-center justify-center rounded-control bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                isDisabled={confirmDisabled || pending}
                isPending={pending}
                onPress={() => void confirm()}
              >
                {confirmLabel}
              </HeroButton>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export type ConfirmDialogProps = Readonly<{
  triggerLabel: string;
  title: string;
  description: string;
  impact: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  failureMessage: string;
  tone?: 'primary' | 'danger';
  defaultOpen?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
}>;

export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  impact,
  cancelLabel,
  confirmLabel,
  failureMessage,
  tone = 'primary',
  defaultOpen = false,
  confirmDisabled = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const confirm = async () => {
    setPending(true);
    setFailed(false);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog isOpen={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger className="ui-overlay-trigger">{triggerLabel}</AlertDialog.Trigger>
      <AlertDialog.Backdrop className="bg-scrim backdrop-blur-sm">
        <AlertDialog.Container placement="center" size="md">
          <AlertDialog.Dialog className="ui-overlay-surface w-full">
            <AlertDialog.Header className="px-6 pt-6">
              <AlertDialog.Icon status={tone === 'danger' ? 'danger' : 'accent'} />
              <AlertDialog.Heading className="mt-4 text-lg font-bold text-ink">
                {title}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="px-6 py-4 text-sm leading-6 text-ink-muted">
              <p>{description}</p>
              <div className="mt-3 rounded-control bg-surface-muted p-3 text-ink">{impact}</div>
              {failed ? (
                <p className="mt-3 font-medium text-danger" role="alert">
                  {failureMessage}
                </p>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <AlertDialog.CloseTrigger
                aria-label={cancelLabel}
                className="static inline-flex h-10 w-auto min-w-20 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-semibold leading-none text-ink shadow-sm hover:bg-surface-muted"
                isDisabled={pending}
              >
                {cancelLabel}
              </AlertDialog.CloseTrigger>
              <HeroButton
                className={`inline-flex h-10 items-center justify-center rounded-control px-4 text-sm font-semibold ${tone === 'danger' ? 'bg-danger text-on-danger hover:bg-danger/90' : 'bg-brand text-on-brand hover:bg-brand-strong'}`}
                isDisabled={confirmDisabled || pending}
                isPending={pending}
                onPress={() => void confirm()}
              >
                {confirmLabel}
              </HeroButton>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

export type DestructiveConfirmDialogProps = Omit<ConfirmDialogProps, 'tone'>;

export function DestructiveConfirmDialog(props: DestructiveConfirmDialogProps) {
  return <ConfirmDialog {...props} tone="danger" />;
}

export type DrawerSurfaceProps = Readonly<{
  triggerLabel: string;
  title: string;
  description: string;
  children: ReactNode;
  closeLabel: string;
  defaultOpen?: boolean;
}>;

export function DrawerSurface({
  triggerLabel,
  title,
  description,
  children,
  closeLabel,
  defaultOpen = false,
}: DrawerSurfaceProps) {
  return (
    <Drawer defaultOpen={defaultOpen}>
      <HeroButton className="ui-overlay-trigger">{triggerLabel}</HeroButton>
      <Drawer.Backdrop className="bg-scrim backdrop-blur-sm">
        <Drawer.Content placement="right">
          <Drawer.Dialog className="ui-overlay-surface relative h-full w-full max-w-lg rounded-none">
            <Drawer.Header className="border-b border-border px-6 py-5 pr-20">
              <Drawer.Heading className="text-lg font-bold text-ink">{title}</Drawer.Heading>
              <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
              <Drawer.CloseTrigger
                aria-label={closeLabel}
                className="absolute right-5 top-5 grid size-10 place-items-center rounded-control border border-border bg-surface text-xl leading-none text-ink shadow-sm hover:bg-surface-muted"
              >
                <span aria-hidden="true">×</span>
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body className="px-6 py-5">{children}</Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

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
              <SearchField
                aria-label={searchLabel}
                className="border-b border-border p-3"
                value={query}
                onChange={setQuery}
              >
                <SearchField.Group className="flex min-h-11 items-center gap-2 rounded-control bg-surface-muted px-3.5 data-[focus-within]:ring-2 data-[focus-within]:ring-brand">
                  <SearchField.SearchIcon className="size-4 text-ink-muted" />
                  <Input
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
                    placeholder={searchPlaceholder}
                  />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
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
