import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileVideo,
  Flag,
  LayoutDashboard,
  ListTree,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { StateBlock } from "~/components/console/patterns/StateBlock";
import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { adminErrorDescription, adminErrorTitle } from "~/features/admin/error-state";
import { CommunityStatCard, formatCommunityNumber } from "~/features/community/admin-components";
import { communityApi } from "~/lib/api/community";
import { queryKeys } from "~/lib/api/query-keys";
import { systemApi } from "~/lib/api/system";
import type {
  CommunityAccount,
  CommunityReport,
  CommunitySubmission,
  CommunityVideoJob,
  SystemDictionaryItem,
} from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const overviewLimit = 48;
const communityCategoryDictionaryCode = "community.video.category";

const overviewErrorCopy = {
  defaultTitle: "admin.community.overview.states.errorTitle",
  permissionDescription: "admin.community.overview.states.permissionDescription",
  permissionTitle: "admin.community.overview.states.permissionTitle",
  storageUnavailableDescription: "admin.community.overview.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.community.overview.states.storageUnavailableTitle",
};

type OverviewCardProps = {
  actionLabel: string;
  description: string;
  disabledDescription: string;
  icon: ReactNode;
  isDisabled?: boolean;
  isLoading?: boolean;
  label: string;
  to: string;
  value: string;
};

export default function AdminCommunityOverviewRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);

  const canReadAccounts = hasSessionPermission(permissions, {
    code: "community_account:read",
    productCode: productCode || undefined,
    scope: "tenant",
  });
  const canReviewSubmissions = hasSessionPermission(permissions, {
    code: "community_submission:review",
    productCode: productCode || undefined,
    scope: "tenant",
  });
  const canReadJobs = hasSessionPermission(permissions, {
    code: "community_video:read",
    productCode: productCode || undefined,
    scope: "tenant",
  });
  const canReviewReports = hasSessionPermission(permissions, {
    code: "community_report:review",
    productCode: productCode || undefined,
    scope: "tenant",
  });
  const canReadDictionaries = hasSessionPermission(permissions, {
    code: "dictionary:read",
    productCode: productCode || undefined,
    scope: "platform",
  });

  const accountsQuery = useQuery({
    enabled: canReadAccounts,
    queryFn: ({ signal }) => communityApi.listAccounts({ limit: overviewLimit }, { signal }),
    queryKey: queryKeys.community.accounts(i18n.language, { limit: overviewLimit }),
  });
  const submissionsQuery = useQuery({
    enabled: canReviewSubmissions,
    queryFn: ({ signal }) => communityApi.listSubmissions({ limit: overviewLimit }, { signal }),
    queryKey: queryKeys.community.submissions(i18n.language, { limit: overviewLimit }),
  });
  const jobsQuery = useQuery({
    enabled: canReadJobs,
    queryFn: ({ signal }) => communityApi.listVideoJobs({ limit: overviewLimit }, { signal }),
    queryKey: queryKeys.community.videoJobs(i18n.language, { limit: overviewLimit }),
  });
  const reportsQuery = useQuery({
    enabled: canReviewReports,
    queryFn: ({ signal }) => communityApi.listReports({ limit: overviewLimit }, { signal }),
    queryKey: queryKeys.community.reports(i18n.language, { limit: overviewLimit }),
  });
  const dictionariesQuery = useQuery({
    enabled: canReadDictionaries,
    queryFn: ({ signal }) => systemApi.listDictionaries({ signal }),
    queryKey: queryKeys.system.dictionaries(i18n.language),
  });

  const accounts = accountsQuery.data?.items.items ?? [];
  const submissions = submissionsQuery.data?.items.items ?? [];
  const jobs = jobsQuery.data?.items.items ?? [];
  const reports = reportsQuery.data?.items.items ?? [];
  const categories =
    dictionariesQuery.data?.items.find((item) => item.code === communityCategoryDictionaryCode)
      ?.items ?? [];

  const accountSummary = useMemo(() => summarizeAccounts(accounts), [accounts]);
  const submissionSummary = useMemo(() => summarizeSubmissions(submissions), [submissions]);
  const jobSummary = useMemo(() => summarizeJobs(jobs), [jobs]);
  const reportSummary = useMemo(() => summarizeReports(reports), [reports]);
  const categorySummary = useMemo(() => summarizeCategories(categories), [categories]);
  const hasAnyPermission =
    canReadAccounts || canReviewSubmissions || canReadJobs || canReviewReports || canReadDictionaries;
  const isRefreshing =
    accountsQuery.isFetching ||
    submissionsQuery.isFetching ||
    jobsQuery.isFetching ||
    reportsQuery.isFetching ||
    dictionariesQuery.isFetching;
  const overviewErrors = [
    accountsQuery.error,
    submissionsQuery.error,
    jobsQuery.error,
    reportsQuery.error,
    dictionariesQuery.error,
  ].filter(Boolean);

  const refreshOverview = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.community.root });
    void queryClient.invalidateQueries({ queryKey: queryKeys.system.dictionaries(i18n.language) });
  };

  return (
    <section className="console-admin-dashboard" aria-labelledby="admin-community-overview-title">
      <div className="console-admin-page-header">
        <div>
          <Badge>{t("admin.community.overview.badge")}</Badge>
          <h1 id="admin-community-overview-title">{t("admin.community.overview.title")}</h1>
          <p>{t("admin.community.overview.description")}</p>
        </div>
        <Button appearance="secondary" icon={<RefreshCw size={17} />} loading={isRefreshing} onClick={refreshOverview}>
          {t("admin.community.actions.refresh")}
        </Button>
      </div>

      {!hasAnyPermission ? (
        <StateBlock
          title={t("admin.community.overview.states.permissionTitle")}
          description={t("admin.community.overview.states.permissionDescription")}
        />
      ) : null}

      {overviewErrors.length ? (
        <StateBlock
          intent="danger"
          title={adminErrorTitle(overviewErrors[0], t, overviewErrorCopy)}
          description={adminErrorDescription(overviewErrors[0], t, overviewErrorCopy)}
        />
      ) : null}

      <div className="console-admin-stat-grid" aria-label={t("admin.community.overview.summaryLabel")}>
        <CommunityStatCard
          icon={<ClipboardCheck size={19} />}
          label={t("admin.community.overview.metrics.pendingSubmissions")}
          value={formatCommunityNumber(submissionSummary.pending, i18n.language)}
        />
        <CommunityStatCard
          icon={<FileVideo size={19} />}
          label={t("admin.community.overview.metrics.runningJobs")}
          value={formatCommunityNumber(jobSummary.running, i18n.language)}
        />
        <CommunityStatCard
          icon={<AlertTriangle size={19} />}
          label={t("admin.community.overview.metrics.failedJobs")}
          value={formatCommunityNumber(jobSummary.failed, i18n.language)}
        />
        <CommunityStatCard
          icon={<Flag size={19} />}
          label={t("admin.community.overview.metrics.pendingReports")}
          value={formatCommunityNumber(reportSummary.pending, i18n.language)}
        />
      </div>

      <div className="console-community-overview-grid">
        <OverviewCard
          actionLabel={t("admin.community.overview.cards.accounts.action")}
          description={t("admin.community.overview.cards.accounts.description", {
            active: formatCommunityNumber(accountSummary.active, i18n.language),
            creators: formatCommunityNumber(accountSummary.creators, i18n.language),
          })}
          disabledDescription={t("admin.community.overview.cards.accounts.permission")}
          icon={<UsersRound size={20} />}
          isDisabled={!canReadAccounts}
          isLoading={accountsQuery.isLoading}
          label={t("admin.community.overview.cards.accounts.title")}
          to="/admin/community/accounts"
          value={formatCommunityNumber(accounts.length, i18n.language)}
        />
        <OverviewCard
          actionLabel={t("admin.community.overview.cards.submissions.action")}
          description={t("admin.community.overview.cards.submissions.description", {
            approved: formatCommunityNumber(submissionSummary.approved, i18n.language),
            pending: formatCommunityNumber(submissionSummary.pending, i18n.language),
          })}
          disabledDescription={t("admin.community.overview.cards.submissions.permission")}
          icon={<ClipboardCheck size={20} />}
          isDisabled={!canReviewSubmissions}
          isLoading={submissionsQuery.isLoading}
          label={t("admin.community.overview.cards.submissions.title")}
          to="/admin/community/submissions"
          value={formatCommunityNumber(submissions.length, i18n.language)}
        />
        <OverviewCard
          actionLabel={t("admin.community.overview.cards.jobs.action")}
          description={t("admin.community.overview.cards.jobs.description", {
            failed: formatCommunityNumber(jobSummary.failed, i18n.language),
            running: formatCommunityNumber(jobSummary.running, i18n.language),
          })}
          disabledDescription={t("admin.community.overview.cards.jobs.permission")}
          icon={<FileVideo size={20} />}
          isDisabled={!canReadJobs}
          isLoading={jobsQuery.isLoading}
          label={t("admin.community.overview.cards.jobs.title")}
          to="/admin/community/video-jobs"
          value={formatCommunityNumber(jobs.length, i18n.language)}
        />
        <OverviewCard
          actionLabel={t("admin.community.overview.cards.reports.action")}
          description={t("admin.community.overview.cards.reports.description", {
            pending: formatCommunityNumber(reportSummary.pending, i18n.language),
            resolved: formatCommunityNumber(reportSummary.resolved, i18n.language),
          })}
          disabledDescription={t("admin.community.overview.cards.reports.permission")}
          icon={<Flag size={20} />}
          isDisabled={!canReviewReports}
          isLoading={reportsQuery.isLoading}
          label={t("admin.community.overview.cards.reports.title")}
          to="/admin/community/reports"
          value={formatCommunityNumber(reports.length, i18n.language)}
        />
        <OverviewCard
          actionLabel={t("admin.community.overview.cards.categories.action")}
          description={t("admin.community.overview.cards.categories.description", {
            active: formatCommunityNumber(categorySummary.active, i18n.language),
            disabled: formatCommunityNumber(categorySummary.disabled, i18n.language),
          })}
          disabledDescription={t("admin.community.overview.cards.categories.permission")}
          icon={<ListTree size={20} />}
          isDisabled={!canReadDictionaries}
          isLoading={dictionariesQuery.isLoading}
          label={t("admin.community.overview.cards.categories.title")}
          to="/admin/community/categories"
          value={formatCommunityNumber(categories.length, i18n.language)}
        />
        <article className="console-community-overview-card console-community-overview-card--wide">
          <div className="console-community-overview-card__title">
            <span aria-hidden="true">
              <LayoutDashboard size={20} />
            </span>
            <div>
              <h2>{t("admin.community.overview.cards.workflow.title")}</h2>
              <p>{t("admin.community.overview.cards.workflow.description")}</p>
            </div>
          </div>
          <ol className="console-community-overview-flow" aria-label={t("admin.community.overview.cards.workflow.aria")}>
            <li>
              <CheckCircle2 size={16} />
              <span>{t("admin.community.overview.cards.workflow.review")}</span>
            </li>
            <li>
              <FileVideo size={16} />
              <span>{t("admin.community.overview.cards.workflow.transcode")}</span>
            </li>
            <li>
              <Flag size={16} />
              <span>{t("admin.community.overview.cards.workflow.report")}</span>
            </li>
          </ol>
        </article>
      </div>
    </section>
  );
}

function OverviewCard({
  actionLabel,
  description,
  disabledDescription,
  icon,
  isDisabled,
  isLoading,
  label,
  to,
  value,
}: OverviewCardProps) {
  return (
    <article className="console-community-overview-card" data-disabled={isDisabled || undefined}>
      <div className="console-community-overview-card__title">
        <span aria-hidden="true">{icon}</span>
        <h2>{label}</h2>
      </div>
      <strong>{isDisabled ? "-" : isLoading ? "..." : value}</strong>
      <p>{isDisabled ? disabledDescription : description}</p>
      {isDisabled ? (
        <Button appearance="secondary" disabled>
          {actionLabel}
        </Button>
      ) : (
        <Button appearance="secondary" asChild>
          <Link to={to}>{actionLabel}</Link>
        </Button>
      )}
    </article>
  );
}

function summarizeAccounts(accounts: CommunityAccount[]) {
  return accounts.reduce(
    (summary, account) => {
      if (account.status === "active") summary.active += 1;
      if (account.role === "creator") summary.creators += 1;
      return summary;
    },
    { active: 0, creators: 0 },
  );
}

function summarizeSubmissions(submissions: CommunitySubmission[]) {
  return submissions.reduce(
    (summary, submission) => {
      if (submission.status === "pending_review") summary.pending += 1;
      if (submission.status === "approved") summary.approved += 1;
      return summary;
    },
    { approved: 0, pending: 0 },
  );
}

function summarizeJobs(jobs: CommunityVideoJob[]) {
  return jobs.reduce(
    (summary, job) => {
      if (job.status === "failed") summary.failed += 1;
      if (job.status === "queued" || job.status === "running") summary.running += 1;
      return summary;
    },
    { failed: 0, running: 0 },
  );
}

function summarizeReports(reports: CommunityReport[]) {
  return reports.reduce(
    (summary, report) => {
      if (report.status === "pending") summary.pending += 1;
      if (report.status === "resolved") summary.resolved += 1;
      return summary;
    },
    { pending: 0, resolved: 0 },
  );
}

function summarizeCategories(categories: SystemDictionaryItem[]) {
  return categories.reduce(
    (summary, category) => {
      if (category.status === "disabled") {
        summary.disabled += 1;
      } else {
        summary.active += 1;
      }
      return summary;
    },
    { active: 0, disabled: 0 },
  );
}
