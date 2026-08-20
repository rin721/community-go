import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
} from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "~/components/console/patterns/DataTable";
import { FormField } from "~/components/console/patterns/FormField";
import { TableSkeleton } from "~/components/console/patterns/LoadingSkeletons";
import { SelectField, type SelectOption } from "~/components/console/patterns/SelectField";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { adminErrorDescription, adminErrorTitle } from "~/features/admin/error-state";
import { iamApi, type IAMNotificationOutboxListQuery } from "~/lib/api/iam";
import { queryKeys } from "~/lib/api/query-keys";
import type { IAMNotificationOutboxItem } from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const defaultPageSize = 10;
const outboxErrorCopy = {
  defaultTitle: "admin.notificationOutbox.states.errorTitle",
  permissionDescription: "admin.notificationOutbox.states.permissionDescription",
  permissionTitle: "admin.notificationOutbox.states.permissionTitle",
  storageUnavailableDescription: "admin.notificationOutbox.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.notificationOutbox.states.storageUnavailableTitle",
};

type OutboxFilters = Pick<IAMNotificationOutboxListQuery, "kind" | "recipient" | "status">;

type OutboxFilterDraft = {
  kind: string;
  pageSize: string;
  recipient: string;
  status: string;
};

type OutboxNotice = {
  description: string;
  intent?: "danger" | "info";
  title: string;
};

const initialDraft: OutboxFilterDraft = {
  kind: "",
  pageSize: String(defaultPageSize),
  recipient: "",
  status: "",
};

export default function AdminNotificationOutboxRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);
  const [draft, setDraft] = useState<OutboxFilterDraft>(initialDraft);
  const [filters, setFilters] = useState<OutboxFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [notice, setNotice] = useState<OutboxNotice | null>(null);

  const canRetry = hasSessionPermission(permissions, {
    code: "notification:retry",
    productCode: productCode || undefined,
    scope: "platform",
  });

  const outboxQueryKey = queryKeys.iam.notificationOutbox(i18n.language, page, pageSize, filters);
  const outboxQuery = useQuery({
    queryFn: ({ signal }) =>
      iamApi.listNotificationOutbox({ ...filters, page, pageSize }, { signal }),
    queryKey: outboxQueryKey,
  });

  const retryMutation = useMutation({
    mutationFn: (item: IAMNotificationOutboxItem) => iamApi.retryNotificationOutbox(item.id),
    onError: (error, item) => {
      setNotice({
        description: adminErrorDescription(error, t, outboxErrorCopy),
        intent: "danger",
        title: t("admin.notificationOutbox.retry.errorTitle", { id: item.id }),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.iam.root });
    },
    onSuccess: (result) => {
      setNotice({
        description: t("admin.notificationOutbox.retry.successDescription", { id: result.id }),
        title: t("admin.notificationOutbox.retry.successTitle"),
      });
    },
  });

  const pageData = outboxQuery.data;
  const totalPages = Math.max(1, Math.ceil((pageData?.total ?? 0) / pageSize));
  const currentPageCount = pageData?.items.length ?? 0;
  const statusSummary = useMemo(() => summarizeStatus(pageData?.items ?? []), [pageData]);

  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { label: t("admin.notificationOutbox.filters.allStatuses"), value: "" },
      { label: t("admin.notificationOutbox.status.pending"), value: "pending" },
      { label: t("admin.notificationOutbox.status.failed"), value: "failed" },
      { label: t("admin.notificationOutbox.status.sent"), value: "sent" },
    ],
    [t],
  );

  const kindOptions = useMemo<SelectOption[]>(
    () => [
      { label: t("admin.notificationOutbox.filters.allKinds"), value: "" },
      { label: t("admin.notificationOutbox.kind.invitation"), value: "invitation" },
      { label: t("admin.notificationOutbox.kind.password_reset"), value: "password_reset" },
      { label: t("admin.notificationOutbox.kind.email_verification"), value: "email_verification" },
    ],
    [t],
  );

  const permissionDescription = useCallback(
    (code: string) => t("admin.notificationOutbox.states.writePermissionDescription", { code }),
    [t],
  );

  const columns = useMemo<ColumnDef<IAMNotificationOutboxItem>[]>(
    () => [
      {
        cell: ({ row }) => <code className="console-audit-code">{row.original.id}</code>,
        header: t("admin.notificationOutbox.columns.id"),
      },
      {
        cell: ({ row }) => notificationKindLabel(row.original.kind, t),
        header: t("admin.notificationOutbox.columns.kind"),
      },
      {
        accessorKey: "recipient",
        header: t("admin.notificationOutbox.columns.recipient"),
      },
      {
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <span className="console-iam-status" data-status={status}>
              {notificationStatusLabel(status, t)}
            </span>
          );
        },
        header: t("admin.notificationOutbox.columns.status"),
      },
      {
        cell: ({ row }) =>
          t("admin.notificationOutbox.labels.attempts", {
            attempts: row.original.attempts,
            maxAttempts: row.original.maxAttempts,
          }),
        header: t("admin.notificationOutbox.columns.attempts"),
      },
      {
        cell: ({ row }) => formatDate(row.original.nextAttemptAt, i18n.language, t),
        header: t("admin.notificationOutbox.columns.nextAttemptAt"),
      },
      {
        cell: ({ row }) =>
          row.original.lastError ? (
            <span title={row.original.lastError}>{truncateText(row.original.lastError, 96)}</span>
          ) : (
            <span className="console-iam-muted">{t("common.labels.none")}</span>
          ),
        header: t("admin.notificationOutbox.columns.lastError"),
      },
      {
        cell: ({ row }) => {
          const item = row.original;
          const disabled = !canRetry || item.status === "sent" || retryMutation.isPending;
          return (
            <Button
              appearance="secondary"
              disabled={disabled}
              icon={<Send size={16} />}
              loading={retryMutation.isPending && sameID(retryMutation.variables?.id, item.id)}
              title={!canRetry ? permissionDescription("notification:retry") : undefined}
              onClick={() => retryMutation.mutate(item)}
            >
              {t("admin.notificationOutbox.actions.retry")}
            </Button>
          );
        },
        header: t("admin.notificationOutbox.columns.actions"),
      },
    ],
    [canRetry, i18n.language, permissionDescription, retryMutation, t],
  );

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPageSize = normalizePageSize(draft.pageSize);
    setPageSize(nextPageSize);
    setPage(1);
    setNotice(null);
    setFilters({
      kind: draft.kind || undefined,
      recipient: draft.recipient.trim() || undefined,
      status: draft.status || undefined,
    });
  };

  const resetFilters = () => {
    setDraft(initialDraft);
    setFilters({});
    setPage(1);
    setPageSize(defaultPageSize);
    setNotice(null);
  };

  const updateDraft = (key: keyof OutboxFilterDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="console-admin-dashboard" aria-labelledby="admin-notification-outbox-title">
      <div className="console-admin-page-header">
        <div>
          <Badge>{t("admin.notificationOutbox.badge")}</Badge>
          <h1 id="admin-notification-outbox-title">{t("admin.notificationOutbox.title")}</h1>
          <p>{t("admin.notificationOutbox.description")}</p>
        </div>
        <Button
          appearance="secondary"
          icon={<RefreshCw size={17} />}
          loading={outboxQuery.isFetching}
          onClick={() => void outboxQuery.refetch()}
        >
          {t("admin.notificationOutbox.actions.refresh")}
        </Button>
      </div>

      {outboxQuery.error ? (
        <StateBlock
          intent="danger"
          title={adminErrorTitle(outboxQuery.error, t, outboxErrorCopy)}
          description={adminErrorDescription(outboxQuery.error, t, outboxErrorCopy)}
        />
      ) : null}

      {notice ? (
        <StateBlock description={notice.description} intent={notice.intent} title={notice.title} />
      ) : null}

      {!canRetry ? (
        <StateBlock
          title={t("admin.notificationOutbox.states.permissionTitle")}
          description={permissionDescription("notification:retry")}
        />
      ) : null}

      <div
        className="console-admin-stat-grid"
        aria-label={t("admin.notificationOutbox.summaryLabel")}
      >
        <OutboxStatCard
          icon={<Send size={19} />}
          label={t("admin.notificationOutbox.metrics.total")}
          value={
            pageData
              ? formatNumber(pageData.total, i18n.language)
              : fallbackValue(outboxQuery.isLoading, t)
          }
        />
        <OutboxStatCard
          icon={<Clock3 size={19} />}
          label={t("admin.notificationOutbox.metrics.currentPage")}
          value={formatNumber(currentPageCount, i18n.language)}
        />
        <OutboxStatCard
          icon={<Clock3 size={19} />}
          label={t("admin.notificationOutbox.metrics.pending")}
          value={formatNumber(statusSummary.pending, i18n.language)}
        />
        <OutboxStatCard
          icon={<AlertTriangle size={19} />}
          label={t("admin.notificationOutbox.metrics.failed")}
          value={formatNumber(statusSummary.failed, i18n.language)}
        />
        <OutboxStatCard
          icon={<CheckCircle2 size={19} />}
          label={t("admin.notificationOutbox.metrics.sent")}
          value={formatNumber(statusSummary.sent, i18n.language)}
        />
        <OutboxStatCard
          icon={<Database size={19} />}
          label={t("admin.notificationOutbox.metrics.storage")}
          value={
            pageData
              ? storageStatusLabel(pageData.storageStatus, t)
              : fallbackValue(outboxQuery.isLoading, t)
          }
        />
      </div>

      <section className="console-admin-panel">
        <header>
          <h2>{t("admin.notificationOutbox.filters.title")}</h2>
          <p>{t("admin.notificationOutbox.filters.description")}</p>
        </header>
        <form className="console-admin-filter-form" onSubmit={submitFilters}>
          <SelectField
            label={t("admin.notificationOutbox.filters.status")}
            options={statusOptions}
            value={draft.status}
            onChange={(event) => updateDraft("status", event.currentTarget.value)}
          />
          <SelectField
            label={t("admin.notificationOutbox.filters.kind")}
            options={kindOptions}
            value={draft.kind}
            onChange={(event) => updateDraft("kind", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.notificationOutbox.filters.recipient")}
            value={draft.recipient}
            onChange={(event) => updateDraft("recipient", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.notificationOutbox.filters.pageSize")}
            max={100}
            min={1}
            type="number"
            value={draft.pageSize}
            onChange={(event) => updateDraft("pageSize", event.currentTarget.value)}
          />
          <div className="console-admin-filter-actions">
            <Button icon={<Search size={17} />} loading={outboxQuery.isFetching} type="submit">
              {t("admin.notificationOutbox.actions.search")}
            </Button>
            <Button
              appearance="secondary"
              icon={<RotateCcw size={17} />}
              type="button"
              onClick={resetFilters}
            >
              {t("admin.notificationOutbox.actions.reset")}
            </Button>
          </div>
        </form>
      </section>

      <section className="console-admin-panel">
        <header className="console-admin-panel-header-row">
          <div>
            <h2>{t("admin.notificationOutbox.list.title")}</h2>
            <p>{t("admin.notificationOutbox.list.description", { count: pageData?.total ?? 0 })}</p>
          </div>
          <div
            className="console-admin-pager"
            aria-label={t("admin.notificationOutbox.pagination.label")}
          >
            <Button
              appearance="secondary"
              disabled={page <= 1 || outboxQuery.isFetching}
              icon={<ChevronLeft size={17} />}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("admin.notificationOutbox.pagination.previous")}
            </Button>
            <span>{t("admin.notificationOutbox.pagination.pageStatus", { page, totalPages })}</span>
            <Button
              appearance="secondary"
              disabled={page >= totalPages || outboxQuery.isFetching}
              icon={<ChevronRight size={17} />}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {t("admin.notificationOutbox.pagination.next")}
            </Button>
          </div>
        </header>

        {outboxQuery.isLoading ? (
          <TableSkeleton
            caption={t("admin.notificationOutbox.states.loadingDescription")}
            columns={8}
            rows={pageSize}
          />
        ) : pageData ? (
          <>
            {pageData.storageStatus === "persisted" ? null : (
              <StateBlock
                title={t("admin.notificationOutbox.states.storageUnavailableTitle")}
                description={t("admin.notificationOutbox.states.storageUnavailableDescription")}
              />
            )}
            <DataTable
              columns={columns}
              data={pageData.items}
              emptyLabel={t("admin.notificationOutbox.empty")}
            />
          </>
        ) : (
          <StateBlock
            title={t("admin.notificationOutbox.states.emptyTitle")}
            description={t("admin.notificationOutbox.states.emptyDescription")}
          />
        )}
      </section>
    </section>
  );
}

type OutboxStatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function OutboxStatCard({ icon, label, value }: OutboxStatCardProps) {
  return (
    <article className="console-admin-stat-card">
      <div className="console-admin-stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function summarizeStatus(items: IAMNotificationOutboxItem[]) {
  return items.reduce(
    (summary, item) => {
      if (item.status === "failed") {
        summary.failed += 1;
      } else if (item.status === "sent") {
        summary.sent += 1;
      } else {
        summary.pending += 1;
      }
      return summary;
    },
    { failed: 0, pending: 0, sent: 0 },
  );
}

function normalizePageSize(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return defaultPageSize;
  }
  return Math.min(parsed, 100);
}

function notificationKindLabel(kind: string, t: ReturnType<typeof useTranslation>["t"]) {
  return t(`admin.notificationOutbox.kind.${kind}`);
}

function notificationStatusLabel(status: string, t: ReturnType<typeof useTranslation>["t"]) {
  return t(`admin.notificationOutbox.status.${status}`);
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function fallbackValue(loading: boolean, t: ReturnType<typeof useTranslation>["t"]) {
  return loading ? t("common.states.loading") : t("common.labels.none");
}

function storageStatusLabel(status: string, t: ReturnType<typeof useTranslation>["t"]) {
  if (status === "persisted") {
    return t("admin.notificationOutbox.storage.persisted");
  }
  if (status === "unavailable") {
    return t("admin.notificationOutbox.storage.unavailable");
  }
  return status || t("admin.notificationOutbox.storage.unknown");
}

function stringifyID(value: unknown) {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return "";
}

function sameID(left: unknown, right: unknown) {
  return stringifyID(left) === stringifyID(right);
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1))}...`;
}
