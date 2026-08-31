'use client';

import { CommandMenu } from '@community-go/ui-adapter/command-menu';
import { SwitchField, TextField } from '@community-go/ui-adapter/form-field';
import { MenuButton } from '@community-go/ui-adapter/menu-button';
import {
  ConfirmDialog,
  DestructiveConfirmDialog,
  DialogSurface,
  DrawerSurface,
  PopoverCard,
  TooltipAction,
} from '@community-go/ui-adapter/overlays';
import { Archive, Copy, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFrontendTranslation } from '@community-go/i18n';
import { AdminSection } from '@community-go/admin-foundation/layout';
import { usePageSearchParams } from '../../host/use-page-search-params';
import { ComponentPreview } from './component-preview';
import { UiElementsFamilyPage } from './family-page';
export function OverlayElementsPage() {
  const { t } = useFrontendTranslation();
  const searchParams = usePageSearchParams();
  const overlay = searchParams.get('overlay');
  const [checked, setChecked] = useState(true);
  const [lastAction, setLastAction] = useState<string>();
  return (
    <UiElementsFamilyPage
      familyId="overlays"
      title={t('uiElements.overlaysTitle')}
      description={t('uiElements.overlaysDescription')}
    >
      {({ description }) => (
        <>
          <AdminSection
            id="overlays"
            title={t('uiElements.overlaysTitle')}
            description={t('uiElements.overlaysDescription')}
          >
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <ComponentPreview
                name="MenuButton"
                description={t('uiElements.catalog.menuDescription')}
                states={['Default', 'Icon', 'Description', 'Disabled', 'Danger', 'Keyboard']}
              >
                <MenuButton
                  ariaLabel={t('uiElements.menuLabel')}
                  label={t('uiElements.menu')}
                  defaultOpen={overlay === 'menu'}
                  onAction={(id) => setLastAction(id)}
                  items={[
                    {
                      id: 'edit',
                      label: t('uiElements.menuEdit'),
                      icon: <Pencil className="size-4" />,
                    },
                    {
                      id: 'copy',
                      label: t('uiElements.menuCopy'),
                      icon: <Copy className="size-4" />,
                    },
                    {
                      id: 'archive',
                      label: t('uiElements.menuArchive'),
                      icon: <Archive className="size-4" />,
                      disabled: true,
                    },
                    {
                      id: 'delete',
                      label: t('uiElements.menuDelete'),
                      icon: <Trash2 className="size-4" />,
                      tone: 'danger',
                    },
                  ]}
                />
              </ComponentPreview>
              <ComponentPreview
                name="PopoverCard"
                description={t('uiElements.catalog.popoverDescription')}
                states={['Trigger', 'Heading', 'Long content', 'Focus return', 'Collision']}
              >
                <PopoverCard
                  triggerLabel={t('uiElements.popover')}
                  title={t('uiElements.popoverTitle')}
                  defaultOpen={overlay === 'popover'}
                >
                  {description}
                </PopoverCard>
              </ComponentPreview>
              <ComponentPreview
                name="TooltipAction"
                description={t('uiElements.catalog.tooltipDescription')}
                states={['Hover', 'Focus', 'Delay', 'Escape', 'Non-interactive content']}
              >
                <TooltipAction
                  label={t('uiElements.tooltip')}
                  tooltip={t('uiElements.tooltipContent')}
                  defaultOpen={overlay === 'tooltip'}
                />
              </ComponentPreview>
              <ComponentPreview
                name="DialogSurface"
                description={t('uiElements.catalog.dialogDescription')}
                states={['Form content', 'Cancel', 'Confirm', 'Pending', 'Failure', 'Focus trap']}
              >
                <DialogSurface
                  triggerLabel={t('uiElements.dialog')}
                  title={t('uiElements.dialogTitle')}
                  description={t('uiElements.dialogDescription')}
                  cancelLabel={t('reference.cancel')}
                  confirmLabel={t('reference.confirm')}
                  defaultOpen={overlay === 'dialog'}
                  onConfirm={() => setLastAction(t('reference.confirm'))}
                >
                  <TextField label={t('uiElements.dialogField')} defaultValue="Community" />
                </DialogSurface>
              </ComponentPreview>
              <ComponentPreview
                name="ConfirmDialog"
                description={t('uiElements.catalog.confirmDescription')}
                states={['Impact', 'Cancel', 'Confirm', 'Disabled', 'Pending', 'Failure']}
              >
                <ConfirmDialog
                  cancelLabel={t('reference.cancel')}
                  confirmLabel={t('reference.confirm')}
                  description={t('uiElements.catalog.confirmPrompt')}
                  failureMessage={t('uiElements.confirmFailure')}
                  impact={t('uiElements.catalog.confirmImpact')}
                  title={t('uiElements.catalog.confirmTitle')}
                  triggerLabel={t('uiElements.catalog.confirmTrigger')}
                  defaultOpen={overlay === 'confirm-primary'}
                  onConfirm={() => setLastAction(t('reference.confirm'))}
                />
              </ComponentPreview>
              <ComponentPreview
                name="DestructiveConfirmDialog"
                description={t('uiElements.catalog.destructiveConfirmDescription')}
                states={['Danger tone', 'Impact', 'Pending', 'Failure', 'Focus restore']}
              >
                <DestructiveConfirmDialog
                  cancelLabel={t('reference.cancel')}
                  confirmLabel={t('uiElements.destructiveAction')}
                  description={t('uiElements.destructiveDescription')}
                  failureMessage={t('uiElements.confirmFailure')}
                  impact={t('uiElements.destructiveImpact')}
                  title={t('uiElements.destructiveTitle')}
                  triggerLabel={t('uiElements.destructiveConfirm')}
                  defaultOpen={overlay === 'confirm'}
                  onConfirm={() => setLastAction(t('uiElements.destructiveAction'))}
                />
              </ComponentPreview>
              <ComponentPreview
                name="DrawerSurface"
                description={t('uiElements.catalog.drawerDescription')}
                states={['Right sheet', 'Header / body', 'Close', 'Scroll', 'Narrow viewport']}
              >
                <DrawerSurface
                  triggerLabel={t('uiElements.drawer')}
                  title={t('uiElements.drawerTitle')}
                  description={t('uiElements.drawerDescription')}
                  closeLabel={t('reference.close')}
                  defaultOpen={overlay === 'drawer'}
                >
                  <div className="space-y-4">
                    <TextField
                      label={t('uiElements.drawerField')}
                      defaultValue="Reference surface"
                    />
                    <SwitchField
                      label={t('uiElements.drawerSwitch')}
                      description={t('uiElements.drawerSwitchDescription')}
                      checked={checked}
                      onCheckedChange={setChecked}
                    />
                  </div>
                </DrawerSurface>
              </ComponentPreview>
              <ComponentPreview
                name="CommandMenu"
                description={t('uiElements.catalog.commandDescription')}
                states={['Search', 'Filtered', 'Empty', 'Keyboard action', 'Modal focus']}
              >
                <CommandMenu
                  triggerLabel={t('uiElements.command')}
                  title={t('uiElements.commandTitle')}
                  searchLabel={t('uiElements.commandSearchLabel')}
                  searchPlaceholder={t('uiElements.commandSearchPlaceholder')}
                  emptyLabel={t('uiElements.commandEmpty')}
                  defaultOpen={overlay === 'command'}
                  onAction={(id) => setLastAction(id)}
                  items={[
                    {
                      id: 'workspace',
                      label: t('nav.reference'),
                      description: t('reference.description'),
                    },
                    {
                      id: 'form',
                      label: t('nav.formReference'),
                      description: t('formReference.description'),
                    },
                    {
                      id: 'states',
                      label: t('nav.states'),
                      description: t('states.description'),
                    },
                  ]}
                />
              </ComponentPreview>
            </div>
            {lastAction ? (
              <p className="border-t border-border px-5 py-3 text-sm text-ink-muted" role="status">
                {lastAction}
              </p>
            ) : null}
          </AdminSection>
        </>
      )}
    </UiElementsFamilyPage>
  );
}
