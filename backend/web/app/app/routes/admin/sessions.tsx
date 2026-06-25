import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Ban,
  Clock3,
  Database,
  MonitorCheck,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "~/components/console/patterns/DataTable";
import { Dialog } from "~/components/console/patterns/Dialog";
import { FormField } from "~/components/console/patterns/FormField";
import { TableSkeleton } from "~/components/console/patterns/LoadingSkeletons";
import { SelectField, type SelectOption } from "~/components/console/patterns/SelectField";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { adminErrorDescription, adminErrorTitle } from "~/features/admin/error-state";
import { clientTypeOptions, PlatformTag } from "~/features/admin/PlatformTag";
import { iamApi, type IAMSessionListQuery } from "~/lib/api/iam";
import { queryKeys } from "~/lib/api/query-keys";
import type { IAMSession, IAMSessionPage } from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const defaultPageSize = 10;
const sessionErrorCopy = {
  defaultTitle: "admin.sessions.states.errorTitle",
  permissionDescription: "admin.sessions.states.permissionDescription",
  permissionTitle: "admin.sessions.states.permissionTitle",
  storageUnavailableDescription: "admin.sessions.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.sessions.states.storageUnavailableTitle",
};

type SessionFilters = Pick<
  IAMSessionListQuery,
  "clientType" | "ipAddress" | "keyword" | "productCode" | "scope" | "status" | "userId"
> & {
  desc?: boolean;
  orderKey?: string;
};

type SessionFilterDraft = {
  clientType: string;
  ipAddress: string;
  keyword: string;
  pageSize: string;
  productCode: string;
  scope: string;
  status: string;
  userId: string;
};

type RevokeNotice = {
  description: string;
  intent?: "danger" | "info";
  title: string;
};

const initialDraft: SessionFilterDraft = {
  clientType: "",
  ipAddress: "",
  keyword: "",
  pageSize: String(defaultPageSize),
  productCode: "",
  scope: "org",
  status: "",
  userId: "",
};

export default function AdminSessionsRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const currentOrgId = useAuthStore((state) => state.currentOrgId);
  const currentSessionId = useAuthStore((state) => state.currentSessionId);
  const permissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);
  const [draft, setDraft] = useState<SessionFilterDraft>(initialDraft);
  const [filters, setFilters] = useState<SessionFilters>({
    desc: true,
    orderKey: "last_used_at",
    scope: "org",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [pendingRevokeSession, setPendingRevokeSession] = useState<IAMSession | null>(null);
  const [revokeNotice, setRevokeNotice] = useState<RevokeNotice | null>(null);
  const canRevokeSession = hasSessionPermission(permissions, {
    code: "session:revoke",
    productCode: productCode || undefined,
    scope: "tenant",
  });

  const sessionQueryKey = queryKeys.iam.sessions(
    i18n.language,
    currentOrgId ?? "",
    page,
    pageSize,
    filters,
  );

  const sessionsQuery = useQuery({
    enabled: Boolean(currentOrgId),
    queryFn: ({ signal }) =>
      iamApi.listSessions(currentOrgId ?? "", { ...filters, page, pageSize }, { signal }),
    queryKey: sessionQueryKey,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (session: IAMSession) => iamApi.revokeSession(currentOrgId ?? "", session.id),
    onError: (error, _session, context: { previousPage?: IAMSessionPage } | undefined) => {
      if (context?.previousPage) {
        queryClient.setQueryData(sessionQueryKey, context.previousPage);
      }
      setRevokeNotice({
        description: adminErrorDescription(error, t, sessionErrorCopy),
        intent: "danger",
        title: t("admin.sessions.revoke.errorTitle"),
      });
    },
    onMutate: async (session) => {
      setPendingRevokeSession(null);
      setRevokeNotice(null);
      await queryClient.cancelQueries({ queryKey: sessionQueryKey });
      const previousPage = queryClient.getQueryData<IAMSessionPage>(sessionQueryKey);
      const revokedAt = new Date().toISOString();
      queryClient.setQueryData<IAMSessionPage>(sessionQueryKey, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                sameID(item.id, session.id) ? { ...item, revokedAt, updatedAt: revokedAt } : item,
              ),
            }
          : current,
      );
      return { previousPage };
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
    onSuccess: (_result, session) => {
      setRevokeNotice({
        description: t("admin.sessions.revoke.successDescription", { id: session.id }),
        title: t("admin.sessions.revoke.successTitle"),
      });
    },
  });

  const pageData = sessionsQuery.data;
  const totalPages = Math.max(1, Math.ceil((pageData?.total ?? 0) / pageSize));
  const currentPageCount = pageData?.items.length ?? 0;
  const statusSummary = summarizeSessions(pageData?.items ?? []);
  const sessionPermissionDescription = useCallback(
    (permission: string) =>
      t("admin.sessions.states.writePermissionDescription", {
        permission,
      }),
    [t],
  );
  const setSessionPermissionNotice = useCallback(
    (permission: string) => {
      setRevokeNotice({
        description: sessionPermissionDescription(permission),
        intent: "danger",
        title: t("admin.sessions.states.permissionTitle"),
      });
    },
    [sessionPermissionDescription, t],
  );

  const scopeOptions = useMemo<SelectOption[]>(
    () => [
      { label: t("admin.sessions.scope.organization"), value: "org" },
      { label: t("admin.sessions.scope.self"), value: "self" },
    ],
    [t],
  );
  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { label: t("admin.sessions.filters.allStatuses"), value: "" },
      { label: t("admin.sessions.status.active"), value: "active" },
      { label: t("admin.sessions.status.revoked"), value: "revoked" },
      { label: t("admin.sessions.status.expired"), value: "expired" },
    ],
    [t],
  );
  const platformOptions = useMemo<SelectOption[]>(() => clientTypeOptions(t), [t]);

  const sessionColumns = useMemo<ColumnDef<IAMSession>[]>(
    () => [
      {
        accessorKey: "id",
        cell: ({ row }) => (
          <div className="console-session-id">
            <strong>{row.original.id}</strong>
            <span>{row.original.orgId}</span>
          </div>
        ),
        header: t("admin.sessions.columns.id"),
      },
      {
        accessorKey: "userId",
        cell: ({ row }) => <code className="console-session-code">{row.original.userId}</code>,
        header: t("admin.sessions.columns.user"),
      },
      {
        id: "platform",
        cell: ({ row }) => (
          <PlatformTag
            clientType={row.original.clientType}
            productCode={row.original.productCode}
          />
        ),
        header: t("admin.sessions.columns.platform"),
      },
      {
        accessorKey: "ipAddress",
        cell: ({ row }) =>
          row.original.ipAddress ? (
            <code className="console-session-code">{row.original.ipAddress}</code>
          ) : (
            t("common.labels.none")
          ),
        header: t("admin.sessions.columns.ip"),
      },
      {
        accessorKey: "userAgent",
        cell: ({ row }) => (
          <span className="console-session-agent">
            {row.original.userAgent || t("common.labels.none")}
          </span>
        ),
        header: t("admin.sessions.columns.device"),
      },
      {
        id: "status",
        cell: ({ row }) => {
          const status = sessionStatus(row.original);
          return (
            <span className="console-iam-status" data-status={status}>
              {statusLabel(status, t)}
            </span>
          );
        },
        header: t("admin.sessions.columns.status"),
      },
      {
        id: "lastUsedAt",
        cell: ({ row }) => formatDate(sessionLastUsedAt(row.original), i18n.language, t),
        header: t("admin.sessions.columns.lastUsed"),
      },
      {
        accessorKey: "expiresAt",
        cell: ({ row }) => formatDate(row.original.expiresAt, i18n.language, t),
        header: t("admin.sessions.columns.expiresAt"),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const session = row.original;
          const isCurrent = isCurrentSession(session, currentSessionId);
          if (isCurrent) {
            return (
              <span
                className="console-session-current"
                aria-label={t("admin.sessions.actions.currentSession")}
              >
                {t("admin.sessions.actions.currentSession")}
              </span>
            );
          }
          const revokeDisabled =
            !canRevokeSession ||
            sessionStatus(session) !== "active" ||
            revokeSessionMutation.isPending;
          return (
            <div className="console-session-actions">
              <Button
                appearance="secondary"
                aria-label={t("admin.sessions.actions.revokeSession", { id: session.id })}
                disabled={revokeDisabled}
                icon={<Ban size={16} />}
                loading={
                  revokeSessionMutation.isPending &&
                  Boolean(pendingRevokeSession && sameID(pendingRevokeSession.id, session.id))
                }
                title={
                  !canRevokeSession ? sessionPermissionDescription("session:revoke") : undefined
                }
                onClick={() => {
                  if (!canRevokeSession) {
                    setSessionPermissionNotice("session:revoke");
                    return;
                  }
                  setPendingRevokeSession(session);
                }}
              >
                {t("admin.sessions.actions.revoke")}
              </Button>
            </div>
          );
        },
        header: t("admin.sessions.columns.actions"),
      },
    ],
    [
      canRevokeSession,
      currentSessionId,
      i18n.language,
      pendingRevokeSession,
      revokeSessionMutation.isPending,
      sessionPermissionDescription,
      setSessionPermissionNotice,
      t,
    ],
  );

  const updateDraft = (key: keyof SessionFilterDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters(normalizeFilters(draft));
    setPage(1);
    setPageSize(parsePageSize(draft.pageSize));
  };

  const resetFilters = () => {
    setDraft(initialDraft);
    setFilters({ desc: true, orderKey: "last_used_at", scope: "org" });
    setPage(1);
    setPageSize(defaultPageSize);
  };

  const confirmRevokeSession = () => {
    if (!pendingRevokeSession) {
      return;
    }
    if (!canRevokeSession) {
      setPendingRevokeSession(null);
      setSessionPermissionNotice("session:revoke");
      return;
    }
    if (isCurrentSession(pendingRevokeSession, currentSessionId)) {
      setPendingRevokeSession(null);
      setRevokeNotice({
        description: t("admin.sessions.revoke.currentSessionDescription", {
          id: pendingRevokeSession.id,
        }),
        intent: "danger",
        title: t("admin.sessions.revoke.currentSessionTitle"),
      });
      return;
    }
    if (!currentOrgId) {
      setPendingRevokeSession(null);
      setRevokeNotice({
        description: t("admin.sessions.states.missingOrgDescription"),
        intent: "danger",
        title: t("admin.sessions.states.missingOrgTitle"),
      });
      return;
    }
    revokeSessionMutation.mutate(pendingRevokeSession);
  };

  return (
    <section className="console-admin-dashboard" aria-labelledby="admin-sessions-title">
      <div className="console-admin-page-header">
        <div>
          <Badge>{t("admin.sessions.badge")}</Badge>
          <h1 id="admin-sessions-title">{t("admin.sessions.title")}</h1>
          <p>{t("admin.sessions.description")}</p>
        </div>
        <Button
          appearance="secondary"
          disabled={!currentOrgId}
          icon={<RefreshCw size={17} />}
          loading={sessionsQuery.isFetching}
          onClick={() => void sessionsQuery.refetch()}
        >
          {t("admin.sessions.actions.refresh")}
        </Button>
      </div>

      {!currentOrgId ? (
        <StateBlock
          intent="danger"
          title={t("admin.sessions.states.missingOrgTitle")}
          description={t("admin.sessions.states.missingOrgDescription")}
        />
      ) : null}

      {sessionsQuery.error ? (
        <StateBlock
          intent="danger"
          title={adminErrorTitle(sessionsQuery.error, t, sessionErrorCopy)}
          description={adminErrorDescription(sessionsQuery.error, t, sessionErrorCopy)}
        />
      ) : null}

      {revokeNotice ? (
        <StateBlock
          description={revokeNotice.description}
          intent={revokeNotice.intent}
          title={revokeNotice.title}
        />
      ) : null}

      <Dialog
        closeLabel={t("admin.sessions.actions.cancelRevoke")}
        description={
          pendingRevokeSession
            ? t("admin.sessions.revoke.confirmDescription", {
                id: pendingRevokeSession.id,
                ip: pendingRevokeSession.ipAddress || t("common.labels.none"),
                userId: pendingRevokeSession.userId,
              })
            : undefined
        }
        footer={
          <div className="console-session-confirm-actions">
            <Button
              disabled={!canRevokeSession}
              loading={revokeSessionMutation.isPending}
              title={!canRevokeSession ? sessionPermissionDescription("session:revoke") : undefined}
              onClick={confirmRevokeSession}
            >
              {t("admin.sessions.actions.confirmRevoke")}
            </Button>
            <Button
              appearance="secondary"
              disabled={revokeSessionMutation.isPending}
              onClick={() => setPendingRevokeSession(null)}
            >
              {t("admin.sessions.actions.cancelRevoke")}
            </Button>
          </div>
        }
        open={Boolean(pendingRevokeSession)}
        title={t("admin.sessions.revoke.confirmTitle")}
        onOpenChange={(open) => {
          if (!open && !revokeSessionMutation.isPending) {
            setPendingRevokeSession(null);
          }
        }}
      />

      <div className="console-admin-stat-grid" aria-label={t("admin.sessions.summaryLabel")}>
        <SessionStatCard
          icon={<MonitorCheck size={19} />}
          label={t("admin.sessions.metrics.total")}
          value={
            pageData
              ? formatNumber(pageData.total, i18n.language)
              : fallbackValue(sessionsQuery.isLoading, t)
          }
        />
        <SessionStatCard
          icon={<Users size={19} />}
          label={t("admin.sessions.metrics.currentPage")}
          value={formatNumber(currentPageCount, i18n.language)}
        />
        <SessionStatCard
          icon={<Clock3 size={19} />}
          label={t("admin.sessions.metrics.active")}
          value={formatNumber(statusSummary.active, i18n.language)}
        />
        <SessionStatCard
          icon={<ShieldAlert size={19} />}
          label={t("admin.sessions.metrics.inactive")}
          value={formatNumber(statusSummary.inactive, i18n.language)}
        />
        <SessionStatCard
          icon={<Database size={19} />}
          label={t("admin.sessions.metrics.storage")}
          value={
            pageData
              ? storageStatusLabel(pageData.storageStatus, t)
              : fallbackValue(sessionsQuery.isLoading, t)
          }
        />
      </div>

      <section className="console-admin-panel">
        <header>
          <h2>{t("admin.sessions.filters.title")}</h2>
          <p>{t("admin.sessions.filters.description")}</p>
        </header>
        <form className="console-admin-filter-form" onSubmit={submitFilters}>
          <SelectField
            label={t("admin.sessions.filters.scope")}
            options={scopeOptions}
            value={draft.scope}
            onChange={(event) => updateDraft("scope", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.sessions.filters.keyword")}
            value={draft.keyword}
            onChange={(event) => updateDraft("keyword", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.sessions.filters.userId")}
            min={1}
            type="number"
            value={draft.userId}
            onChange={(event) => updateDraft("userId", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.sessions.filters.ipAddress")}
            value={draft.ipAddress}
            onChange={(event) => updateDraft("ipAddress", event.currentTarget.value)}
          />
          <SelectField
            label={t("admin.sessions.filters.status")}
            options={statusOptions}
            value={draft.status}
            onChange={(event) => updateDraft("status", event.currentTarget.value)}
          />
          <SelectField
            label={t("admin.sessions.filters.platform")}
            options={platformOptions}
            value={draft.clientType}
            onChange={(event) => updateDraft("clientType", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.sessions.filters.productCode")}
            value={draft.productCode}
            onChange={(event) => updateDraft("productCode", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.sessions.filters.pageSize")}
            max={100}
            min={1}
            type="number"
            value={draft.pageSize}
            onChange={(event) => updateDraft("pageSize", event.currentTarget.value)}
          />
          <div className="console-admin-filter-actions">
            <Button icon={<Search size={17} />} loading={sessionsQuery.isFetching} type="submit">
              {t("admin.sessions.actions.search")}
            </Button>
            <Button appearance="secondary" icon={<RotateCcw size={17} />} onClick={resetFilters}>
              {t("admin.sessions.actions.reset")}
            </Button>
          </div>
        </form>
      </section>

      <section className="console-admin-panel">
        <header className="console-admin-panel-header-row">
          <div>
            <h2>{t("admin.sessions.list.title")}</h2>
            <p>
              {t("admin.sessions.list.description", {
                count: pageData?.total ?? 0,
              })}
            </p>
          </div>
          <div className="console-admin-pager" aria-label={t("admin.sessions.pagination.label")}>
            <Button
              appearance="secondary"
              disabled={page <= 1 || sessionsQuery.isFetching}
              icon={<ChevronLeft size={17} />}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("admin.sessions.pagination.previous")}
            </Button>
            <span>
              {t("admin.sessions.pagination.pageStatus", {
                page,
                totalPages,
              })}
            </span>
            <Button
              appearance="secondary"
              disabled={page >= totalPages || sessionsQuery.isFetching}
              icon={<ChevronRight size={17} />}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {t("admin.sessions.pagination.next")}
            </Button>
          </div>
        </header>

        {sessionsQuery.isLoading ? (
          <TableSkeleton
            caption={t("admin.sessions.states.loadingDescription")}
            columns={8}
            rows={pageSize}
          />
        ) : pageData ? (
          <>
            {pageData.storageStatus === "persisted" ? null : (
              <StateBlock
                title={t("admin.sessions.states.storageUnavailableTitle")}
                description={t("admin.sessions.states.storageUnavailableDescription")}
              />
            )}
            <div className="console-session-table">
              <DataTable
                columns={sessionColumns}
                data={pageData.items}
                emptyLabel={t("admin.sessions.empty")}
              />
            </div>
          </>
        ) : (
          <StateBlock
            title={t("admin.sessions.states.emptyTitle")}
            description={t("admin.sessions.states.emptyDescription")}
          />
        )}
      </section>
    </section>
  );
}

type SessionStatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function SessionStatCard({ icon, label, value }: SessionStatCardProps) {
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

function normalizeFilters(draft: SessionFilterDraft): SessionFilters {
  return {
    clientType: trimmedOrUndefined(draft.clientType),
    desc: true,
    ipAddress: trimmedOrUndefined(draft.ipAddress),
    keyword: trimmedOrUndefined(draft.keyword),
    orderKey: "last_used_at",
    productCode: trimmedOrUndefined(draft.productCode),
    scope: draft.scope === "org" ? "org" : undefined,
    status: trimmedOrUndefined(draft.status),
    userId: parseID(draft.userId),
  };
}

function trimmedOrUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseID(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.trunc(parsed);
}

function parsePageSize(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultPageSize;
  }
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

function summarizeSessions(items: IAMSession[]) {
  return items.reduce(
    (summary, session) => {
      if (sessionStatus(session) === "active") {
        summary.active += 1;
      } else {
        summary.inactive += 1;
      }
      return summary;
    },
    { active: 0, inactive: 0 },
  );
}

function sessionStatus(session: IAMSession) {
  if (session.revokedAt) {
    return "revoked";
  }
  const expiresAt = Date.parse(session.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    return "expired";
  }
  return "active";
}

function sessionLastUsedAt(session: IAMSession) {
  return session.lastUsedAt || session.createdAt;
}

function isCurrentSession(session: IAMSession, currentSessionId: string | null) {
  return Boolean(currentSessionId && sameID(session.id, currentSessionId));
}

function sameID(left: number | string, right: number | string) {
  return String(left) === String(right);
}

function statusLabel(status: string, t: ReturnType<typeof useTranslation>["t"]) {
  if (status === "active" || status === "expired" || status === "revoked") {
    return t(`admin.sessions.status.${status}`);
  }
  return status;
}

function fallbackValue(loading: boolean, t: ReturnType<typeof useTranslation>["t"]) {
  return loading ? t("loading.app") : t("common.labels.none");
}

function storageStatusLabel(status: string, t: ReturnType<typeof useTranslation>["t"]) {
  if (status === "persisted") {
    return t("admin.sessions.storage.persisted");
  }
  if (status === "unavailable") {
    return t("admin.sessions.storage.unavailable");
  }
  return status || t("admin.sessions.storage.unknown");
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(
  value: string | null | undefined,
  locale: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
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
