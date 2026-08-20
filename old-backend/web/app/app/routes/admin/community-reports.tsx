import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  Clock3,
  Flag,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "~/components/console/patterns/DataTable";
import { FormField } from "~/components/console/patterns/FormField";
import { TableSkeleton } from "~/components/console/patterns/LoadingSkeletons";
import { SelectField, type SelectOption } from "~/components/console/patterns/SelectField";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { adminErrorDescription, adminErrorTitle } from "~/features/admin/error-state";
import {
  CommunityStatCard,
  CommunityTextAreaField,
  formatCommunityDate,
  formatCommunityNumber,
  normalizeCommunityLimit,
  sameCommunityID,
  truncateCommunityText,
  type CommunityNotice,
} from "~/features/community/admin-components";
import { communityApi, type CommunityReviewQueueQuery } from "~/lib/api/community";
import { queryKeys } from "~/lib/api/query-keys";
import type { CommunityReport, CommunityReviewReportInput } from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const defaultLimit = 24;
const emptyReports: CommunityReport[] = [];
const reportErrorCopy = {
  defaultTitle: "admin.community.reports.states.errorTitle",
  permissionDescription: "admin.community.reports.states.permissionDescription",
  permissionTitle: "admin.community.reports.states.permissionTitle",
  storageUnavailableDescription: "admin.community.reports.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.community.reports.states.storageUnavailableTitle",
};

type ReportFilters = Pick<CommunityReviewQueueQuery, "status">;

type ReportFilterDraft = ReportFilters & {
  limit: string;
};

type ReportReviewInput = {
  input: CommunityReviewReportInput;
  report: CommunityReport;
};

const initialDraft: ReportFilterDraft = {
  limit: String(defaultLimit),
  status: "",
};

export default function AdminCommunityReportsRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);
  const [draft, setDraft] = useState<ReportFilterDraft>(initialDraft);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [limit, setLimit] = useState(defaultLimit);
  const [notice, setNotice] = useState<CommunityNotice | null>(null);

  const canReviewReports = hasSessionPermission(permissions, {
    code: "community_report:review",
    productCode: productCode || undefined,
    scope: "tenant",
  });

  const reportsQueryKey = queryKeys.community.reports(i18n.language, { ...filters, limit });
  const reportsQuery = useQuery({
    enabled: canReviewReports,
    queryFn: ({ signal }) => communityApi.listReports({ ...filters, limit }, { signal }),
    queryKey: reportsQueryKey,
  });

  const reviewReportMutation = useMutation({
    mutationFn: ({ input, report }: ReportReviewInput) => communityApi.reviewReport(report.id, input),
    onError: (error, review) => {
      setNotice({
        description: adminErrorDescription(error, t, reportErrorCopy),
        intent: "danger",
        title: t("admin.community.reports.messages.reviewFailedTitle", {
          id: review.report.id,
        }),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.root });
    },
    onSuccess: (report) => {
      setNotice({
        description: t("admin.community.reports.messages.reviewSuccessDescription", {
          id: report.id,
          status: reportStatusLabel(report.status, t),
        }),
        title: t("admin.community.reports.messages.reviewSuccessTitle"),
      });
    },
  });

  const reports = reportsQuery.data?.items.items ?? emptyReports;
  const summary = useMemo(() => summarizeReports(reports), [reports]);
  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { label: t("admin.community.reports.filters.allStatuses"), value: "" },
      { label: t("admin.community.reportStatus.pending"), value: "pending" },
      { label: t("admin.community.reportStatus.resolved"), value: "resolved" },
      { label: t("admin.community.reportStatus.rejected"), value: "rejected" },
    ],
    [t],
  );

  const columns = useMemo<ColumnDef<CommunityReport>[]>(
    () => [
      {
        cell: ({ row }) => (
          <div className="console-community-identity">
            <strong>{targetLabel(row.original, t)}</strong>
            <code className="console-audit-code">{row.original.id}</code>
            <span>{row.original.clientId}</span>
          </div>
        ),
        header: t("admin.community.reports.columns.report"),
      },
      {
        cell: ({ row }) => (
          <span className="console-iam-status" data-status={row.original.status}>
            {reportStatusLabel(row.original.status, t)}
          </span>
        ),
        header: t("admin.community.reports.columns.status"),
      },
      {
        cell: ({ row }) => (
          <div className="console-community-identity">
            <strong>{reportReasonLabel(row.original.reason, t)}</strong>
            <span title={row.original.detail}>{truncateCommunityText(row.original.detail, 120)}</span>
          </div>
        ),
        header: t("admin.community.reports.columns.reason"),
      },
      {
        cell: ({ row }) =>
          row.original.reviewNote ? (
            <span title={row.original.reviewNote}>
              {truncateCommunityText(row.original.reviewNote, 80)}
            </span>
          ) : (
            <span className="console-iam-muted">{t("common.labels.none")}</span>
          ),
        header: t("admin.community.reports.columns.reviewNote"),
      },
      {
        cell: ({ row }) =>
          formatCommunityDate(row.original.createdAt, i18n.language, t("common.labels.none")),
        header: t("admin.community.reports.columns.createdAt"),
      },
      {
        cell: ({ row }) => (
          <ReportReviewControls
            canReview={canReviewReports}
            isSaving={
              reviewReportMutation.isPending &&
              sameCommunityID(reviewReportMutation.variables?.report.id, row.original.id)
            }
            permissionTitle={t("admin.community.reports.states.permissionDescription")}
            report={row.original}
            onReview={(input) => reviewReportMutation.mutate(input)}
          />
        ),
        header: t("admin.community.reports.columns.actions"),
      },
    ],
    [canReviewReports, i18n.language, reviewReportMutation, t],
  );

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextLimit = normalizeCommunityLimit(draft.limit, defaultLimit);
    setLimit(nextLimit);
    setNotice(null);
    setFilters({
      status: draft.status || undefined,
    });
  };

  const resetFilters = () => {
    setDraft(initialDraft);
    setFilters({});
    setLimit(defaultLimit);
    setNotice(null);
  };

  const updateDraft = (key: keyof ReportFilterDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="console-admin-dashboard" aria-labelledby="admin-community-reports-title">
      <div className="console-admin-page-header">
        <div>
          <Badge>{t("admin.community.reports.badge")}</Badge>
          <h1 id="admin-community-reports-title">{t("admin.community.reports.title")}</h1>
          <p>{t("admin.community.reports.description")}</p>
        </div>
        <Button
          appearance="secondary"
          icon={<RefreshCw size={17} />}
          loading={reportsQuery.isFetching}
          onClick={() => void reportsQuery.refetch()}
        >
          {t("admin.community.actions.refresh")}
        </Button>
      </div>

      {!canReviewReports ? (
        <StateBlock
          title={t("admin.community.reports.states.permissionTitle")}
          description={t("admin.community.reports.states.permissionDescription")}
        />
      ) : null}

      {reportsQuery.error ? (
        <StateBlock
          intent="danger"
          title={adminErrorTitle(reportsQuery.error, t, reportErrorCopy)}
          description={adminErrorDescription(reportsQuery.error, t, reportErrorCopy)}
        />
      ) : null}

      {notice ? (
        <StateBlock description={notice.description} intent={notice.intent} title={notice.title} />
      ) : null}

      <div className="console-admin-stat-grid" aria-label={t("admin.community.reports.summaryLabel")}>
        <CommunityStatCard
          icon={<Flag size={19} />}
          label={t("admin.community.reports.metrics.total")}
          value={formatCommunityNumber(reports.length, i18n.language)}
        />
        <CommunityStatCard
          icon={<Clock3 size={19} />}
          label={t("admin.community.reports.metrics.pending")}
          value={formatCommunityNumber(summary.pending, i18n.language)}
        />
        <CommunityStatCard
          icon={<CheckCircle2 size={19} />}
          label={t("admin.community.reports.metrics.resolved")}
          value={formatCommunityNumber(summary.resolved, i18n.language)}
        />
        <CommunityStatCard
          icon={<XCircle size={19} />}
          label={t("admin.community.reports.metrics.rejected")}
          value={formatCommunityNumber(summary.rejected, i18n.language)}
        />
      </div>

      <section className="console-admin-panel">
        <header>
          <h2>{t("admin.community.reports.filters.title")}</h2>
          <p>{t("admin.community.reports.filters.description")}</p>
        </header>
        <form className="console-admin-filter-form console-admin-filter-form--compact" onSubmit={submitFilters}>
          <SelectField
            label={t("admin.community.reports.filters.status")}
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
            <Button icon={<Search size={17} />} loading={reportsQuery.isFetching} type="submit">
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
          <h2>{t("admin.community.reports.list.title")}</h2>
          <p>{t("admin.community.reports.list.description", { count: reports.length })}</p>
        </header>
        {reportsQuery.isLoading ? (
          <TableSkeleton
            caption={t("admin.community.reports.states.loadingDescription")}
            columns={6}
            rows={Math.min(limit, 8)}
          />
        ) : reportsQuery.data ? (
          <DataTable
            columns={columns}
            data={reports}
            emptyLabel={t("admin.community.reports.empty")}
          />
        ) : (
          <StateBlock
            title={t("admin.community.reports.states.emptyTitle")}
            description={t("admin.community.reports.states.emptyDescription")}
          />
        )}
      </section>
    </section>
  );
}

type ReportReviewControlsProps = {
  canReview: boolean;
  isSaving: boolean;
  onReview: (input: ReportReviewInput) => void;
  permissionTitle: string;
  report: CommunityReport;
};

function ReportReviewControls({
  canReview,
  isSaving,
  onReview,
  permissionTitle,
  report,
}: ReportReviewControlsProps) {
  const { t } = useTranslation();
  const [reviewNote, setReviewNote] = useState("");
  const closed = report.status === "resolved" || report.status === "rejected";
  const disabled = !canReview || isSaving || closed;

  return (
    <div className="console-community-review-actions">
      <CommunityTextAreaField
        disabled={disabled}
        label={t("admin.community.reports.controls.reviewNote")}
        maxLength={720}
        rows={3}
        value={reviewNote}
        onChange={(event) => setReviewNote(event.currentTarget.value)}
      />
      <div className="console-community-row-actions">
        <Button
          appearance="secondary"
          disabled={disabled}
          icon={<ShieldCheck size={16} />}
          loading={isSaving}
          title={!canReview ? permissionTitle : undefined}
          onClick={() =>
            onReview({
              input: {
                reviewNote: reviewNote.trim(),
                status: "resolved" as CommunityReviewReportInput["status"],
              },
              report,
            })
          }
        >
          {t("admin.community.reports.actions.resolve")}
        </Button>
        <Button
          appearance="secondary"
          disabled={disabled}
          icon={<XCircle size={16} />}
          loading={isSaving}
          title={!canReview ? permissionTitle : undefined}
          onClick={() =>
            onReview({
              input: {
                reviewNote: reviewNote.trim(),
                status: "rejected" as CommunityReviewReportInput["status"],
              },
              report,
            })
          }
        >
          {t("admin.community.reports.actions.reject")}
        </Button>
      </div>
    </div>
  );
}

function summarizeReports(reports: CommunityReport[]) {
  return reports.reduce(
    (summary, report) => {
      if (report.status === "resolved") {
        summary.resolved += 1;
      } else if (report.status === "rejected") {
        summary.rejected += 1;
      } else {
        summary.pending += 1;
      }
      return summary;
    },
    { pending: 0, rejected: 0, resolved: 0 },
  );
}

function reportStatusLabel(status: string, t: (key: string) => string) {
  if (status === "resolved") {
    return t("admin.community.reportStatus.resolved");
  }
  if (status === "rejected") {
    return t("admin.community.reportStatus.rejected");
  }
  return t("admin.community.reportStatus.pending");
}

function reportReasonLabel(reason: string, t: (key: string) => string) {
  const knownKey = `admin.community.reportReason.${reason}`;
  const known = t(knownKey);
  return known === knownKey ? reason : known;
}

function targetLabel(report: CommunityReport, t: (key: string, options?: Record<string, unknown>) => string) {
  return t("admin.community.reports.labels.target", {
    id: report.targetId || report.videoId,
    kind: report.targetKind || "video",
  });
}
