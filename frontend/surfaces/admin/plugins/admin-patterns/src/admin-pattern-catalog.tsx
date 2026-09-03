'use client';

import { AdminBulkActionBar, AdminCollection } from '@community-go/admin-foundation/collection';
import {
  AdminEntitySummary,
  AdminSettingsLayout,
  AdminTimeline,
} from '@community-go/admin-foundation/detail-settings';
import { AdminFormActions, AdminFormStatus } from '@community-go/admin-foundation/form-actions';
import {
  AdminFilterBar,
  AdminPage,
  AdminPageHeader,
  AdminSection,
  AdminToolbar,
} from '@community-go/admin-foundation/layout';
import {
  AdminOperationStatus,
  AdminStateRegion,
} from '@community-go/admin-foundation/states-operations';
import { Action } from '@community-go/ui-adapter/action';
import { FormErrorSummary } from '@community-go/ui-adapter/form-error-summary';
import { Panel } from '@community-go/ui-adapter/panel';
import { StepNavigation } from '@community-go/ui-adapter/step-navigation';
import { StateSurface } from '@community-go/ui-adapter/state-surface';
import { CheckCircle2 } from 'lucide-react';

export type AdminPatternKind =
  | 'layout-navigation'
  | 'collections-data'
  | 'forms-actions'
  | 'states-feedback'
  | 'detail-settings';

export function AdminPatternCatalog({ kind }: Readonly<{ kind: AdminPatternKind }>) {
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin Foundation"
        title={kind}
        description="Stable Admin Product-Surface composition; no API, permission engine, or backend state machine is involved."
      />
      {kind === 'layout-navigation' ? (
        <AdminSection title="Layout and navigation">
          <div className="grid gap-5 p-5">
            <AdminToolbar
              label="Page toolbar"
              primary={<Action onPress={() => undefined}>Primary</Action>}
              secondary={
                <Action variant="quiet" onPress={() => undefined}>
                  Secondary
                </Action>
              }
            />
            <StepNavigation
              label="Workflow steps"
              items={[
                { id: 'one', label: 'Context', state: 'complete' },
                { id: 'two', label: 'Configure', state: 'current' },
                { id: 'three', label: 'Review' },
              ]}
            />
          </div>
        </AdminSection>
      ) : kind === 'collections-data' ? (
        <div className="space-y-4">
          <AdminCollection
            title="Collection pattern"
            filters={
              <AdminFilterBar>
                <span>Filter slot</span>
                <span>Sort slot</span>
              </AdminFilterBar>
            }
            content={
              <div className="p-5 text-sm text-ink-muted">
                Desktop table or narrow-screen replacement content slot.
              </div>
            }
          />
          <AdminBulkActionBar
            actions={
              <Action size="sm" onPress={() => undefined}>
                Archive
              </Action>
            }
            clearLabel="Clear"
            onClear={() => undefined}
            selectionLabel="3 selected"
          />
        </div>
      ) : kind === 'forms-actions' ? (
        <div className="space-y-5">
          <FormErrorSummary
            title="Please fix 2 fields"
            errors={[
              { fieldId: 'name', label: 'Name', message: 'Required' },
              { fieldId: 'owner', label: 'Owner', message: 'Unavailable' },
            ]}
          />
          <AdminFormActions
            primary={<Action onPress={() => undefined}>Save</Action>}
            secondary={
              <Action variant="quiet" onPress={() => undefined}>
                Cancel
              </Action>
            }
            summary={
              <AdminFormStatus
                lifecycle="invalid"
                labels={{
                  pristine: 'Saved',
                  dirty: 'Unsaved',
                  submitting: 'Saving',
                  submitted: 'Saved',
                  invalid: 'Fix errors',
                }}
              />
            }
          />
        </div>
      ) : kind === 'states-feedback' ? (
        <div className="grid gap-5">
          <AdminStateRegion
            content={
              <Panel className="p-5 text-sm text-ink">Ready content remains available.</Panel>
            }
            denied={
              <StateSurface
                compact
                description="Protected content is not disclosed."
                icon={<CheckCircle2 className="size-5" />}
                state="permission-denied"
                title="Denied"
              />
            }
            empty={
              <StateSurface
                compact
                description="No result matches the current filters."
                icon={<CheckCircle2 className="size-5" />}
                state="empty"
                title="Empty"
              />
            }
            error={
              <StateSurface
                compact
                description="The region can be retried independently."
                icon={<CheckCircle2 className="size-5" />}
                state="error"
                title="Error"
              />
            }
            refreshing={
              <Panel className="p-3 text-sm text-info">
                Existing content remains while refreshing.
              </Panel>
            }
            label="Admin state region"
            loading={
              <StateSurface
                compact
                description="Structure remains stable while loading."
                icon={<CheckCircle2 className="size-5" />}
                state="loading"
                title="Loading"
              />
            }
            partialNotice={
              <Panel className="p-3 text-sm text-warning">Partial result notice</Panel>
            }
            pending={
              <StateSurface
                compact
                description="An operation is awaiting confirmation."
                icon={<CheckCircle2 className="size-5" />}
                state="pending"
                title="Pending"
              />
            }
            readonlyNotice={<Panel className="p-3 text-sm text-info">Readonly reason</Panel>}
            state="partial"
          />
          <AdminOperationStatus
            state="running"
            title="Pending operation"
            description="The operation is active while the surrounding page remains ready."
            icon={<CheckCircle2 className="size-5" />}
            progress={48}
            progressLabel="Operation progress"
          />
        </div>
      ) : (
        <AdminSettingsLayout
          navigation={
            <Panel className="p-4 text-sm text-ink-muted">Settings navigation slot</Panel>
          }
        >
          <AdminEntitySummary
            title="Entity summary"
            description="Stable identity, status, metadata, and action regions."
          />
          <AdminSection title="Timeline">
            <div className="p-5">
              <AdminTimeline
                label="Timeline"
                items={[{ id: 'one', title: 'Created', tone: 'success' }]}
              />
            </div>
          </AdminSection>
        </AdminSettingsLayout>
      )}
    </AdminPage>
  );
}
