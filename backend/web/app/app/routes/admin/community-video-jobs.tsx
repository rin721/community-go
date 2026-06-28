import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileVideo,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

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
  formatCommunityDate,
  formatCommunityNumber,
  normalizeCommunityLimit,
  sameCommunityID,
  truncateCommunityText,
  type CommunityNotice,
} from "~/features/community/admin-components";
import { communityApi, type CommunityVideoJobQuery } from "~/lib/api/community";
import { queryKeys } from "~/lib/api/query-keys";
import type { CommunityVideoJob } from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const defaultLimit = 48;
const emptyJobs: CommunityVideoJob[] = [];
const jobErrorCopy = {
  defaultTitle: "admin.community.videoJobs.states.errorTitle",
  permissionDescription: "admin.community.videoJobs.states.permissionDescription",
  permissionTitle: "admin.community.videoJobs.states.permissionTitle",
  storageUnavailableDescription: "admin.community.videoJobs.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.community.videoJobs.states.storageUnavailableTitle",
};

type JobFilterDraft = {
  limit: string;
  status: string;
};

const initialDraft: JobFilterDraft = {
  limit: String(defaultLimit),
  status: "",
};

export default function AdminCommunityVideoJobsRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);
  const [draft, setDraft] = useState<JobFilterDraft>(initialDraft);
  const [filters, setFilters] = useState<CommunityVideoJobQuery>({});
  const [limit, setLimit] = useState(defaultLimit);
  const [notice, setNotice] = useState<CommunityNotice | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedJobId = searchParams.get("jobId");

  const canReadJobs = hasSessionPermission(permissions, {
    code: "community_video:read",
    productCode: productCode || undefined,
    scope: "tenant",
  });
  const canRetryJobs = hasSessionPermission(permissions, {
    code: "community_video:retry",
    productCode: productCode || undefined,
    scope: "tenant",
  });

  const jobsQueryKey = queryKeys.community.videoJobs(i18n.language, { ...filters, limit });
  const jobsQuery = useQuery({
    enabled: canReadJobs,
    queryFn: ({ signal }) => communityApi.listVideoJobs({ ...filters, limit }, { signal }),
    queryKey: jobsQueryKey,
  });
  const selectedJobQuery = useQuery({
    enabled: canReadJobs && Boolean(selectedJobId),
    queryFn: ({ signal }) => communityApi.getVideoJob(selectedJobId || "", { signal }),
    queryKey: selectedJobId
      ? queryKeys.community.videoJob(i18n.language, selectedJobId)
      : queryKeys.community.videoJob(i18n.language, "__empty__"),
  });

  const retryMutation = useMutation({
    mutationFn: (job: CommunityVideoJob) => communityApi.retryVideoJob(job.id),
    onError: (error, job) => {
      setNotice({
        description: adminErrorDescription(error, t, jobErrorCopy),
        intent: "danger",
        title: t("admin.community.videoJobs.messages.retryFailedTitle", { id: job.id }),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.root });
    },
    onSuccess: (job) => {
      setNotice({
        description: t("admin.community.videoJobs.messages.retrySuccessDescription", {
          status: videoJobStatusLabel(job.status, t),
        }),
        title: t("admin.community.videoJobs.messages.retrySuccessTitle"),
      });
    },
  });

  const jobs = jobsQuery.data?.items.items ?? emptyJobs;
  const summary = useMemo(() => summarizeJobs(jobs), [jobs]);
  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { label: t("admin.community.videoJobs.filters.allStatuses"), value: "" },
      { label: t("admin.community.videoJobStatus.queued"), value: "queued" },
      { label: t("admin.community.videoJobStatus.running"), value: "running" },
      { label: t("admin.community.videoJobStatus.succeeded"), value: "succeeded" },
      { label: t("admin.community.videoJobStatus.failed"), value: "failed" },
      { label: t("admin.community.videoJobStatus.canceled"), value: "canceled" },
    ],
    [t],
  );

  const openJobDetail = useCallback((jobId: number | string) => {
    const next = new URLSearchParams(searchParams);
    next.set("jobId", String(jobId));
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const closeJobDetail = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("jobId");
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const columns = useMemo<ColumnDef<CommunityVideoJob>[]>(
    () => [
      {
        cell: ({ row }) => (
          <div className="console-community-identity">
            <strong>{row.original.id}</strong>
            <span>{row.original.submissionId}</span>
            {row.original.videoId ? <code className="console-audit-code">{row.original.videoId}</code> : null}
          </div>
        ),
        header: t("admin.community.videoJobs.columns.job"),
      },
      {
        cell: ({ row }) => (
          <span className="console-iam-status" data-status={row.original.status}>
            {videoJobStatusLabel(row.original.status, t)}
          </span>
        ),
        header: t("admin.community.videoJobs.columns.status"),
      },
      {
        cell: ({ row }) => `${row.original.progress}%`,
        header: t("admin.community.videoJobs.columns.progress"),
      },
      {
        cell: ({ row }) => (
          <div className="console-community-identity">
            <span>{row.original.provider}</span>
            <code className="console-audit-code">{row.original.outputStorageKey || row.original.inputStorageKey || "-"}</code>
          </div>
        ),
        header: t("admin.community.videoJobs.columns.storage"),
      },
      {
        cell: ({ row }) =>
          row.original.outputPublicUrl ? (
            <a href={row.original.outputPublicUrl} rel="noreferrer" target="_blank">
              {truncateCommunityText(row.original.outputPublicUrl, 64)}
            </a>
          ) : (
            <span className="console-iam-muted">{t("common.labels.none")}</span>
          ),
        header: t("admin.community.videoJobs.columns.output"),
      },
      {
        cell: ({ row }) =>
          row.original.errorMessage ? (
            <span title={row.original.errorMessage}>{truncateCommunityText(row.original.errorMessage, 96)}</span>
          ) : (
            <span className="console-iam-muted">{t("common.labels.none")}</span>
          ),
        header: t("admin.community.videoJobs.columns.error"),
      },
      {
        cell: ({ row }) => formatCommunityDate(row.original.createdAt, i18n.language, t("common.labels.none")),
        header: t("admin.community.videoJobs.columns.createdAt"),
      },
      {
        cell: ({ row }) => (
          <div className="console-community-row-actions">
            <Button
              appearance="secondary"
              icon={<Eye size={16} />}
              onClick={() => openJobDetail(row.original.id)}
            >
              {t("admin.community.videoJobs.actions.details")}
            </Button>
            <Button
              appearance="secondary"
              disabled={!canRetryJobs || row.original.status !== "failed"}
              icon={<RotateCw size={16} />}
              loading={retryMutation.isPending && sameCommunityID(retryMutation.variables?.id, row.original.id)}
              onClick={() => retryMutation.mutate(row.original)}
            >
              {t("admin.community.videoJobs.actions.retry")}
            </Button>
          </div>
        ),
        header: t("admin.community.videoJobs.columns.actions"),
      },
    ],
    [canRetryJobs, i18n.language, retryMutation, t, openJobDetail],
  );

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextLimit = normalizeCommunityLimit(draft.limit, defaultLimit);
    setLimit(nextLimit);
    setNotice(null);
    setFilters({ status: draft.status || undefined });
  };

  const resetFilters = () => {
    setDraft(initialDraft);
    setFilters({});
    setLimit(defaultLimit);
    setNotice(null);
  };

  return (
    <section className="console-admin-dashboard" aria-labelledby="admin-community-video-jobs-title">
      <div className="console-admin-page-header">
        <div>
          <Badge>{t("admin.community.videoJobs.badge")}</Badge>
          <h1 id="admin-community-video-jobs-title">{t("admin.community.videoJobs.title")}</h1>
          <p>{t("admin.community.videoJobs.description")}</p>
        </div>
        <Button appearance="secondary" icon={<RefreshCw size={17} />} loading={jobsQuery.isFetching} onClick={() => void jobsQuery.refetch()}>
          {t("admin.community.actions.refresh")}
        </Button>
      </div>

      {!canReadJobs ? (
        <StateBlock title={t("admin.community.videoJobs.states.permissionTitle")} description={t("admin.community.videoJobs.states.permissionDescription")} />
      ) : null}

      {jobsQuery.error ? (
        <StateBlock intent="danger" title={adminErrorTitle(jobsQuery.error, t, jobErrorCopy)} description={adminErrorDescription(jobsQuery.error, t, jobErrorCopy)} />
      ) : null}

      {notice ? <StateBlock description={notice.description} intent={notice.intent} title={notice.title} /> : null}

      <div className="console-admin-stat-grid" aria-label={t("admin.community.videoJobs.summaryLabel")}>
        <CommunityStatCard icon={<FileVideo size={19} />} label={t("admin.community.videoJobs.metrics.total")} value={formatCommunityNumber(jobs.length, i18n.language)} />
        <CommunityStatCard icon={<Clock3 size={19} />} label={t("admin.community.videoJobs.metrics.running")} value={formatCommunityNumber(summary.running, i18n.language)} />
        <CommunityStatCard icon={<CheckCircle2 size={19} />} label={t("admin.community.videoJobs.metrics.succeeded")} value={formatCommunityNumber(summary.succeeded, i18n.language)} />
        <CommunityStatCard icon={<XCircle size={19} />} label={t("admin.community.videoJobs.metrics.failed")} value={formatCommunityNumber(summary.failed, i18n.language)} />
      </div>

      <section className="console-admin-panel">
        <header>
          <h2>{t("admin.community.videoJobs.filters.title")}</h2>
          <p>{t("admin.community.videoJobs.filters.description")}</p>
        </header>
        <form className="console-admin-filter-form console-admin-filter-form--compact" onSubmit={submitFilters}>
          <SelectField
            label={t("admin.community.videoJobs.filters.status")}
            options={statusOptions}
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.currentTarget.value }))}
          />
          <FormField
            label={t("admin.community.filters.limit")}
            max={100}
            min={1}
            type="number"
            value={draft.limit}
            onChange={(event) => setDraft((current) => ({ ...current, limit: event.currentTarget.value }))}
          />
          <div className="console-admin-filter-actions">
            <Button icon={<Search size={17} />} loading={jobsQuery.isFetching} type="submit">
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
          <h2>{t("admin.community.videoJobs.list.title")}</h2>
          <p>{t("admin.community.videoJobs.list.description", { count: jobs.length })}</p>
        </header>
        {jobsQuery.isLoading ? (
          <TableSkeleton caption={t("admin.community.videoJobs.states.loadingDescription")} columns={8} rows={Math.min(limit, 8)} />
        ) : jobsQuery.data ? (
          <DataTable columns={columns} data={jobs} emptyLabel={t("admin.community.videoJobs.empty")} />
        ) : (
          <StateBlock title={t("admin.community.videoJobs.states.emptyTitle")} description={t("admin.community.videoJobs.states.emptyDescription")} />
        )}
      </section>

      {selectedJobId ? (
        <section className="console-admin-panel console-community-job-drawer" aria-labelledby="admin-community-video-job-detail-title">
          <header className="console-admin-panel-header-row">
            <div>
              <h2 id="admin-community-video-job-detail-title">{t("admin.community.videoJobs.detail.title")}</h2>
              <p>{t("admin.community.videoJobs.detail.description")}</p>
            </div>
            <Button appearance="ghost" icon={<XCircle size={16} />} onClick={closeJobDetail}>
              {t("common.actions.close")}
            </Button>
          </header>
          {selectedJobQuery.isLoading ? (
            <TableSkeleton caption={t("admin.community.videoJobs.detail.loading")} columns={2} rows={6} />
          ) : selectedJobQuery.error ? (
            <StateBlock
              intent="danger"
              title={adminErrorTitle(selectedJobQuery.error, t, jobErrorCopy)}
              description={adminErrorDescription(selectedJobQuery.error, t, jobErrorCopy)}
            />
          ) : selectedJobQuery.data ? (
            <VideoJobDetail job={selectedJobQuery.data} locale={i18n.language} noneLabel={t("common.labels.none")} t={t} />
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function summarizeJobs(jobs: CommunityVideoJob[]) {
  return jobs.reduce(
    (summary, job) => {
      if (job.status === "failed") summary.failed += 1;
      if (job.status === "running" || job.status === "queued") summary.running += 1;
      if (job.status === "succeeded") summary.succeeded += 1;
      return summary;
    },
    { failed: 0, running: 0, succeeded: 0 },
  );
}

function videoJobStatusLabel(status: string, t: (key: string) => string) {
  if (status === "failed") return t("admin.community.videoJobStatus.failed");
  if (status === "running") return t("admin.community.videoJobStatus.running");
  if (status === "succeeded") return t("admin.community.videoJobStatus.succeeded");
  if (status === "canceled") return t("admin.community.videoJobStatus.canceled");
  return t("admin.community.videoJobStatus.queued");
}

function VideoJobDetail({
  job,
  locale,
  noneLabel,
  t,
}: {
  job: CommunityVideoJob;
  locale: string;
  noneLabel: string;
  t: (key: string) => string;
}) {
  const primaryRows = [
    [t("admin.community.videoJobs.detail.fields.id"), job.id],
    [t("admin.community.videoJobs.detail.fields.status"), videoJobStatusLabel(job.status, t)],
    [t("admin.community.videoJobs.detail.fields.progress"), `${job.progress}%`],
    [t("admin.community.videoJobs.detail.fields.submissionId"), job.submissionId],
    [t("admin.community.videoJobs.detail.fields.videoId"), job.videoId],
    [t("admin.community.videoJobs.detail.fields.attempt"), `${job.attempt}/${job.maxAttempts}`],
    [t("admin.community.videoJobs.detail.fields.startedAt"), formatCommunityDate(job.startedAt, locale, noneLabel)],
    [t("admin.community.videoJobs.detail.fields.finishedAt"), formatCommunityDate(job.finishedAt, locale, noneLabel)],
    [t("admin.community.videoJobs.detail.fields.callbackReceivedAt"), formatCommunityDate(job.callbackReceivedAt, locale, noneLabel)],
    [t("admin.community.videoJobs.detail.fields.outputPublicUrl"), job.outputPublicUrl],
    [t("admin.community.videoJobs.detail.fields.failureCode"), job.failureCode],
    [t("admin.community.videoJobs.detail.fields.errorMessage"), job.errorMessage],
  ];
  const internalRows = [
    [t("admin.community.videoJobs.detail.fields.provider"), job.provider],
    [t("admin.community.videoJobs.detail.fields.providerJobId"), job.providerJobId],
    [t("admin.community.videoJobs.detail.fields.lockedBy"), job.lockedBy],
    [t("admin.community.videoJobs.detail.fields.lockedAt"), formatCommunityDate(job.lockedAt, locale, noneLabel)],
    [t("admin.community.videoJobs.detail.fields.heartbeatAt"), formatCommunityDate(job.heartbeatAt, locale, noneLabel)],
    [t("admin.community.videoJobs.detail.fields.nextRunAt"), formatCommunityDate(job.nextRunAt, locale, noneLabel)],
    [t("admin.community.videoJobs.detail.fields.inputStorageKey"), job.inputStorageKey],
    [t("admin.community.videoJobs.detail.fields.outputStorageKey"), job.outputStorageKey],
    [t("admin.community.videoJobs.detail.fields.requestPayload"), job.requestPayload],
  ];
  return (
    <div className="console-community-job-detail">
      <dl>
        {primaryRows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value ? String(value) : noneLabel}</dd>
          </div>
        ))}
      </dl>
      <div className="console-community-job-renditions">
        <h3>{t("admin.community.videoJobs.detail.renditions")}</h3>
        {job.renditions?.length ? (
          <ul>
            {job.renditions.map((rendition) => (
              <li key={rendition.id}>
                <strong>{rendition.qualityLabel}</strong>
                <span>
                  {rendition.width}x{rendition.height} / {rendition.bitrateKbps}kbps
                </span>
                <code className="console-audit-code">{rendition.playlistUrl}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="console-iam-muted">{noneLabel}</p>
        )}
      </div>
      <details className="console-community-job-internals">
        <summary>{t("admin.community.videoJobs.detail.internals")}</summary>
        <dl>
          {internalRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value ? String(value) : noneLabel}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
