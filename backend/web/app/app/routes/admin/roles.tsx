import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import {
  KeyRound,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { DataTable } from "~/components/console/patterns/DataTable";
import { FormField } from "~/components/console/patterns/FormField";
import { SelectField } from "~/components/console/patterns/SelectField";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { adminErrorDescription, adminErrorTitle } from "~/features/admin/error-state";
import { iamApi } from "~/lib/api/iam";
import { queryKeys } from "~/lib/api/query-keys";
import type {
  IAMCreateRoleInput,
  IAMPermission,
  IAMRole,
  IAMUpdateRoleInput,
} from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const roleCodePattern = /^[a-z][a-z0-9_-]{0,63}$/;

const createRoleSchema = z.object({
  code: z.string().trim().regex(roleCodePattern),
  description: z.string().trim().max(500),
  name: z.string().trim().min(1),
  permissions: z.array(z.string().trim().min(1)),
});

const updateRoleSchema = z.object({
  description: z.string().trim().max(500),
  name: z.string().trim().min(1),
  permissions: z.array(z.string().trim().min(1)),
});

type RoleDraft = {
  code: string;
  description: string;
  name: string;
  permissions: string[];
};

type RoleEditDraft = Omit<RoleDraft, "code">;

type RoleNotice = {
  description: string;
  intent?: "danger" | "info";
  title: string;
};

type PermissionGroup = {
  label: string;
  object: string;
  permissions: IAMPermission[];
};

const initialCreateDraft: RoleDraft = {
  code: "",
  description: "",
  name: "",
  permissions: [],
};

const initialEditDraft: RoleEditDraft = {
  description: "",
  name: "",
  permissions: [],
};

const emptyRoles: IAMRole[] = [];
const emptyPermissions: IAMPermission[] = [];
const roleErrorCopy = {
  defaultTitle: "admin.roles.states.errorTitle",
  permissionDescription: "admin.roles.states.permissionDescription",
  permissionTitle: "admin.roles.states.permissionTitle",
};

export default function AdminRolesRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const currentOrgId = useAuthStore((state) => state.currentOrgId);
  const sessionPermissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<RoleDraft>(initialCreateDraft);
  const [editRoleId, setEditRoleId] = useState("");
  const [editDraft, setEditDraft] = useState<RoleEditDraft | null>(null);
  const [notice, setNotice] = useState<RoleNotice | null>(null);

  const rolesQueryKey = queryKeys.iam.roles(i18n.language, currentOrgId ?? "");
  const permissionsQueryKey = queryKeys.iam.permissions(i18n.language, currentOrgId ?? "");
  const canCreateRole = hasSessionPermission(sessionPermissions, {
    code: "role:create",
    productCode: productCode || undefined,
    scope: "tenant",
  });
  const canUpdateRole = hasSessionPermission(sessionPermissions, {
    code: "role:update",
    productCode: productCode || undefined,
    scope: "tenant",
  });

  const rolesQuery = useQuery({
    enabled: Boolean(currentOrgId),
    queryFn: ({ signal }) => iamApi.listRoles(currentOrgId ?? "", { signal }),
    queryKey: rolesQueryKey,
  });

  const permissionsQuery = useQuery({
    enabled: Boolean(currentOrgId),
    queryFn: ({ signal }) => iamApi.listPermissions(currentOrgId ?? "", { signal }),
    queryKey: permissionsQueryKey,
  });

  const roles = rolesQuery.data ?? emptyRoles;
  const permissions = permissionsQuery.data ?? emptyPermissions;

  const roleSummary = useMemo(() => summarizeRoles(roles, permissions), [permissions, roles]);
  const editableRoles = useMemo(() => roles.filter((role) => !role.system), [roles]);
  const assignablePermissions = useMemo(
    () => permissions.filter(isAssignableRolePermission),
    [permissions],
  );
  const assignablePermissionCodes = useMemo(
    () => new Set(assignablePermissions.map((permission) => permission.code)),
    [assignablePermissions],
  );
  const activeEditRoleId = editRoleId || (editableRoles[0] ? String(editableRoles[0].id) : "");
  const selectedEditRole = useMemo(
    () => editableRoles.find((role) => String(role.id) === activeEditRoleId) ?? null,
    [activeEditRoleId, editableRoles],
  );
  const activeEditDraft =
    editDraft ??
    (selectedEditRole
      ? draftFromRole(selectedEditRole, assignablePermissionCodes)
      : initialEditDraft);
  const roleOptions = useMemo(
    () =>
      editableRoles.map((role) => ({
        label: t("admin.roles.edit.roleOption", { code: role.code, name: role.name }),
        value: String(role.id),
      })),
    [editableRoles, t],
  );
  const permissionMap = useMemo(
    () => new Map(permissions.map((permission) => [permission.code, permission])),
    [permissions],
  );
  const rolePermissionDescription = useCallback(
    (permission: string) =>
      t("admin.roles.states.writePermissionDescription", {
        permission,
      }),
    [t],
  );
  const setRolePermissionNotice = useCallback(
    (permission: string) => {
      setNotice({
        description: rolePermissionDescription(permission),
        intent: "danger",
        title: t("admin.roles.states.permissionTitle"),
      });
    },
    [rolePermissionDescription, t],
  );

  const createRoleMutation = useMutation({
    mutationFn: (input: IAMCreateRoleInput) => iamApi.createRole(currentOrgId ?? "", input),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, roleErrorCopy),
        intent: "danger",
        title: t("admin.roles.create.errorTitle"),
      });
    },
    onSuccess: (role) => {
      setCreateDraft(initialCreateDraft);
      setCreateOpen(false);
      setEditRoleId(String(role.id));
      setEditDraft(draftFromRole(role, assignablePermissionCodes));
      setNotice({
        description: t("admin.roles.create.successDescription", { name: role.name }),
        title: t("admin.roles.create.successTitle"),
      });
      void queryClient.invalidateQueries({ queryKey: rolesQueryKey });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (input: { role: IAMRole; values: IAMUpdateRoleInput }) =>
      iamApi.updateRole(currentOrgId ?? "", input.role.id, input.values),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, roleErrorCopy),
        intent: "danger",
        title: t("admin.roles.edit.errorTitle"),
      });
    },
    onSuccess: (role) => {
      setEditDraft(draftFromRole(role, assignablePermissionCodes));
      setNotice({
        description: t("admin.roles.edit.successDescription", { name: role.name }),
        title: t("admin.roles.edit.successTitle"),
      });
      void queryClient.invalidateQueries({ queryKey: rolesQueryKey });
    },
  });

  const roleColumns = useMemo<ColumnDef<IAMRole>[]>(
    () => [
      {
        accessorKey: "code",
        cell: ({ row }) => (
          <div className="console-role-principal">
            <strong>{row.original.name}</strong>
            <code>{row.original.code}</code>
            <span>{row.original.description || t("common.labels.none")}</span>
          </div>
        ),
        header: t("admin.roles.columns.role"),
      },
      {
        cell: ({ row }) => (
          <span
            className="console-iam-status"
            data-status={row.original.system ? "used" : "active"}
          >
            {row.original.system ? t("admin.roles.kind.system") : t("admin.roles.kind.custom")}
          </span>
        ),
        header: t("admin.roles.columns.kind"),
      },
      {
        cell: ({ row }) => (
          <RolePermissionList
            codes={row.original.permissions ?? []}
            permissionMap={permissionMap}
          />
        ),
        header: t("admin.roles.columns.permissions"),
      },
      {
        cell: ({ row }) => formatDate(row.original.updatedAt, i18n.language, t),
        header: t("admin.roles.columns.updatedAt"),
      },
    ],
    [i18n.language, permissionMap, t],
  );

  function handleRefresh() {
    void rolesQuery.refetch();
    void permissionsQuery.refetch();
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateRole) {
      setRolePermissionNotice("role:create");
      return;
    }
    const parsed = createRoleSchema.safeParse({
      ...createDraft,
      permissions: uniqueCodes(createDraft.permissions),
    });
    if (!parsed.success) {
      setNotice({
        description: validationMessage(parsed.error, t),
        intent: "danger",
        title: t("admin.roles.validation.title"),
      });
      return;
    }
    createRoleMutation.mutate(parsed.data);
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpdateRole) {
      setRolePermissionNotice("role:update");
      return;
    }
    if (!selectedEditRole) {
      setNotice({
        description: t("admin.roles.edit.noSelectionDescription"),
        intent: "danger",
        title: t("admin.roles.edit.noSelectionTitle"),
      });
      return;
    }
    const parsed = updateRoleSchema.safeParse({
      ...activeEditDraft,
      permissions: uniqueCodes(activeEditDraft.permissions),
    });
    if (!parsed.success) {
      setNotice({
        description: validationMessage(parsed.error, t),
        intent: "danger",
        title: t("admin.roles.validation.title"),
      });
      return;
    }
    updateRoleMutation.mutate({ role: selectedEditRole, values: parsed.data });
  }

  function handleEditRoleChange(roleId: string) {
    const role = editableRoles.find((item) => String(item.id) === roleId);
    setEditRoleId(roleId);
    setEditDraft(role ? draftFromRole(role, assignablePermissionCodes) : null);
  }

  function updateActiveEditDraft(update: Partial<RoleEditDraft>) {
    if (!editRoleId && selectedEditRole) {
      setEditRoleId(String(selectedEditRole.id));
    }
    setEditDraft({ ...activeEditDraft, ...update });
  }

  if (!currentOrgId) {
    return (
      <section className="console-admin-dashboard">
        <StateBlock
          title={t("admin.roles.states.missingOrgTitle")}
          description={t("admin.roles.states.missingOrgDescription")}
        />
      </section>
    );
  }

  const queryError = rolesQuery.error ?? permissionsQuery.error;
  const isInitialLoading = rolesQuery.isLoading || permissionsQuery.isLoading;
  const isMutating = createRoleMutation.isPending || updateRoleMutation.isPending;

  return (
    <section className="console-admin-dashboard">
      <header className="console-admin-page-header">
        <div>
          <Badge>{t("admin.roles.badge")}</Badge>
          <h1>{t("admin.roles.title")}</h1>
          <p>{t("admin.roles.description")}</p>
        </div>
        <div className="console-admin-action-row console-role-page-actions">
          <Button
            appearance="secondary"
            disabled={rolesQuery.isFetching || permissionsQuery.isFetching}
            icon={<RefreshCw size={17} />}
            onClick={handleRefresh}
          >
            {t("admin.roles.actions.refresh")}
          </Button>
          <Button
            disabled={!canCreateRole}
            icon={createOpen ? <X size={17} /> : <Plus size={17} />}
            title={!canCreateRole ? rolePermissionDescription("role:create") : undefined}
            onClick={() => {
              if (!canCreateRole) {
                setRolePermissionNotice("role:create");
                return;
              }
              setCreateOpen((current) => !current);
            }}
          >
            {createOpen ? t("admin.roles.actions.cancelCreate") : t("admin.roles.actions.create")}
          </Button>
        </div>
      </header>

      {notice ? (
        <StateBlock
          title={notice.title}
          description={notice.description}
          intent={notice.intent}
          action={
            <Button appearance="ghost" onClick={() => setNotice(null)}>
              {t("admin.roles.actions.dismiss")}
            </Button>
          }
        />
      ) : null}

      <div className="console-admin-stat-grid" aria-label={t("admin.roles.summaryLabel")}>
        <RoleStatCard
          icon={<ShieldCheck size={18} />}
          label={t("admin.roles.metrics.total")}
          value={formatNumber(roleSummary.total, i18n.language)}
        />
        <RoleStatCard
          icon={<Shield size={18} />}
          label={t("admin.roles.metrics.custom")}
          value={formatNumber(roleSummary.custom, i18n.language)}
        />
        <RoleStatCard
          icon={<KeyRound size={18} />}
          label={t("admin.roles.metrics.system")}
          value={formatNumber(roleSummary.system, i18n.language)}
        />
        <RoleStatCard
          icon={<SlidersHorizontal size={18} />}
          label={t("admin.roles.metrics.permissions")}
          value={formatNumber(roleSummary.permissions, i18n.language)}
        />
        <RoleStatCard
          icon={<ShieldCheck size={18} />}
          label={t("admin.roles.metrics.assignedPermissions")}
          value={formatNumber(roleSummary.assignedPermissions, i18n.language)}
        />
      </div>

      {queryError ? (
        <StateBlock
          title={adminErrorTitle(queryError, t, roleErrorCopy)}
          description={adminErrorDescription(queryError, t, roleErrorCopy)}
          intent="danger"
        />
      ) : isInitialLoading ? (
        <StateBlock
          title={t("admin.roles.states.loadingTitle")}
          description={t("admin.roles.states.loadingDescription")}
        />
      ) : (
        <div
          className={
            createOpen
              ? "console-role-workbench console-role-workbench--with-create"
              : "console-role-workbench"
          }
        >
          <section className="console-admin-panel console-admin-panel--span-2">
            <header>
              <h2>{t("admin.roles.list.title")}</h2>
              <p>{t("admin.roles.list.description", { count: roles.length })}</p>
            </header>
            <div className="console-role-table">
              <DataTable columns={roleColumns} data={roles} emptyLabel={t("admin.roles.empty")} />
            </div>
          </section>

          {createOpen ? (
            <section className="console-admin-panel">
              <header>
                <h2>{t("admin.roles.create.title")}</h2>
                <p>{t("admin.roles.create.description")}</p>
              </header>
              <form className="console-role-form" onSubmit={handleCreateSubmit}>
                <FormField
                  disabled={!canCreateRole || isMutating}
                  label={t("admin.roles.fields.code")}
                  value={createDraft.code}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, code: event.target.value }))
                  }
                  placeholder={t("admin.roles.fields.codePlaceholder")}
                  autoComplete="off"
                />
                <FormField
                  disabled={!canCreateRole || isMutating}
                  label={t("admin.roles.fields.name")}
                  value={createDraft.name}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  autoComplete="off"
                />
                <TextAreaField
                  disabled={!canCreateRole || isMutating}
                  id="create-role-description"
                  label={t("admin.roles.fields.description")}
                  value={createDraft.description}
                  onChange={(value) =>
                    setCreateDraft((current) => ({ ...current, description: value }))
                  }
                  help={t("admin.roles.fields.descriptionHelp")}
                />
                <PermissionSelector
                  disabled={!canCreateRole || isMutating}
                  permissions={assignablePermissions}
                  selected={createDraft.permissions}
                  onChange={(nextPermissions) =>
                    setCreateDraft((current) => ({ ...current, permissions: nextPermissions }))
                  }
                  idPrefix="create-role-permission"
                  title={t("admin.roles.permissions.createTitle")}
                  description={t("admin.roles.permissions.createDescription")}
                />
                <div className="console-role-form-actions">
                  <Button
                    appearance="secondary"
                    disabled={isMutating}
                    icon={<X size={17} />}
                    onClick={() => {
                      setCreateDraft(initialCreateDraft);
                      setCreateOpen(false);
                    }}
                  >
                    {t("admin.roles.actions.cancelCreate")}
                  </Button>
                  <Button
                    disabled={!canCreateRole || isMutating}
                    icon={<Plus size={17} />}
                    loading={createRoleMutation.isPending}
                    title={!canCreateRole ? rolePermissionDescription("role:create") : undefined}
                    type="submit"
                  >
                    {t("admin.roles.actions.submitCreate")}
                  </Button>
                </div>
              </form>
            </section>
          ) : null}

          <section className="console-admin-panel">
            <header>
              <h2>{t("admin.roles.edit.title")}</h2>
              <p>{t("admin.roles.edit.description")}</p>
            </header>
            {editableRoles.length === 0 ? (
              <StateBlock
                title={t("admin.roles.edit.noneTitle")}
                description={t("admin.roles.edit.noneDescription")}
              />
            ) : (
              <form className="console-role-form" onSubmit={handleEditSubmit}>
                <SelectField
                  label={t("admin.roles.edit.role")}
                  options={roleOptions}
                  value={activeEditRoleId}
                  onChange={(event) => handleEditRoleChange(event.target.value)}
                />
                <FormField
                  disabled={!canUpdateRole || isMutating}
                  label={t("admin.roles.fields.name")}
                  value={activeEditDraft.name}
                  onChange={(event) => updateActiveEditDraft({ name: event.target.value })}
                  autoComplete="off"
                />
                <TextAreaField
                  disabled={!canUpdateRole || isMutating}
                  id="edit-role-description"
                  label={t("admin.roles.fields.description")}
                  value={activeEditDraft.description}
                  onChange={(value) => updateActiveEditDraft({ description: value })}
                  help={t("admin.roles.edit.descriptionHelp")}
                />
                <PermissionSelector
                  disabled={!canUpdateRole || isMutating}
                  permissions={assignablePermissions}
                  selected={activeEditDraft.permissions}
                  onChange={(nextPermissions) =>
                    updateActiveEditDraft({ permissions: nextPermissions })
                  }
                  idPrefix="edit-role-permission"
                  title={t("admin.roles.permissions.editTitle")}
                  description={t("admin.roles.permissions.editDescription")}
                />
                <div className="console-role-form-actions">
                  <Button
                    appearance="secondary"
                    disabled={isMutating || !selectedEditRole}
                    icon={<RefreshCw size={17} />}
                    onClick={() => {
                      if (selectedEditRole) {
                        setEditRoleId(String(selectedEditRole.id));
                        setEditDraft(draftFromRole(selectedEditRole, assignablePermissionCodes));
                      }
                    }}
                  >
                    {t("admin.roles.actions.reset")}
                  </Button>
                  <Button
                    disabled={isMutating || !canUpdateRole || !selectedEditRole}
                    icon={<Save size={17} />}
                    loading={updateRoleMutation.isPending}
                    title={!canUpdateRole ? rolePermissionDescription("role:update") : undefined}
                    type="submit"
                  >
                    {t("admin.roles.actions.save")}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

type RoleStatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function RoleStatCard({ icon, label, value }: RoleStatCardProps) {
  return (
    <article className="console-admin-stat-card">
      <span aria-hidden="true">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

type TextAreaFieldProps = {
  disabled?: boolean;
  help?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
};

function TextAreaField({ disabled, help, id, label, onChange, value }: TextAreaFieldProps) {
  return (
    <div className="console-form-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {help ? <span className="console-form-field__help">{help}</span> : null}
    </div>
  );
}

type PermissionSelectorProps = {
  description: string;
  disabled?: boolean;
  idPrefix: string;
  onChange: (permissions: string[]) => void;
  permissions: IAMPermission[];
  selected: string[];
  title: string;
};

function PermissionSelector({
  description,
  disabled,
  idPrefix,
  onChange,
  permissions,
  selected,
  title,
}: PermissionSelectorProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [objectFilter, setObjectFilter] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const objectOptions = useMemo(() => {
    const objects = uniqueObjects(permissions);
    return [
      { label: t("admin.roles.permissions.allObjects"), value: "" },
      ...objects.map((object) => ({
        label: permissionObjectLabel(object, t),
        value: object,
      })),
    ];
  }, [permissions, t]);
  const groups = useMemo(
    () => groupPermissions(permissions, search, objectFilter, t),
    [objectFilter, permissions, search, t],
  );

  function replaceGroup(groupPermissions: IAMPermission[], include: boolean) {
    const groupCodes = groupPermissions.map((permission) => permission.code);
    const nextSet = new Set(selected);
    for (const code of groupCodes) {
      if (include) {
        nextSet.add(code);
      } else {
        nextSet.delete(code);
      }
    }
    onChange([...nextSet].sort());
  }

  return (
    <section className="console-role-permission-panel" aria-label={title}>
      <header>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span>{t("admin.roles.permissions.selected", { count: selected.length })}</span>
      </header>
      <div className="console-role-permission-toolbar">
        <FormField
          label={t("admin.roles.permissions.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("admin.roles.permissions.searchPlaceholder")}
        />
        <SelectField
          label={t("admin.roles.permissions.object")}
          options={objectOptions}
          value={objectFilter}
          onChange={(event) => setObjectFilter(event.target.value)}
        />
      </div>
      <div className="console-role-permission-groups">
        {groups.length > 0 ? (
          groups.map((group) => (
            <section className="console-role-permission-group" key={group.object}>
              <header>
                <div>
                  <h4>{group.label}</h4>
                  <p>
                    {t("admin.roles.permissions.groupCount", {
                      count: group.permissions.length,
                      selected: selectedCount(group.permissions, selectedSet),
                    })}
                  </p>
                </div>
                <div className="console-role-permission-group-actions">
                  <Button
                    appearance="ghost"
                    disabled={disabled}
                    onClick={() => replaceGroup(group.permissions, true)}
                  >
                    {t("admin.roles.permissions.selectGroup", { group: group.label })}
                  </Button>
                  <Button
                    appearance="ghost"
                    disabled={disabled}
                    onClick={() => replaceGroup(group.permissions, false)}
                  >
                    {t("admin.roles.permissions.clearGroup", { group: group.label })}
                  </Button>
                </div>
              </header>
              <div className="console-role-permission-list">
                {group.permissions.map((permission) => {
                  const optionId = `${idPrefix}-${permission.code.replace(/[^a-z0-9_-]+/gi, "-")}`;
                  return (
                    <label
                      className="console-role-permission-option"
                      htmlFor={optionId}
                      key={permission.code}
                    >
                      <input
                        id={optionId}
                        type="checkbox"
                        checked={selectedSet.has(permission.code)}
                        disabled={disabled}
                        onChange={(event) =>
                          onChange(
                            togglePermission(selected, permission.code, event.target.checked),
                          )
                        }
                        aria-label={t("admin.roles.permissions.toggle", { code: permission.code })}
                      />
                      <span>
                        <strong>{permission.name || permission.code}</strong>
                        <code>{permission.code}</code>
                        <em>{permission.description || t("common.labels.none")}</em>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <StateBlock
            title={t("admin.roles.permissions.emptyTitle")}
            description={t("admin.roles.permissions.emptyDescription")}
          />
        )}
      </div>
    </section>
  );
}

function RolePermissionList({
  codes,
  permissionMap,
}: {
  codes: string[];
  permissionMap: Map<string, IAMPermission>;
}) {
  const { t } = useTranslation();
  const normalizedCodes = uniqueCodes(codes);
  const visibleCodes = normalizedCodes.slice(0, 6);
  const hiddenCount = Math.max(0, normalizedCodes.length - visibleCodes.length);

  if (normalizedCodes.length === 0) {
    return <span className="console-iam-muted">{t("common.labels.none")}</span>;
  }

  return (
    <div className="console-role-permission-tags">
      {visibleCodes.map((code) => {
        const permission = permissionMap.get(code);
        return (
          <span key={code} title={permission?.name || code}>
            {code}
          </span>
        );
      })}
      {hiddenCount > 0 ? (
        <span>{t("admin.roles.permissions.more", { count: hiddenCount })}</span>
      ) : null}
    </div>
  );
}

function draftFromRole(role: IAMRole, assignablePermissionCodes?: Set<string>): RoleEditDraft {
  const permissions = uniqueCodes(role.permissions ?? []);
  return {
    description: role.description ?? "",
    name: role.name ?? "",
    permissions: assignablePermissionCodes
      ? permissions.filter((code) => assignablePermissionCodes.has(code))
      : permissions,
  };
}

function isAssignableRolePermission(permission: IAMPermission) {
  return permission.scope === "tenant";
}

function summarizeRoles(roles: IAMRole[], permissions: IAMPermission[]) {
  const assignedPermissions = new Set<string>();
  let custom = 0;
  let system = 0;

  for (const role of roles) {
    if (role.system) {
      system += 1;
    } else {
      custom += 1;
    }
    for (const permission of role.permissions ?? []) {
      assignedPermissions.add(permission);
    }
  }

  return {
    assignedPermissions: assignedPermissions.size,
    custom,
    permissions: permissions.length,
    system,
    total: roles.length,
  };
}

function uniqueCodes(codes: string[]) {
  return [...new Set(codes.map((code) => code.trim()).filter(Boolean))].sort();
}

function togglePermission(selected: string[], code: string, checked: boolean) {
  const nextSet = new Set(selected);
  if (checked) {
    nextSet.add(code);
  } else {
    nextSet.delete(code);
  }
  return [...nextSet].sort();
}

function uniqueObjects(permissions: IAMPermission[]) {
  return [...new Set(permissions.map((permission) => permissionObject(permission.code)))].sort();
}

function groupPermissions(
  permissions: IAMPermission[],
  search: string,
  objectFilter: string,
  t: TFunction,
): PermissionGroup[] {
  const normalizedSearch = search.trim().toLowerCase();
  const grouped = new Map<string, IAMPermission[]>();

  for (const permission of permissions) {
    const object = permissionObject(permission.code);
    if (objectFilter && object !== objectFilter) {
      continue;
    }
    if (normalizedSearch && !permissionMatches(permission, normalizedSearch, object, t)) {
      continue;
    }
    const group = grouped.get(object) ?? [];
    group.push(permission);
    grouped.set(object, group);
  }

  return [...grouped.entries()]
    .map(([object, groupPermissions]) => ({
      label: permissionObjectLabel(object, t),
      object,
      permissions: groupPermissions.sort((a, b) => a.code.localeCompare(b.code)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function permissionMatches(
  permission: IAMPermission,
  search: string,
  object: string,
  t: TFunction,
) {
  const label = permissionObjectLabel(object, t);
  return [permission.code, permission.name, permission.description, label]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(search));
}

function permissionObject(code: string) {
  const [object] = code.split(":");
  return object || "other";
}

function permissionObjectLabel(object: string, t: TFunction) {
  return t(`admin.roles.permissionObjects.${object}`, { defaultValue: object });
}

function selectedCount(permissions: IAMPermission[], selectedSet: Set<string>) {
  return permissions.filter((permission) => selectedSet.has(permission.code)).length;
}

function validationMessage(error: z.ZodError, t: TFunction) {
  const firstPath = error.issues[0]?.path[0];
  if (firstPath === "code") {
    return t("admin.roles.validation.code");
  }
  if (firstPath === "name") {
    return t("admin.roles.validation.name");
  }
  if (firstPath === "description") {
    return t("admin.roles.validation.description");
  }
  if (firstPath === "permissions") {
    return t("admin.roles.validation.permissions");
  }
  return t("admin.roles.validation.description");
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: string | null | undefined, locale: string, t: TFunction) {
  if (!value) {
    return t("common.labels.none");
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}
