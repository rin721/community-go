import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw, RotateCcw, Save, Search, UserCheck, UserRoundCog, Users, UserX } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "~/components/console/patterns/DataTable";
import { FormField } from "~/components/console/patterns/FormField";
import { TableSkeleton } from "~/components/console/patterns/LoadingSkeletons";
import { SelectField, type SelectOption } from "~/components/console/patterns/SelectField";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import {
  CommunityStatCard,
  formatCommunityDate,
  formatCommunityNumber,
  normalizeCommunityLimit,
  sameCommunityID,
  type CommunityNotice,
} from "~/features/community/admin-components";
import { adminErrorDescription, adminErrorTitle } from "~/features/admin/error-state";
import { communityApi, type CommunityAccountListQuery } from "~/lib/api/community";
import { queryKeys } from "~/lib/api/query-keys";
import type { CommunityAccount, CommunityAccountRole, CommunityAccountStatus } from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const defaultLimit = 24;
const emptyAccounts: CommunityAccount[] = [];
const accountErrorCopy = {
  defaultTitle: "admin.community.accounts.states.errorTitle",
  permissionDescription: "admin.community.accounts.states.permissionDescription",
  permissionTitle: "admin.community.accounts.states.permissionTitle",
  storageUnavailableDescription: "admin.community.accounts.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.community.accounts.states.storageUnavailableTitle",
};

type AccountFilters = Pick<CommunityAccountListQuery, "keyword" | "role" | "status">;

type AccountFilterDraft = {
  keyword: string;
  limit: string;
  role: string;
  status: string;
};

type AccountUpdateInput = {
  account: CommunityAccount;
  role: CommunityAccountRole;
  status: CommunityAccountStatus;
};

const initialDraft: AccountFilterDraft = {
  keyword: "",
  limit: String(defaultLimit),
  role: "",
  status: "",
};

export default function AdminCommunityAccountsRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);
  const [draft, setDraft] = useState<AccountFilterDraft>(initialDraft);
  const [filters, setFilters] = useState<AccountFilters>({});
  const [limit, setLimit] = useState(defaultLimit);
  const [notice, setNotice] = useState<CommunityNotice | null>(null);

  const canReadAccounts = hasSessionPermission(permissions, {
    code: "community_account:read",
    productCode: productCode || undefined,
    scope: "tenant",
  });
  const canUpdateAccounts = hasSessionPermission(permissions, {
    code: "community_account:update",
    productCode: productCode || undefined,
    scope: "tenant",
  });

  const accountQueryKey = queryKeys.community.accounts(i18n.language, { ...filters, limit });
  const accountsQuery = useQuery({
    enabled: canReadAccounts,
    queryFn: ({ signal }) => communityApi.listAccounts({ ...filters, limit }, { signal }),
    queryKey: accountQueryKey,
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ account, role, status }: AccountUpdateInput) =>
      communityApi.updateAccount(account.id, { role, status }),
    onError: (error, input) => {
      setNotice({
        description: adminErrorDescription(error, t, accountErrorCopy),
        intent: "danger",
        title: t("admin.community.accounts.messages.updateFailedTitle", {
          handle: input.account.handle,
        }),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.root });
    },
    onSuccess: (account) => {
      setNotice({
        description: t("admin.community.accounts.messages.updateSuccessDescription", {
          handle: account.handle,
        }),
        title: t("admin.community.accounts.messages.updateSuccessTitle"),
      });
    },
  });

  const accounts = accountsQuery.data?.items.items ?? emptyAccounts;
  const summary = useMemo(() => summarizeAccounts(accounts), [accounts]);
  const roleOptions = useMemo<SelectOption[]>(
    () => [
      { label: t("admin.community.accounts.filters.allRoles"), value: "" },
      { label: t("admin.community.accountRole.registered"), value: "registered" },
      { label: t("admin.community.accountRole.creator"), value: "creator" },
    ],
    [t],
  );
  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { label: t("admin.community.accounts.filters.allStatuses"), value: "" },
      { label: t("admin.community.accountStatus.active"), value: "active" },
      { label: t("admin.community.accountStatus.disabled"), value: "disabled" },
    ],
    [t],
  );

  const columns = useMemo<ColumnDef<CommunityAccount>[]>(
    () => [
      {
        cell: ({ row }) => (
          <div className="console-community-identity">
            <strong>{row.original.displayName || row.original.handle}</strong>
            <code className="console-audit-code">@{row.original.handle}</code>
            <span>{row.original.email}</span>
          </div>
        ),
        header: t("admin.community.accounts.columns.account"),
      },
      {
        cell: ({ row }) => <code className="console-audit-code">{row.original.id}</code>,
        header: t("admin.community.accounts.columns.id"),
      },
      {
        cell: ({ row }) => (
          <span className="console-iam-status" data-status={row.original.role}>
            {accountRoleLabel(row.original.role, t)}
          </span>
        ),
        header: t("admin.community.accounts.columns.role"),
      },
      {
        cell: ({ row }) => (
          <span className="console-iam-status" data-status={row.original.status}>
            {accountStatusLabel(row.original.status, t)}
          </span>
        ),
        header: t("admin.community.accounts.columns.status"),
      },
      {
        cell: ({ row }) =>
          formatCommunityDate(row.original.lastLoginAt, i18n.language, t("common.labels.none")),
        header: t("admin.community.accounts.columns.lastLoginAt"),
      },
      {
        cell: ({ row }) =>
          formatCommunityDate(row.original.createdAt, i18n.language, t("common.labels.none")),
        header: t("admin.community.accounts.columns.createdAt"),
      },
      {
        cell: ({ row }) => (
          <AccountControls
            account={row.original}
            canUpdate={canUpdateAccounts}
            isSaving={
              updateAccountMutation.isPending &&
              sameCommunityID(updateAccountMutation.variables?.account.id, row.original.id)
            }
            permissionTitle={t("admin.community.accounts.states.updatePermissionDescription")}
            onSave={(input) => updateAccountMutation.mutate(input)}
          />
        ),
        header: t("admin.community.accounts.columns.actions"),
      },
    ],
    [canUpdateAccounts, i18n.language, t, updateAccountMutation],
  );

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextLimit = normalizeCommunityLimit(draft.limit, defaultLimit);
    setLimit(nextLimit);
    setNotice(null);
    setFilters({
      keyword: draft.keyword.trim() || undefined,
      role: draft.role || undefined,
      status: draft.status || undefined,
    });
  };

  const resetFilters = () => {
    setDraft(initialDraft);
    setFilters({});
    setLimit(defaultLimit);
    setNotice(null);
  };

  const updateDraft = (key: keyof AccountFilterDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="console-admin-dashboard" aria-labelledby="admin-community-accounts-title">
      <div className="console-admin-page-header">
        <div>
          <Badge>{t("admin.community.accounts.badge")}</Badge>
          <h1 id="admin-community-accounts-title">{t("admin.community.accounts.title")}</h1>
          <p>{t("admin.community.accounts.description")}</p>
        </div>
        <Button
          appearance="secondary"
          icon={<RefreshCw size={17} />}
          loading={accountsQuery.isFetching}
          onClick={() => void accountsQuery.refetch()}
        >
          {t("admin.community.actions.refresh")}
        </Button>
      </div>

      {!canReadAccounts ? (
        <StateBlock
          title={t("admin.community.accounts.states.permissionTitle")}
          description={t("admin.community.accounts.states.readPermissionDescription")}
        />
      ) : null}

      {accountsQuery.error ? (
        <StateBlock
          intent="danger"
          title={adminErrorTitle(accountsQuery.error, t, accountErrorCopy)}
          description={adminErrorDescription(accountsQuery.error, t, accountErrorCopy)}
        />
      ) : null}

      {notice ? (
        <StateBlock description={notice.description} intent={notice.intent} title={notice.title} />
      ) : null}

      {!canUpdateAccounts ? (
        <StateBlock
          title={t("admin.community.accounts.states.updatePermissionTitle")}
          description={t("admin.community.accounts.states.updatePermissionDescription")}
        />
      ) : null}

      <div className="console-admin-stat-grid" aria-label={t("admin.community.accounts.summaryLabel")}>
        <CommunityStatCard
          icon={<Users size={19} />}
          label={t("admin.community.accounts.metrics.total")}
          value={formatCommunityNumber(accounts.length, i18n.language)}
        />
        <CommunityStatCard
          icon={<UserCheck size={19} />}
          label={t("admin.community.accounts.metrics.active")}
          value={formatCommunityNumber(summary.active, i18n.language)}
        />
        <CommunityStatCard
          icon={<UserRoundCog size={19} />}
          label={t("admin.community.accounts.metrics.creators")}
          value={formatCommunityNumber(summary.creators, i18n.language)}
        />
        <CommunityStatCard
          icon={<UserX size={19} />}
          label={t("admin.community.accounts.metrics.disabled")}
          value={formatCommunityNumber(summary.disabled, i18n.language)}
        />
      </div>

      <section className="console-admin-panel">
        <header>
          <h2>{t("admin.community.accounts.filters.title")}</h2>
          <p>{t("admin.community.accounts.filters.description")}</p>
        </header>
        <form className="console-admin-filter-form" onSubmit={submitFilters}>
          <FormField
            label={t("admin.community.accounts.filters.keyword")}
            value={draft.keyword}
            onChange={(event) => updateDraft("keyword", event.currentTarget.value)}
          />
          <SelectField
            label={t("admin.community.accounts.filters.role")}
            options={roleOptions}
            value={draft.role}
            onChange={(event) => updateDraft("role", event.currentTarget.value)}
          />
          <SelectField
            label={t("admin.community.accounts.filters.status")}
            options={statusOptions}
            value={draft.status}
            onChange={(event) => updateDraft("status", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.community.filters.limit")}
            max={100}
            min={1}
            type="number"
            value={draft.limit}
            onChange={(event) => updateDraft("limit", event.currentTarget.value)}
          />
          <div className="console-admin-filter-actions">
            <Button icon={<Search size={17} />} loading={accountsQuery.isFetching} type="submit">
              {t("admin.community.actions.search")}
            </Button>
            <Button appearance="secondary" icon={<RotateCcw size={17} />} onClick={resetFilters}>
              {t("admin.community.actions.reset")}
            </Button>
          </div>
        </form>
      </section>

      <section className="console-admin-panel">
        <header>
          <h2>{t("admin.community.accounts.list.title")}</h2>
          <p>{t("admin.community.accounts.list.description", { count: accounts.length })}</p>
        </header>
        {accountsQuery.isLoading ? (
          <TableSkeleton
            caption={t("admin.community.accounts.states.loadingDescription")}
            columns={7}
            rows={Math.min(limit, 8)}
          />
        ) : accountsQuery.data ? (
          <DataTable
            columns={columns}
            data={accounts}
            emptyLabel={t("admin.community.accounts.empty")}
          />
        ) : (
          <StateBlock
            title={t("admin.community.accounts.states.emptyTitle")}
            description={t("admin.community.accounts.states.emptyDescription")}
          />
        )}
      </section>
    </section>
  );
}

type AccountControlsProps = {
  account: CommunityAccount;
  canUpdate: boolean;
  isSaving: boolean;
  onSave: (input: AccountUpdateInput) => void;
  permissionTitle: string;
};

function AccountControls({
  account,
  canUpdate,
  isSaving,
  onSave,
  permissionTitle,
}: AccountControlsProps) {
  const { t } = useTranslation();
  const [role, setRole] = useState<string>(account.role || "registered");
  const [status, setStatus] = useState<string>(account.status || "active");

  useEffect(() => {
    setRole(account.role || "registered");
    setStatus(account.status || "active");
  }, [account.role, account.status]);

  const changed = role !== account.role || status !== account.status;

  return (
    <div className="console-community-row-actions">
      <select
        aria-label={t("admin.community.accounts.controls.role")}
        disabled={!canUpdate || isSaving}
        value={role}
        onChange={(event) => setRole(event.currentTarget.value)}
      >
        <option value="registered">{t("admin.community.accountRole.registered")}</option>
        <option value="creator">{t("admin.community.accountRole.creator")}</option>
      </select>
      <select
        aria-label={t("admin.community.accounts.controls.status")}
        disabled={!canUpdate || isSaving}
        value={status}
        onChange={(event) => setStatus(event.currentTarget.value)}
      >
        <option value="active">{t("admin.community.accountStatus.active")}</option>
        <option value="disabled">{t("admin.community.accountStatus.disabled")}</option>
      </select>
      <Button
        appearance="secondary"
        disabled={!canUpdate || !changed}
        icon={<Save size={16} />}
        loading={isSaving}
        title={!canUpdate ? permissionTitle : undefined}
        onClick={() =>
          onSave({
            account,
            role: role as CommunityAccountRole,
            status: status as CommunityAccountStatus,
          })
        }
      >
        {t("admin.community.accounts.actions.save")}
      </Button>
    </div>
  );
}

function summarizeAccounts(accounts: CommunityAccount[]) {
  return accounts.reduce(
    (summary, account) => {
      if (account.status === "active") {
        summary.active += 1;
      }
      if (account.status === "disabled") {
        summary.disabled += 1;
      }
      if (account.role === "creator") {
        summary.creators += 1;
      }
      return summary;
    },
    { active: 0, creators: 0, disabled: 0 },
  );
}

function accountRoleLabel(role: string, t: (key: string) => string) {
  if (role === "creator") {
    return t("admin.community.accountRole.creator");
  }
  return t("admin.community.accountRole.registered");
}

function accountStatusLabel(status: string, t: (key: string) => string) {
  if (status === "disabled") {
    return t("admin.community.accountStatus.disabled");
  }
  return t("admin.community.accountStatus.active");
}
