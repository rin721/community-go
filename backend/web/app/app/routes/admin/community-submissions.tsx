import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  Clock3,
  FileVideo,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

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
import type {
  CommunityReviewSubmissionInput,
  CommunitySubmission,
  CommunitySubmissionStatus,
} from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const defaultLimit = 24;
const emptySubmissions: CommunitySubmission[] = [];
const submissionErrorCopy = {
  defaultTitle: "admin.community.submissions.states.errorTitle",
  permissionDescription: "admin.community.submissions.states.permissionDescription",
  permissionTitle: "admin.community.submissions.states.permissionTitle",
  storageUnavailableDescription: "admin.community.submissions.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.community.submissions.states.storageUnavailableTitle",
};

type SubmissionFilters = Pick<CommunityReviewQueueQuery, "status">;

type SubmissionFilterDraft = SubmissionFilters & {
  limit: string;
};

type SubmissionReviewInput = {
  input: CommunityReviewSubmissionInput;
  submission: CommunitySubmission;
};

const initialDraft: SubmissionFilterDraft = {
  limit: String(defaultLimit),
  status: "",
};

export default function AdminCommunitySubmissionsRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);
  const [draft, setDraft] = useState<SubmissionFilterDraft>(initialDraft);
  const [filters, setFilters] = useState<SubmissionFilters>({});
  const [limit, setLimit] = useState(defaultLimit);
  const [notice, setNotice] = useState<CommunityNotice | null>(null);

  const canReviewSubmissions = hasSessionPermission(permissions, {
    code: "community_submission:review",
    productCode: productCode || undefined,
    scope: "tenant",
  });
  const canTranscodeSubmissions = hasSessionPermission(permissions, {
    code: "community_video:transcode",
    productCode: productCode || undefined,
    scope: "tenant",
  });

  const submissionsQueryKey = queryKeys.community.submissions(i18n.language, {
    ...filters,
    limit,
  });
  const submissionsQuery = useQuery({
    enabled: canReviewSubmissions,
    queryFn: ({ signal }) => communityApi.listSubmissions({ ...filters, limit }, { signal }),
    queryKey: submissionsQueryKey,
  });

  const reviewSubmissionMutation = useMutation({
    mutationFn: ({ input, submission }: SubmissionReviewInput) =>
      communityApi.reviewSubmission(submission.id, input),
    onError: (error, review) => {
      setNotice({
        description: adminErrorDescription(error, t, submissionErrorCopy),
        intent: "danger",
        title: t("admin.community.submissions.messages.reviewFailedTitle", {
          title: review.submission.title,
        }),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.root });
    },
    onSuccess: (submission) => {
      setNotice({
        description: t("admin.community.submissions.messages.reviewSuccessDescription", {
          status: submissionStatusLabel(submission.status, t),
          title: submission.title,
        }),
        title: t("admin.community.submissions.messages.reviewSuccessTitle"),
      });
    },
  });

  const transcodeSubmissionMutation = useMutation({
    mutationFn: (submission: CommunitySubmission) =>
      communityApi.transcodeSubmission(submission.id, {}),
    onError: (error, submission) => {
      setNotice({
        description: adminErrorDescription(error, t, submissionErrorCopy),
        intent: "danger",
        title: t("admin.community.submissions.messages.createTranscodeFailedTitle", {
          title: submission.title,
        }),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.root });
    },
    onSuccess: (job) => {
      setNotice({
        description: t("admin.community.submissions.messages.createTranscodeSuccessDescription", {
          id: job.id,
          status: videoJobStatusLabel(job.status, t),
        }),
        title: t("admin.community.submissions.messages.createTranscodeSuccessTitle"),
      });
    },
  });

  const submissions = submissionsQuery.data?.items.items ?? emptySubmissions;
  const summary = useMemo(() => summarizeSubmissions(submissions), [submissions]);
  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { label: t("admin.community.submissions.filters.allStatuses"), value: "" },
      { label: t("admin.community.submissionStatus.pending_review"), value: "pending_review" },
      { label: t("admin.community.submissionStatus.approved"), value: "approved" },
      { label: t("admin.community.submissionStatus.rejected"), value: "rejected" },
      { label: t("admin.community.submissionStatus.published"), value: "published" },
    ],
    [t],
  );

  const columns = useMemo<ColumnDef<CommunitySubmission>[]>(
    () => [
      {
        cell: ({ row }) => (
          <div className="console-community-identity">
            <strong>{row.original.title}</strong>
            <span>{truncateCommunityText(row.original.description, 96)}</span>
            <code className="console-audit-code">{row.original.id}</code>
          </div>
        ),
        header: t("admin.community.submissions.columns.submission"),
      },
      {
        cell: ({ row }) => (
          <div className="console-community-identity">
            <strong>{row.original.authorName}</strong>
            <span>{row.original.categorySlug}</span>
          </div>
        ),
        header: t("admin.community.submissions.columns.author"),
      },
      {
        cell: ({ row }) => (
          <div className="console-community-identity">
            <span className="console-iam-status" data-status={row.original.status}>
              {submissionStatusLabel(row.original.status, t)}
            </span>
            {row.original.latestVideoJob ? (
              <Link
                to={`/admin/community/video-jobs?jobId=${encodeURIComponent(String(row.original.latestVideoJob.id))}`}
              >
                {videoJobStatusLabel(row.original.latestVideoJob.status, t)}
                {" · "}
                {row.original.latestVideoJob.progress}%
              </Link>
            ) : (
              <span className="console-iam-muted">
                {t("admin.community.submissions.columns.noVideoJob")}
              </span>
            )}
          </div>
        ),
        header: t("admin.community.submissions.columns.status"),
      },
      {
        cell: ({ row }) => (
          <div className="console-community-identity">
            <span>{row.original.sourceName}</span>
            <code className="console-audit-code">
              {formatBytes(row.original.sourceSize, i18n.language)} / {row.original.sourceType}
            </code>
          </div>
        ),
        header: t("admin.community.submissions.columns.source"),
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
        header: t("admin.community.submissions.columns.reviewNote"),
      },
      {
        cell: ({ row }) =>
          formatCommunityDate(row.original.createdAt, i18n.language, t("common.labels.none")),
        header: t("admin.community.submissions.columns.createdAt"),
      },
      {
        cell: ({ row }) => (
          <SubmissionReviewControls
            canReview={canReviewSubmissions}
            canTranscode={canTranscodeSubmissions}
            isSaving={
              reviewSubmissionMutation.isPending &&
              sameCommunityID(reviewSubmissionMutation.variables?.submission.id, row.original.id)
            }
            isTranscoding={
              transcodeSubmissionMutation.isPending &&
              sameCommunityID(transcodeSubmissionMutation.variables?.id, row.original.id)
            }
            permissionTitle={t("admin.community.submissions.states.permissionDescription")}
            submission={row.original}
            onReview={(input) => reviewSubmissionMutation.mutate(input)}
            onTranscode={(submission) => transcodeSubmissionMutation.mutate(submission)}
          />
        ),
        header: t("admin.community.submissions.columns.actions"),
      },
    ],
    [canReviewSubmissions, canTranscodeSubmissions, i18n.language, reviewSubmissionMutation, t, transcodeSubmissionMutation],
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

  const updateDraft = (key: keyof SubmissionFilterDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="console-admin-dashboard" aria-labelledby="admin-community-submissions-title">
      <div className="console-admin-page-header">
        <div>
          <Badge>{t("admin.community.submissions.badge")}</Badge>
          <h1 id="admin-community-submissions-title">{t("admin.community.submissions.title")}</h1>
          <p>{t("admin.community.submissions.description")}</p>
        </div>
        <Button
          appearance="secondary"
          icon={<RefreshCw size={17} />}
          loading={submissionsQuery.isFetching}
          onClick={() => void submissionsQuery.refetch()}
        >
          {t("admin.community.actions.refresh")}
        </Button>
      </div>

      {!canReviewSubmissions ? (
        <StateBlock
          title={t("admin.community.submissions.states.permissionTitle")}
          description={t("admin.community.submissions.states.permissionDescription")}
        />
      ) : null}

      {submissionsQuery.error ? (
        <StateBlock
          intent="danger"
          title={adminErrorTitle(submissionsQuery.error, t, submissionErrorCopy)}
          description={adminErrorDescription(submissionsQuery.error, t, submissionErrorCopy)}
        />
      ) : null}

      {notice ? (
        <StateBlock description={notice.description} intent={notice.intent} title={notice.title} />
      ) : null}

      <div
        className="console-admin-stat-grid"
        aria-label={t("admin.community.submissions.summaryLabel")}
      >
        <CommunityStatCard
          icon={<FileVideo size={19} />}
          label={t("admin.community.submissions.metrics.total")}
          value={formatCommunityNumber(submissions.length, i18n.language)}
        />
        <CommunityStatCard
          icon={<Clock3 size={19} />}
          label={t("admin.community.submissions.metrics.pending")}
          value={formatCommunityNumber(summary.pending, i18n.language)}
        />
        <CommunityStatCard
          icon={<CheckCircle2 size={19} />}
          label={t("admin.community.submissions.metrics.approved")}
          value={formatCommunityNumber(summary.approved, i18n.language)}
        />
        <CommunityStatCard
          icon={<XCircle size={19} />}
          label={t("admin.community.submissions.metrics.rejected")}
          value={formatCommunityNumber(summary.rejected, i18n.language)}
        />
      </div>

      <section className="console-admin-panel">
        <header>
          <h2>{t("admin.community.submissions.filters.title")}</h2>
          <p>{t("admin.community.submissions.filters.description")}</p>
        </header>
        <form className="console-admin-filter-form console-admin-filter-form--compact" onSubmit={submitFilters}>
          <SelectField
            label={t("admin.community.submissions.filters.status")}
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
            <Button icon={<Search size={17} />} loading={submissionsQuery.isFetching} type="submit">
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
          <h2>{t("admin.community.submissions.list.title")}</h2>
          <p>{t("admin.community.submissions.list.description", { count: submissions.length })}</p>
        </header>
        {submissionsQuery.isLoading ? (
          <TableSkeleton
            caption={t("admin.community.submissions.states.loadingDescription")}
            columns={7}
            rows={Math.min(limit, 8)}
          />
        ) : submissionsQuery.data ? (
          <DataTable
            columns={columns}
            data={submissions}
            emptyLabel={t("admin.community.submissions.empty")}
          />
        ) : (
          <StateBlock
            title={t("admin.community.submissions.states.emptyTitle")}
            description={t("admin.community.submissions.states.emptyDescription")}
          />
        )}
      </section>
    </section>
  );
}

type SubmissionReviewControlsProps = {
  canReview: boolean;
  canTranscode: boolean;
  isSaving: boolean;
  isTranscoding: boolean;
  onReview: (input: SubmissionReviewInput) => void;
  onTranscode: (submission: CommunitySubmission) => void;
  permissionTitle: string;
  submission: CommunitySubmission;
};

function SubmissionReviewControls({
  canReview,
  canTranscode,
  isSaving,
  isTranscoding,
  onReview,
  onTranscode,
  permissionTitle,
  submission,
}: SubmissionReviewControlsProps) {
  const { t } = useTranslation();
  const [reviewNote, setReviewNote] = useState("");
  const published = submission.status === "published";
  const disabled = !canReview || isSaving || published;
  const rejectDisabled = disabled || reviewNote.trim().length === 0;
  const hasActiveJob =
    submission.latestVideoJob?.status === "queued" || submission.latestVideoJob?.status === "running";
  const canCreateTranscodeJob =
    canTranscode && submission.status === "approved" && Boolean(submission.mediaAssetId) && !hasActiveJob;

  return (
    <div className="console-community-review-actions">
      <CommunityTextAreaField
        disabled={disabled}
        label={t("admin.community.submissions.controls.reviewNote")}
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
                status: "approved" as CommunitySubmissionStatus,
              },
              submission,
            })
          }
        >
          {t("admin.community.submissions.actions.approve")}
        </Button>
        <Button
          appearance="secondary"
          disabled={rejectDisabled}
          icon={<XCircle size={16} />}
          loading={isSaving}
          title={!canReview ? permissionTitle : undefined}
          onClick={() =>
            onReview({
              input: {
                reviewNote: reviewNote.trim(),
                status: "rejected" as CommunitySubmissionStatus,
              },
              submission,
            })
          }
        >
          {t("admin.community.submissions.actions.reject")}
        </Button>
        <Button
          appearance="secondary"
          disabled={!canCreateTranscodeJob || isTranscoding}
          icon={<FileVideo size={16} />}
          loading={isTranscoding}
          title={!canTranscode ? permissionTitle : undefined}
          onClick={() => onTranscode(submission)}
        >
          {t("admin.community.submissions.actions.createTranscodeJob")}
        </Button>
      </div>
    </div>
  );
}

function summarizeSubmissions(submissions: CommunitySubmission[]) {
  return submissions.reduce(
    (summary, submission) => {
      if (submission.status === "approved") {
        summary.approved += 1;
      } else if (submission.status === "rejected") {
        summary.rejected += 1;
      } else if (submission.status === "published") {
        summary.published += 1;
      } else {
        summary.pending += 1;
      }
      return summary;
    },
    { approved: 0, pending: 0, published: 0, rejected: 0 },
  );
}

function submissionStatusLabel(status: string, t: (key: string) => string) {
  if (status === "approved") {
    return t("admin.community.submissionStatus.approved");
  }
  if (status === "published") {
    return t("admin.community.submissionStatus.published");
  }
  if (status === "rejected") {
    return t("admin.community.submissionStatus.rejected");
  }
  return t("admin.community.submissionStatus.pending_review");
}

function videoJobStatusLabel(status: string, t: (key: string) => string) {
  if (status === "failed") {
    return t("admin.community.videoJobStatus.failed");
  }
  if (status === "running") {
    return t("admin.community.videoJobStatus.running");
  }
  if (status === "succeeded") {
    return t("admin.community.videoJobStatus.succeeded");
  }
  if (status === "canceled") {
    return t("admin.community.videoJobStatus.canceled");
  }
  return t("admin.community.videoJobStatus.queued");
}

function formatBytes(value: number | string, locale: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(size)} ${units[unitIndex]}`;
}
