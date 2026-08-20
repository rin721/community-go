import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  ListChecks,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "~/components/console/patterns/DataTable";
import { FormField } from "~/components/console/patterns/FormField";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { adminErrorDescription, adminErrorTitle } from "~/features/admin/error-state";
import {
  announcementsApi,
  type AnnouncementInput,
  type AnnouncementListQuery,
} from "~/lib/api/announcements";
import { queryKeys } from "~/lib/api/query-keys";
import type { Announcement } from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const defaultPageSize = 10;
const emptyAnnouncements: Announcement[] = [];
const announcementErrorCopy = {
  defaultTitle: "admin.announcements.states.errorTitle",
  permissionDescription: "admin.announcements.states.permissionDescription",
  permissionTitle: "admin.announcements.states.permissionTitle",
  storageUnavailableDescription: "admin.announcements.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.announcements.states.storageUnavailableTitle",
};

type AnnouncementFilters = Pick<
  AnnouncementListQuery,
  "endCreatedAt" | "keyword" | "startCreatedAt" | "status"
>;

type AnnouncementFilterDraft = AnnouncementFilters & {
  pageSize: string;
};

type AnnouncementDraft = {
  content: string;
  status: "archived" | "draft" | "published";
  summary: string;
  title: string;
};

type AnnouncementNotice = {
  description: string;
  intent?: "danger" | "info";
  title: string;
};

const initialFilterDraft: AnnouncementFilterDraft = {
  endCreatedAt: "",
  keyword: "",
  pageSize: String(defaultPageSize),
  startCreatedAt: "",
  status: "",
};

const emptyAnnouncementDraft: AnnouncementDraft = {
  content: "",
  status: "draft",
  summary: "",
  title: "",
};

export default function AdminAnnouncementsRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);
  const [filterDraft, setFilterDraft] = useState<AnnouncementFilterDraft>(initialFilterDraft);
  const [filters, setFilters] = useState<AnnouncementFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [announcementDraft, setAnnouncementDraft] =
    useState<AnnouncementDraft>(emptyAnnouncementDraft);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [notice, setNotice] = useState<AnnouncementNotice | null>(null);
  const canCreateAnnouncement = hasSessionPermission(permissions, {
    code: "announcement:create",
    productCode: productCode || undefined,
  });
  const canUpdateAnnouncement = hasSessionPermission(permissions, {
    code: "announcement:update",
    productCode: productCode || undefined,
  });
  const canDeleteAnnouncement = hasSessionPermission(permissions, {
    code: "announcement:delete",
    productCode: productCode || undefined,
  });

  const announcementsQuery = useQuery({
    queryFn: ({ signal }) =>
      announcementsApi.listAnnouncements({ ...filters, page, pageSize }, { signal }),
    queryKey: queryKeys.announcements.list(i18n.language, page, pageSize, filters),
  });

  const invalidateAnnouncements = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.announcements.root });

  const createAnnouncementMutation = useMutation({
    mutationFn: (input: AnnouncementInput) => announcementsApi.createAnnouncement(input),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, announcementErrorCopy),
        intent: "danger",
        title: t("admin.announcements.messages.saveFailedTitle"),
      });
    },
    onSuccess: (announcement) => {
      closeAnnouncementForm();
      setNotice({
        description: t("admin.announcements.messages.createdDescription", {
          title: announcement.title,
        }),
        title: t("admin.announcements.messages.createdTitle"),
      });
      void invalidateAnnouncements();
    },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: (input: { id: number | string; value: AnnouncementInput }) =>
      announcementsApi.updateAnnouncement(input.id, input.value),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, announcementErrorCopy),
        intent: "danger",
        title: t("admin.announcements.messages.saveFailedTitle"),
      });
    },
    onSuccess: (announcement) => {
      closeAnnouncementForm();
      setNotice({
        description: t("admin.announcements.messages.updatedDescription", {
          title: announcement.title,
        }),
        title: t("admin.announcements.messages.updatedTitle"),
      });
      void invalidateAnnouncements();
    },
  });

  const publishAnnouncementMutation = useMutation({
    mutationFn: (announcement: Announcement) =>
      announcementsApi.publishAnnouncement(announcement.id),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, announcementErrorCopy),
        intent: "danger",
        title: t("admin.announcements.messages.publishFailedTitle"),
      });
    },
    onSuccess: (announcement) => {
      setNotice({
        description: t("admin.announcements.messages.publishedDescription", {
          title: announcement.title,
        }),
        title: t("admin.announcements.messages.publishedTitle"),
      });
      void invalidateAnnouncements();
    },
  });

  const archiveAnnouncementMutation = useMutation({
    mutationFn: (announcement: Announcement) =>
      announcementsApi.archiveAnnouncement(announcement.id),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, announcementErrorCopy),
        intent: "danger",
        title: t("admin.announcements.messages.archiveFailedTitle"),
      });
    },
    onSuccess: (announcement) => {
      setNotice({
        description: t("admin.announcements.messages.archivedDescription", {
          title: announcement.title,
        }),
        title: t("admin.announcements.messages.archivedTitle"),
      });
      void invalidateAnnouncements();
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (announcement: Announcement) =>
      announcementsApi.deleteAnnouncement(announcement.id),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, announcementErrorCopy),
        intent: "danger",
        title: t("admin.announcements.messages.deleteFailedTitle"),
      });
    },
    onSuccess: (_result, announcement) => {
      setPendingDelete(null);
      if (editingAnnouncementId === announcementIdValue(announcement)) {
        closeAnnouncementForm();
      }
      setNotice({
        description: t("admin.announcements.messages.deletedDescription", {
          title: announcement.title,
        }),
        title: t("admin.announcements.messages.deletedTitle"),
      });
      void invalidateAnnouncements();
    },
  });

  const pageData = announcementsQuery.data;
  const announcements = pageData?.items ?? emptyAnnouncements;
  const totalPages = Math.max(1, Math.ceil((pageData?.total ?? 0) / pageSize));
  const currentPageCount = announcements.length;
  const storagePersisted = pageData?.storageStatus === "persisted";
  const writePending =
    createAnnouncementMutation.isPending ||
    updateAnnouncementMutation.isPending ||
    publishAnnouncementMutation.isPending ||
    archiveAnnouncementMutation.isPending ||
    deleteAnnouncementMutation.isPending;
  const draftValid = Boolean(announcementDraft.title.trim() && announcementDraft.content.trim());
  const formWritable = formMode === "edit" ? canUpdateAnnouncement : canCreateAnnouncement;

  const announcementPermissionDescription = useCallback(
    (permission: string) =>
      t("admin.announcements.states.writePermissionDescription", {
        permission,
      }),
    [t],
  );

  const setAnnouncementPermissionNotice = useCallback(
    (permission: string) => {
      setNotice({
        description: announcementPermissionDescription(permission),
        intent: "danger",
        title: t("admin.announcements.states.permissionTitle"),
      });
    },
    [announcementPermissionDescription, t],
  );

  const startEdit = useCallback(
    (announcement: Announcement) => {
      if (!canUpdateAnnouncement || !storagePersisted || writePending) {
        if (!canUpdateAnnouncement) {
          setAnnouncementPermissionNotice("announcement:update");
        }
        return;
      }
      setFormMode("edit");
      setEditingAnnouncementId(announcementIdValue(announcement));
      setAnnouncementDraft({
        content: announcement.content,
        status: normalizeDraftStatus(announcement.status),
        summary: announcement.summary ?? "",
        title: announcement.title,
      });
      setPendingDelete(null);
    },
    [canUpdateAnnouncement, setAnnouncementPermissionNotice, storagePersisted, writePending],
  );

  const publishAnnouncement = useCallback(
    (announcement: Announcement) => {
      if (!canUpdateAnnouncement || !storagePersisted || writePending) {
        if (!canUpdateAnnouncement) {
          setAnnouncementPermissionNotice("announcement:update");
        }
        return;
      }
      publishAnnouncementMutation.mutate(announcement);
    },
    [
      canUpdateAnnouncement,
      publishAnnouncementMutation,
      setAnnouncementPermissionNotice,
      storagePersisted,
      writePending,
    ],
  );

  const archiveAnnouncement = useCallback(
    (announcement: Announcement) => {
      if (!canUpdateAnnouncement || !storagePersisted || writePending) {
        if (!canUpdateAnnouncement) {
          setAnnouncementPermissionNotice("announcement:update");
        }
        return;
      }
      archiveAnnouncementMutation.mutate(announcement);
    },
    [
      archiveAnnouncementMutation,
      canUpdateAnnouncement,
      setAnnouncementPermissionNotice,
      storagePersisted,
      writePending,
    ],
  );

  const openDelete = useCallback(
    (announcement: Announcement) => {
      if (!canDeleteAnnouncement || !storagePersisted || writePending) {
        if (!canDeleteAnnouncement) {
          setAnnouncementPermissionNotice("announcement:delete");
        }
        return;
      }
      setPendingDelete(announcement);
    },
    [canDeleteAnnouncement, setAnnouncementPermissionNotice, storagePersisted, writePending],
  );

  const columns = useMemo<ColumnDef<Announcement>[]>(
    () => [
      {
        accessorKey: "title",
        cell: ({ row }) => (
          <div className="console-announcement-title">
            <strong>{row.original.title}</strong>
            <span>{row.original.id}</span>
          </div>
        ),
        header: t("admin.announcements.columns.title"),
      },
      {
        accessorKey: "status",
        cell: ({ row }) => (
          <Badge className="console-announcement-status" data-status={row.original.status}>
            {statusLabel(row.original.status, t)}
          </Badge>
        ),
        header: t("admin.announcements.columns.status"),
      },
      {
        accessorKey: "summary",
        cell: ({ row }) => {
          const value = row.original.summary?.trim() ?? "";
          return value || t("common.labels.none");
        },
        header: t("admin.announcements.columns.summary"),
      },
      {
        accessorKey: "createdAt",
        cell: ({ row }) => formatDate(row.original.createdAt, i18n.language),
        header: t("admin.announcements.columns.createdAt"),
      },
      {
        accessorKey: "updatedAt",
        cell: ({ row }) => formatDate(row.original.updatedAt, i18n.language),
        header: t("admin.announcements.columns.updatedAt"),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="console-announcement-actions">
            <Button
              appearance="secondary"
              aria-label={t("admin.announcements.actions.editFor", {
                title: row.original.title,
              })}
              disabled={!canUpdateAnnouncement || !storagePersisted || writePending}
              icon={<Pencil size={15} />}
              onClick={() => startEdit(row.original)}
              title={
                canUpdateAnnouncement
                  ? undefined
                  : announcementPermissionDescription("announcement:update")
              }
            >
              {t("admin.announcements.actions.edit")}
            </Button>
            <Button
              appearance="secondary"
              aria-label={t("admin.announcements.actions.publishFor", {
                title: row.original.title,
              })}
              disabled={
                !canUpdateAnnouncement ||
                !storagePersisted ||
                writePending ||
                row.original.status === "published"
              }
              icon={<Send size={15} />}
              onClick={() => publishAnnouncement(row.original)}
              title={
                canUpdateAnnouncement || row.original.status === "published"
                  ? undefined
                  : announcementPermissionDescription("announcement:update")
              }
            >
              {t("admin.announcements.actions.publish")}
            </Button>
            <Button
              appearance="secondary"
              aria-label={t("admin.announcements.actions.archiveFor", {
                title: row.original.title,
              })}
              disabled={
                !canUpdateAnnouncement ||
                !storagePersisted ||
                writePending ||
                row.original.status === "archived"
              }
              icon={<Archive size={15} />}
              onClick={() => archiveAnnouncement(row.original)}
              title={
                canUpdateAnnouncement || row.original.status === "archived"
                  ? undefined
                  : announcementPermissionDescription("announcement:update")
              }
            >
              {t("admin.announcements.actions.archive")}
            </Button>
            <Button
              appearance="ghost"
              aria-label={t("admin.announcements.actions.deleteFor", {
                title: row.original.title,
              })}
              disabled={!canDeleteAnnouncement || !storagePersisted || writePending}
              icon={<Trash2 size={15} />}
              onClick={() => openDelete(row.original)}
              title={
                canDeleteAnnouncement
                  ? undefined
                  : announcementPermissionDescription("announcement:delete")
              }
            >
              {t("admin.announcements.actions.delete")}
            </Button>
          </div>
        ),
        header: t("admin.announcements.columns.actions"),
      },
    ],
    [
      announcementPermissionDescription,
      archiveAnnouncement,
      canDeleteAnnouncement,
      canUpdateAnnouncement,
      i18n.language,
      openDelete,
      publishAnnouncement,
      startEdit,
      storagePersisted,
      t,
      writePending,
    ],
  );

  const updateFilterDraft = (key: keyof AnnouncementFilterDraft, value: string) => {
    setFilterDraft((current) => ({ ...current, [key]: value }));
  };

  const updateAnnouncementDraft = <K extends keyof AnnouncementDraft>(
    key: K,
    value: AnnouncementDraft[K],
  ) => {
    setAnnouncementDraft((current) => ({ ...current, [key]: value }));
  };

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters(normalizeFilters(filterDraft));
    setPage(1);
    setPageSize(parsePageSize(filterDraft.pageSize));
  };

  const resetFilters = () => {
    setFilterDraft(initialFilterDraft);
    setFilters({});
    setPage(1);
    setPageSize(defaultPageSize);
  };

  const startCreate = () => {
    if (!canCreateAnnouncement || !storagePersisted || writePending) {
      if (!canCreateAnnouncement) {
        setAnnouncementPermissionNotice("announcement:create");
      }
      return;
    }
    setFormMode("create");
    setEditingAnnouncementId(null);
    setAnnouncementDraft(emptyAnnouncementDraft);
    setPendingDelete(null);
  };

  const closeAnnouncementForm = () => {
    setFormMode(null);
    setEditingAnnouncementId(null);
    setAnnouncementDraft(emptyAnnouncementDraft);
  };

  const submitAnnouncement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = normalizeAnnouncementDraft(announcementDraft);
    if (!payload) {
      setNotice({
        description: t("admin.announcements.messages.requiredDescription"),
        intent: "danger",
        title: t("admin.announcements.messages.requiredTitle"),
      });
      return;
    }
    if (!storagePersisted) {
      setNotice({
        description: t("admin.announcements.states.storageUnavailableDescription"),
        intent: "danger",
        title: t("admin.announcements.states.storageUnavailableTitle"),
      });
      return;
    }
    if (!formWritable) {
      setAnnouncementPermissionNotice(
        formMode === "edit" ? "announcement:update" : "announcement:create",
      );
      return;
    }

    setNotice(null);
    if (formMode === "edit" && editingAnnouncementId) {
      updateAnnouncementMutation.mutate({ id: editingAnnouncementId, value: payload });
      return;
    }
    createAnnouncementMutation.mutate(payload);
  };

  const confirmDelete = () => {
    if (!pendingDelete || !storagePersisted) {
      return;
    }
    if (!canDeleteAnnouncement) {
      setAnnouncementPermissionNotice("announcement:delete");
      return;
    }
    setNotice(null);
    deleteAnnouncementMutation.mutate(pendingDelete);
  };

  return (
    <section className="console-admin-dashboard" aria-labelledby="admin-announcements-title">
      <div className="console-admin-page-header">
        <div>
          <Badge>{t("admin.announcements.badge")}</Badge>
          <h1 id="admin-announcements-title">{t("admin.announcements.title")}</h1>
          <p>{t("admin.announcements.description")}</p>
        </div>
        <div className="console-announcement-page-actions">
          <Button
            disabled={!canCreateAnnouncement || !storagePersisted || writePending}
            icon={<Plus size={17} />}
            onClick={startCreate}
            title={
              canCreateAnnouncement
                ? undefined
                : announcementPermissionDescription("announcement:create")
            }
          >
            {t("admin.announcements.actions.create")}
          </Button>
          <Button
            appearance="secondary"
            icon={<RefreshCw size={17} />}
            loading={announcementsQuery.isFetching}
            onClick={() => void announcementsQuery.refetch()}
          >
            {t("admin.announcements.actions.refresh")}
          </Button>
        </div>
      </div>

      {announcementsQuery.error ? (
        <StateBlock
          intent="danger"
          title={adminErrorTitle(announcementsQuery.error, t, announcementErrorCopy)}
          description={adminErrorDescription(announcementsQuery.error, t, announcementErrorCopy)}
        />
      ) : null}

      {notice ? (
        <StateBlock description={notice.description} intent={notice.intent} title={notice.title} />
      ) : null}

      {pendingDelete ? (
        <StateBlock
          action={
            <div className="console-announcement-confirm-actions">
              <Button
                disabled={!canDeleteAnnouncement}
                loading={writePending}
                onClick={confirmDelete}
                title={
                  canDeleteAnnouncement
                    ? undefined
                    : announcementPermissionDescription("announcement:delete")
                }
              >
                {t("admin.announcements.actions.confirmDelete")}
              </Button>
              <Button
                appearance="secondary"
                disabled={writePending}
                onClick={() => setPendingDelete(null)}
              >
                {t("admin.announcements.actions.cancel")}
              </Button>
            </div>
          }
          description={t("admin.announcements.delete.description", {
            title: pendingDelete.title,
          })}
          title={t("admin.announcements.delete.title")}
        />
      ) : null}

      {formMode ? (
        <section className="console-admin-panel console-announcement-form-panel">
          <header className="console-admin-panel-header-row">
            <div>
              <h2>
                {formMode === "edit"
                  ? t("admin.announcements.form.editTitle")
                  : t("admin.announcements.form.createTitle")}
              </h2>
              <p>{t("admin.announcements.form.description")}</p>
            </div>
            {editingAnnouncementId ? <Badge>{editingAnnouncementId}</Badge> : null}
          </header>
          <form className="console-announcement-form-grid" onSubmit={submitAnnouncement}>
            <FormField
              disabled={!formWritable || writePending}
              label={t("admin.announcements.form.title")}
              placeholder={t("admin.announcements.form.placeholders.title")}
              value={announcementDraft.title}
              onChange={(event) => updateAnnouncementDraft("title", event.currentTarget.value)}
            />
            <div className="console-form-field">
              <label htmlFor="announcement-form-status">
                {t("admin.announcements.form.status")}
              </label>
              <select
                id="announcement-form-status"
                disabled={!formWritable || writePending}
                value={announcementDraft.status}
                onChange={(event) =>
                  updateAnnouncementDraft("status", normalizeDraftStatus(event.currentTarget.value))
                }
              >
                <option value="draft">{t("admin.announcements.status.draft")}</option>
                <option value="published">{t("admin.announcements.status.published")}</option>
                <option value="archived">{t("admin.announcements.status.archived")}</option>
              </select>
            </div>
            <div className="console-form-field console-announcement-form-field--span">
              <label htmlFor="announcement-summary">{t("admin.announcements.form.summary")}</label>
              <textarea
                id="announcement-summary"
                disabled={!formWritable || writePending}
                placeholder={t("admin.announcements.form.placeholders.summary")}
                rows={3}
                value={announcementDraft.summary}
                onChange={(event) => updateAnnouncementDraft("summary", event.currentTarget.value)}
              />
            </div>
            <div className="console-form-field console-announcement-form-field--span">
              <label htmlFor="announcement-content">{t("admin.announcements.form.content")}</label>
              <textarea
                id="announcement-content"
                disabled={!formWritable || writePending}
                placeholder={t("admin.announcements.form.placeholders.content")}
                rows={6}
                value={announcementDraft.content}
                onChange={(event) => updateAnnouncementDraft("content", event.currentTarget.value)}
              />
            </div>
            <div className="console-announcement-form-actions">
              <Button
                disabled={!formWritable || !draftValid || !storagePersisted}
                icon={<Save size={17} />}
                loading={
                  createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending
                }
                title={
                  formWritable
                    ? undefined
                    : announcementPermissionDescription(
                        formMode === "edit" ? "announcement:update" : "announcement:create",
                      )
                }
                type="submit"
              >
                {formMode === "edit"
                  ? t("admin.announcements.actions.save")
                  : t("admin.announcements.actions.create")}
              </Button>
              <Button
                appearance="secondary"
                disabled={writePending}
                icon={<X size={17} />}
                onClick={closeAnnouncementForm}
              >
                {t("admin.announcements.actions.cancel")}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="console-admin-stat-grid" aria-label={t("admin.announcements.summaryLabel")}>
        <AnnouncementStatCard
          icon={<Megaphone size={19} />}
          label={t("admin.announcements.metrics.total")}
          value={
            pageData
              ? formatNumber(pageData.total, i18n.language)
              : fallbackValue(announcementsQuery.isLoading, t)
          }
        />
        <AnnouncementStatCard
          icon={<ListChecks size={19} />}
          label={t("admin.announcements.metrics.currentPage")}
          value={formatNumber(currentPageCount, i18n.language)}
        />
        <AnnouncementStatCard
          icon={<Clock3 size={19} />}
          label={t("admin.announcements.metrics.page")}
          value={t("admin.announcements.pagination.pageStatus", {
            page,
            totalPages,
          })}
        />
        <AnnouncementStatCard
          icon={<Database size={19} />}
          label={t("admin.announcements.metrics.storage")}
          value={
            pageData
              ? storageStatusLabel(pageData.storageStatus, t)
              : fallbackValue(announcementsQuery.isLoading, t)
          }
        />
      </div>

      <section className="console-admin-panel">
        <header>
          <h2>{t("admin.announcements.filters.title")}</h2>
          <p>{t("admin.announcements.filters.description")}</p>
        </header>
        <form className="console-admin-filter-form" onSubmit={submitFilters}>
          <FormField
            label={t("admin.announcements.filters.keyword")}
            value={filterDraft.keyword}
            onChange={(event) => updateFilterDraft("keyword", event.currentTarget.value)}
          />
          <div className="console-form-field">
            <label htmlFor="announcement-filter-status">
              {t("admin.announcements.filters.status")}
            </label>
            <select
              id="announcement-filter-status"
              value={filterDraft.status}
              onChange={(event) => updateFilterDraft("status", event.currentTarget.value)}
            >
              <option value="">{t("admin.announcements.filters.allStatuses")}</option>
              <option value="draft">{t("admin.announcements.status.draft")}</option>
              <option value="published">{t("admin.announcements.status.published")}</option>
              <option value="archived">{t("admin.announcements.status.archived")}</option>
            </select>
          </div>
          <FormField
            label={t("admin.announcements.filters.startCreatedAt")}
            type="date"
            value={filterDraft.startCreatedAt}
            onChange={(event) => updateFilterDraft("startCreatedAt", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.announcements.filters.endCreatedAt")}
            type="date"
            value={filterDraft.endCreatedAt}
            onChange={(event) => updateFilterDraft("endCreatedAt", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.announcements.filters.pageSize")}
            max={100}
            min={1}
            type="number"
            value={filterDraft.pageSize}
            onChange={(event) => updateFilterDraft("pageSize", event.currentTarget.value)}
          />
          <div className="console-admin-filter-actions">
            <Button
              icon={<Search size={17} />}
              loading={announcementsQuery.isFetching}
              type="submit"
            >
              {t("admin.announcements.actions.search")}
            </Button>
            <Button appearance="secondary" icon={<RotateCcw size={17} />} onClick={resetFilters}>
              {t("admin.announcements.actions.reset")}
            </Button>
          </div>
        </form>
      </section>

      <section className="console-admin-panel">
        <header className="console-admin-panel-header-row">
          <div>
            <h2>{t("admin.announcements.list.title")}</h2>
            <p>
              {t("admin.announcements.list.description", {
                count: pageData?.total ?? 0,
              })}
            </p>
          </div>
          <div
            className="console-admin-pager"
            aria-label={t("admin.announcements.pagination.label")}
          >
            <Button
              appearance="secondary"
              disabled={page <= 1 || announcementsQuery.isFetching}
              icon={<ChevronLeft size={17} />}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("admin.announcements.pagination.previous")}
            </Button>
            <span>
              {t("admin.announcements.pagination.pageStatus", {
                page,
                totalPages,
              })}
            </span>
            <Button
              appearance="secondary"
              disabled={page >= totalPages || announcementsQuery.isFetching}
              icon={<ChevronRight size={17} />}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {t("admin.announcements.pagination.next")}
            </Button>
          </div>
        </header>

        {announcementsQuery.isLoading ? (
          <StateBlock
            title={t("admin.announcements.states.loadingTitle")}
            description={t("admin.announcements.states.loadingDescription")}
          />
        ) : pageData ? (
          <>
            {storagePersisted ? null : (
              <StateBlock
                title={t("admin.announcements.states.storageUnavailableTitle")}
                description={t("admin.announcements.states.storageUnavailableDescription")}
              />
            )}
            <div className="console-announcement-table">
              <DataTable
                columns={columns}
                data={announcements}
                emptyLabel={t("admin.announcements.empty")}
              />
            </div>
          </>
        ) : (
          <StateBlock
            title={t("admin.announcements.states.emptyTitle")}
            description={t("admin.announcements.states.emptyDescription")}
          />
        )}
      </section>
    </section>
  );
}

type AnnouncementStatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function AnnouncementStatCard({ icon, label, value }: AnnouncementStatCardProps) {
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

function normalizeFilters(draft: AnnouncementFilterDraft): AnnouncementFilters {
  return {
    endCreatedAt: trimmedOrUndefined(draft.endCreatedAt),
    keyword: trimmedOrUndefined(draft.keyword),
    startCreatedAt: trimmedOrUndefined(draft.startCreatedAt),
    status: trimmedOrUndefined(draft.status),
  };
}

function normalizeAnnouncementDraft(draft: AnnouncementDraft): AnnouncementInput | null {
  const payload = {
    content: draft.content.trim(),
    status: draft.status,
    summary: draft.summary.trim(),
    title: draft.title.trim(),
  };
  if (!payload.title || !payload.content) {
    return null;
  }
  return payload;
}

function normalizeDraftStatus(value: string): AnnouncementDraft["status"] {
  if (value === "published" || value === "archived") {
    return value;
  }
  return "draft";
}

function trimmedOrUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parsePageSize(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultPageSize;
  }
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

function announcementIdValue(announcement: Announcement) {
  return String(announcement.id);
}

function statusLabel(status: string, t: ReturnType<typeof useTranslation>["t"]) {
  if (status === "draft") {
    return t("admin.announcements.status.draft");
  }
  if (status === "published") {
    return t("admin.announcements.status.published");
  }
  if (status === "archived") {
    return t("admin.announcements.status.archived");
  }
  return status || t("common.labels.none");
}

function storageStatusLabel(status: string, t: ReturnType<typeof useTranslation>["t"]) {
  if (status === "persisted") {
    return t("admin.announcements.storage.persisted");
  }
  if (status === "unavailable") {
    return t("admin.announcements.storage.unavailable");
  }
  return status || t("admin.announcements.storage.unknown");
}

function fallbackValue(loading: boolean, t: ReturnType<typeof useTranslation>["t"]) {
  return loading ? t("loading.app") : t("common.labels.none");
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: string, locale: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value || "";
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}
