import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileClock,
  Hash,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "~/components/console/patterns/DataTable";
import { FormField } from "~/components/console/patterns/FormField";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { adminErrorDescription, adminErrorTitle } from "~/features/admin/error-state";
import { queryKeys } from "~/lib/api/query-keys";
import { systemApi, type SystemVersionListQuery } from "~/lib/api/system";
import type {
  SystemAPIEntry,
  SystemAPIGroup,
  SystemDictionary,
  SystemMenuGroup,
  SystemVersionDetail,
  SystemVersionPackage,
  SystemVersionRecord,
  SystemVersionSourceCatalog,
} from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const defaultPageSize = 10;
const versionErrorCopy = {
  defaultTitle: "admin.versions.states.errorTitle",
  permissionDescription: "admin.versions.states.permissionDescription",
  permissionTitle: "admin.versions.states.permissionTitle",
  storageUnavailableDescription: "admin.versions.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.versions.states.storageUnavailableTitle",
};

type VersionFilters = Pick<
  SystemVersionListQuery,
  "endCreatedAt" | "startCreatedAt" | "versionCode" | "versionName"
>;

type VersionFilterDraft = VersionFilters & {
  pageSize: string;
};

type ExportDraft = {
  apiCodes: string[];
  description: string;
  dictionaryCodes: string[];
  menuCodes: string[];
  versionCode: string;
  versionName: string;
};

type SourceFilters = {
  apis: string;
  dictionaries: string;
  menus: string;
};

type Notice = {
  description: string;
  intent?: "danger" | "info";
  title: string;
};

type PendingDelete =
  | { item: SystemVersionRecord; mode: "single" }
  | { ids: Array<number | string>; mode: "bulk" };

const initialDraft: VersionFilterDraft = {
  endCreatedAt: "",
  pageSize: String(defaultPageSize),
  startCreatedAt: "",
  versionCode: "",
  versionName: "",
};

const initialSourceFilters: SourceFilters = {
  apis: "",
  dictionaries: "",
  menus: "",
};

export default function AdminVersionsRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);
  const [draft, setDraft] = useState<VersionFilterDraft>(initialDraft);
  const [filters, setFilters] = useState<VersionFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selectedIds, setSelectedIds] = useState<Array<number | string>>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportDraft, setExportDraft] = useState<ExportDraft>(() => createInitialExportDraft(t));
  const [sourceFilters, setSourceFilters] = useState<SourceFilters>(initialSourceFilters);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [detailId, setDetailId] = useState<number | string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);
  const canCreateVersion = hasSessionPermission(permissions, {
    code: "version:create",
    productCode: productCode || undefined,
    scope: "platform",
  });
  const canImportVersion = hasSessionPermission(permissions, {
    code: "version:import",
    productCode: productCode || undefined,
    scope: "platform",
  });
  const canDeleteVersion = hasSessionPermission(permissions, {
    code: "version:delete",
    productCode: productCode || undefined,
    scope: "platform",
  });
  const canDownloadVersion = hasSessionPermission(permissions, {
    code: "version:download",
    productCode: productCode || undefined,
    scope: "platform",
  });

  const versionsQuery = useQuery({
    queryFn: ({ signal }) => systemApi.listVersions({ ...filters, page, pageSize }, { signal }),
    queryKey: queryKeys.system.versions(i18n.language, page, pageSize, filters),
  });

  const sourcesQuery = useQuery({
    enabled: exportOpen && canCreateVersion,
    queryFn: ({ signal }) => systemApi.listVersionSources({ signal }),
    queryKey: queryKeys.system.versionSources(i18n.language),
  });

  const detailQuery = useQuery({
    enabled: detailId !== null,
    queryFn: ({ signal }) => systemApi.getVersion(detailId ?? "", { signal }),
    queryKey: queryKeys.system.version(i18n.language, detailId ?? ""),
  });

  const pageData = versionsQuery.data;
  const totalPages = Math.max(1, Math.ceil((pageData?.total ?? 0) / pageSize));
  const latestVersion = pageData?.items[0];
  const storagePersisted = pageData?.storageStatus === "persisted";
  const visibleSelectedIds = selectedIds.filter((id) =>
    pageData?.items.some((item) => String(item.id) === String(id)),
  );
  const sources = sourcesQuery.data;
  const sourceStoragePersisted = sources?.storageStatus === "persisted";
  const exportValid =
    Boolean(exportDraft.versionName.trim() && exportDraft.versionCode.trim()) &&
    Boolean(
      exportDraft.menuCodes.length ||
      exportDraft.apiCodes.length ||
      exportDraft.dictionaryCodes.length,
    );
  const importPreview = useMemo(() => parseImportPackage(importText), [importText]);

  const invalidateVersions = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.system.root });
  };

  const exportVersionMutation = useMutation({
    mutationFn: () =>
      systemApi.exportVersion({
        apiCodes: exportDraft.apiCodes,
        description: trimmedOrUndefined(exportDraft.description),
        dictionaryCodes: exportDraft.dictionaryCodes,
        menuCodes: exportDraft.menuCodes,
        versionCode: exportDraft.versionCode.trim(),
        versionName: exportDraft.versionName.trim(),
      }),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, versionErrorCopy),
        intent: "danger",
        title: t("admin.versions.messages.exportFailedTitle"),
      });
    },
    onSuccess: async (result) => {
      setNotice({
        description: t("admin.versions.messages.exportedDescription", {
          name: result.item.versionName,
        }),
        intent: "info",
        title: t("admin.versions.messages.exportedTitle"),
      });
      setExportOpen(false);
      setExportDraft(createInitialExportDraft(t));
      await invalidateVersions();
    },
  });

  const importVersionMutation = useMutation({
    mutationFn: () => systemApi.importVersion(importText),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, versionErrorCopy),
        intent: "danger",
        title: t("admin.versions.messages.importFailedTitle"),
      });
    },
    onSuccess: async (result) => {
      setNotice({
        description: t("admin.versions.messages.importedDescription", {
          dictionaries: result.dictionariesCreated,
          items: result.dictionaryItemsCreated,
          name: result.item.versionName,
        }),
        intent: "info",
        title: t("admin.versions.messages.importedTitle"),
      });
      setImportOpen(false);
      setImportText("");
      await invalidateVersions();
    },
  });

  const deleteVersionMutation = useMutation({
    mutationFn: (item: SystemVersionRecord) => systemApi.deleteVersion(item.id),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, versionErrorCopy),
        intent: "danger",
        title: t("admin.versions.messages.deleteFailedTitle"),
      });
    },
    onSuccess: async (_result, item) => {
      setNotice({
        description: t("admin.versions.messages.deletedDescription", {
          name: item.versionName,
        }),
        intent: "info",
        title: t("admin.versions.messages.deletedTitle"),
      });
      setPendingDelete(null);
      setSelectedIds((current) => current.filter((id) => String(id) !== String(item.id)));
      await invalidateVersions();
    },
  });

  const deleteVersionsMutation = useMutation({
    mutationFn: (ids: Array<number | string>) => systemApi.deleteVersions(ids),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, versionErrorCopy),
        intent: "danger",
        title: t("admin.versions.messages.deleteFailedTitle"),
      });
    },
    onSuccess: async (_result, ids) => {
      setNotice({
        description: t("admin.versions.messages.deletedSelectedDescription", {
          count: ids.length,
        }),
        intent: "info",
        title: t("admin.versions.messages.deletedTitle"),
      });
      setPendingDelete(null);
      setSelectedIds([]);
      await invalidateVersions();
    },
  });

  const writePending =
    exportVersionMutation.isPending ||
    importVersionMutation.isPending ||
    deleteVersionMutation.isPending ||
    deleteVersionsMutation.isPending;

  const versionColumns: ColumnDef<SystemVersionRecord>[] = [
    {
      cell: ({ row }) => (
        <input
          aria-label={t("admin.versions.a11y.selectVersion", {
            name: row.original.versionName,
          })}
          checked={selectedIds.some((id) => String(id) === String(row.original.id))}
          className="console-version-check"
          disabled={!canDeleteVersion || !storagePersisted || writePending}
          type="checkbox"
          onChange={(event) => toggleVersionSelection(row.original.id, event.currentTarget.checked)}
        />
      ),
      header: () => (
        <input
          aria-label={t("admin.versions.a11y.selectAll")}
          checked={
            Boolean(pageData?.items.length) && visibleSelectedIds.length === pageData?.items.length
          }
          className="console-version-check"
          disabled={
            !canDeleteVersion || !pageData?.items.length || !storagePersisted || writePending
          }
          type="checkbox"
          onChange={(event) => toggleCurrentPageSelection(event.currentTarget.checked)}
        />
      ),
      id: "selection",
    },
    {
      accessorKey: "versionName",
      cell: ({ row }) => (
        <button
          className="console-version-name"
          type="button"
          onClick={() => setDetailId(row.original.id)}
        >
          <strong>{row.original.versionName}</strong>
          <span>{row.original.versionCode}</span>
        </button>
      ),
      header: t("admin.versions.columns.version"),
    },
    {
      accessorKey: "source",
      cell: ({ getValue }) => (
        <span className="console-version-source" data-source={String(getValue())}>
          {sourceLabel(String(getValue()), t)}
        </span>
      ),
      header: t("admin.versions.columns.source"),
    },
    {
      accessorKey: "menuCount",
      cell: ({ getValue }) => formatNumber(Number(getValue()), i18n.language),
      header: t("admin.versions.columns.menus"),
    },
    {
      accessorKey: "apiCount",
      cell: ({ getValue }) => formatNumber(Number(getValue()), i18n.language),
      header: "API",
    },
    {
      accessorKey: "dictionaryCount",
      cell: ({ getValue }) => formatNumber(Number(getValue()), i18n.language),
      header: t("admin.versions.columns.dictionaries"),
    },
    {
      accessorKey: "createdByUsername",
      cell: ({ row }) => row.original.createdByUsername || String(row.original.createdBy),
      header: t("admin.versions.columns.createdBy"),
    },
    {
      accessorKey: "createdAt",
      cell: ({ getValue }) => formatDate(String(getValue()), i18n.language),
      header: t("admin.versions.columns.createdAt"),
    },
    {
      accessorKey: "description",
      cell: ({ getValue }) => {
        const value = getValue();
        return typeof value === "string" && value ? value : t("common.labels.none");
      },
      header: t("admin.versions.columns.description"),
    },
    {
      cell: ({ row }) => {
        const id = row.original.id;
        const downloadBusy = downloadingId !== null && String(downloadingId) === String(id);
        return (
          <div className="console-version-row-actions">
            <Button appearance="secondary" icon={<Eye size={16} />} onClick={() => setDetailId(id)}>
              {t("admin.versions.actions.view")}
            </Button>
            <Button
              appearance="secondary"
              disabled={!canDownloadVersion || downloadBusy}
              icon={<Download size={16} />}
              loading={downloadBusy}
              onClick={() => void downloadVersion(row.original)}
              title={canDownloadVersion ? undefined : versionPermissionTitle("version:download", t)}
            >
              {t("admin.versions.actions.download")}
            </Button>
            <Button
              appearance="secondary"
              disabled={!canDeleteVersion || !storagePersisted || writePending}
              icon={<Trash2 size={16} />}
              onClick={() => openSingleDelete(row.original)}
              title={canDeleteVersion ? undefined : versionPermissionTitle("version:delete", t)}
            >
              {t("admin.versions.actions.delete")}
            </Button>
          </div>
        );
      },
      header: t("admin.versions.columns.actions"),
      id: "actions",
    },
  ];

  function toggleVersionSelection(id: number | string, checked: boolean) {
    if (!canDeleteVersion || !storagePersisted || writePending) {
      return;
    }
    setSelectedIds((current) => {
      const next = current.filter((item) => String(item) !== String(id));
      return checked ? [...next, id] : next;
    });
  }

  function toggleCurrentPageSelection(checked: boolean) {
    if (!canDeleteVersion || !storagePersisted || writePending || !pageData) {
      return;
    }
    const pageIds = pageData.items.map((item) => item.id);
    setSelectedIds((current) => {
      const pageIdSet = new Set(pageIds.map(String));
      const outsidePage = current.filter((id) => !pageIdSet.has(String(id)));
      return checked ? [...outsidePage, ...pageIds] : outsidePage;
    });
  }

  const updateDraft = (key: keyof VersionFilterDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateExportDraft = <Key extends keyof ExportDraft>(key: Key, value: ExportDraft[Key]) => {
    setExportDraft((current) => ({ ...current, [key]: value }));
  };

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters(normalizeFilters(draft));
    setPage(1);
    setPageSize(parsePageSize(draft.pageSize));
  };

  const resetFilters = () => {
    setDraft(initialDraft);
    setFilters({});
    setPage(1);
    setPageSize(defaultPageSize);
  };

  const openExportPanel = () => {
    if (!canCreateVersion || !storagePersisted || writePending) {
      return;
    }
    setNotice(null);
    setExportDraft(createInitialExportDraft(t));
    setSourceFilters(initialSourceFilters);
    setExportOpen(true);
  };

  const openImportPanel = () => {
    if (!canImportVersion || !storagePersisted || writePending) {
      return;
    }
    setNotice(null);
    setImportText("");
    setImportOpen(true);
  };

  const openBulkDelete = () => {
    if (!canDeleteVersion || !visibleSelectedIds.length || !storagePersisted || writePending) {
      return;
    }
    setPendingDelete({ ids: visibleSelectedIds, mode: "bulk" });
  };

  const openSingleDelete = (item: SystemVersionRecord) => {
    if (!canDeleteVersion || !storagePersisted || writePending) {
      return;
    }
    setPendingDelete({ item, mode: "single" });
  };

  const selectAllSources = () => {
    if (!sources) {
      return;
    }
    setExportDraft((current) => ({
      ...current,
      apiCodes: sources.apis.flatMap((group) => group.items.map(apiSelector)),
      dictionaryCodes: sourceStoragePersisted
        ? sources.dictionaries.map((dictionary) => dictionary.code)
        : [],
      menuCodes: sources.menus.flatMap((group) =>
        group.items.map((item) => menuSelector(group, item.code)),
      ),
    }));
  };

  const clearSourceSelection = () => {
    setExportDraft((current) => ({
      ...current,
      apiCodes: [],
      dictionaryCodes: [],
      menuCodes: [],
    }));
  };

  const confirmPendingDelete = () => {
    if (!pendingDelete || !storagePersisted || !canDeleteVersion) {
      return;
    }
    setNotice(null);
    if (pendingDelete.mode === "single") {
      deleteVersionMutation.mutate(pendingDelete.item);
      return;
    }
    deleteVersionsMutation.mutate(pendingDelete.ids);
  };

  const submitExport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!storagePersisted || !exportValid || !canCreateVersion) {
      return;
    }
    setNotice(null);
    exportVersionMutation.mutate();
  };

  const submitImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!storagePersisted || !importPreview || !canImportVersion) {
      return;
    }
    setNotice(null);
    importVersionMutation.mutate();
  };

  const readImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    setImportText(await file.text());
    event.currentTarget.value = "";
  };

  async function downloadVersion(item: SystemVersionRecord) {
    if (!canDownloadVersion) {
      return;
    }
    setNotice(null);
    setDownloadingId(item.id);
    try {
      const pkg = await systemApi.downloadVersion(item.id);
      triggerBrowserDownload(pkg, versionDownloadFilename(pkg, item));
      setNotice({
        description: t("admin.versions.messages.downloadedDescription", {
          name: item.versionName,
        }),
        intent: "info",
        title: t("admin.versions.messages.downloadedTitle"),
      });
    } catch (error) {
      setNotice({
        description: adminErrorDescription(error, t, versionErrorCopy),
        intent: "danger",
        title: t("admin.versions.messages.downloadFailedTitle"),
      });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <section className="console-admin-dashboard" aria-labelledby="admin-versions-title">
      <div className="console-admin-page-header">
        <div>
          <Badge>{t("admin.versions.badge")}</Badge>
          <h1 id="admin-versions-title">{t("admin.versions.title")}</h1>
          <p>{t("admin.versions.description")}</p>
        </div>
        <div className="console-version-page-actions">
          <Button
            disabled={!canCreateVersion || !storagePersisted || writePending}
            icon={<PackagePlus size={17} />}
            onClick={openExportPanel}
            title={canCreateVersion ? undefined : versionPermissionTitle("version:create", t)}
          >
            {t("admin.versions.actions.createRelease")}
          </Button>
          <Button
            appearance="secondary"
            disabled={!canImportVersion || !storagePersisted || writePending}
            icon={<Upload size={17} />}
            onClick={openImportPanel}
            title={canImportVersion ? undefined : versionPermissionTitle("version:import", t)}
          >
            {t("admin.versions.actions.importVersion")}
          </Button>
          <Button
            appearance="secondary"
            disabled={
              !canDeleteVersion || !visibleSelectedIds.length || !storagePersisted || writePending
            }
            icon={<Trash2 size={17} />}
            onClick={openBulkDelete}
            title={canDeleteVersion ? undefined : versionPermissionTitle("version:delete", t)}
          >
            {t("admin.versions.actions.deleteSelected")}
          </Button>
          <Button
            appearance="secondary"
            icon={<RefreshCw size={17} />}
            loading={versionsQuery.isFetching}
            onClick={() => void versionsQuery.refetch()}
          >
            {t("admin.versions.actions.refresh")}
          </Button>
        </div>
      </div>

      {versionsQuery.error ? (
        <StateBlock
          intent="danger"
          title={adminErrorTitle(versionsQuery.error, t, versionErrorCopy)}
          description={adminErrorDescription(versionsQuery.error, t, versionErrorCopy)}
        />
      ) : null}

      {notice ? (
        <StateBlock description={notice.description} intent={notice.intent} title={notice.title} />
      ) : null}

      {pendingDelete ? (
        <StateBlock
          action={
            <div className="console-version-confirm-actions">
              <Button
                disabled={!canDeleteVersion}
                loading={writePending}
                onClick={confirmPendingDelete}
              >
                {t("admin.versions.actions.confirmDelete")}
              </Button>
              <Button
                appearance="secondary"
                disabled={writePending}
                icon={<X size={17} />}
                onClick={() => setPendingDelete(null)}
              >
                {t("admin.versions.actions.cancelDelete")}
              </Button>
            </div>
          }
          description={
            pendingDelete.mode === "single"
              ? t("admin.versions.delete.singleDescription", {
                  name: pendingDelete.item.versionName,
                })
              : t("admin.versions.delete.bulkDescription", {
                  count: pendingDelete.ids.length,
                })
          }
          intent="danger"
          title={
            pendingDelete.mode === "single"
              ? t("admin.versions.delete.singleTitle")
              : t("admin.versions.delete.bulkTitle")
          }
        />
      ) : null}

      {exportOpen ? (
        <section className="console-admin-panel console-version-workflow-panel">
          <header className="console-admin-panel-header-row">
            <div>
              <h2>{t("admin.versions.export.title")}</h2>
              <p>{t("admin.versions.export.description")}</p>
            </div>
            <Button
              appearance="secondary"
              disabled={exportVersionMutation.isPending}
              icon={<X size={17} />}
              onClick={() => setExportOpen(false)}
            >
              {t("admin.versions.actions.closeWorkflow")}
            </Button>
          </header>
          <form className="console-version-export-form" onSubmit={submitExport}>
            <FormField
              required
              disabled={!canCreateVersion || exportVersionMutation.isPending}
              label={t("admin.versions.export.versionName")}
              value={exportDraft.versionName}
              onChange={(event) => updateExportDraft("versionName", event.currentTarget.value)}
            />
            <FormField
              required
              disabled={!canCreateVersion || exportVersionMutation.isPending}
              label={t("admin.versions.export.versionCode")}
              value={exportDraft.versionCode}
              onChange={(event) => updateExportDraft("versionCode", event.currentTarget.value)}
            />
            <label className="console-form-field console-version-export-description">
              <span>{t("admin.versions.export.descriptionField")}</span>
              <textarea
                disabled={!canCreateVersion || exportVersionMutation.isPending}
                rows={3}
                value={exportDraft.description}
                onChange={(event) => updateExportDraft("description", event.currentTarget.value)}
              />
            </label>

            <div className="console-version-source-actions">
              <Badge>
                {t("admin.versions.export.selectedSummary", {
                  apis: exportDraft.apiCodes.length,
                  dictionaries: exportDraft.dictionaryCodes.length,
                  menus: exportDraft.menuCodes.length,
                })}
              </Badge>
              <Button
                appearance="secondary"
                disabled={!canCreateVersion || !sources || sourcesQuery.isFetching}
                onClick={selectAllSources}
              >
                {t("admin.versions.actions.selectAllSources")}
              </Button>
              <Button appearance="secondary" onClick={clearSourceSelection}>
                {t("admin.versions.actions.clearSources")}
              </Button>
            </div>

            {sourcesQuery.error ? (
              <StateBlock
                intent="danger"
                title={t("admin.versions.states.sourceErrorTitle")}
                description={adminErrorDescription(sourcesQuery.error, t, versionErrorCopy)}
              />
            ) : null}

            {sourcesQuery.isLoading ? (
              <StateBlock
                title={t("admin.versions.states.sourceLoadingTitle")}
                description={t("admin.versions.states.sourceLoadingDescription")}
              />
            ) : sources ? (
              <VersionSourceSelector
                disabled={!canCreateVersion}
                exportDraft={exportDraft}
                filters={sourceFilters}
                sources={sources}
                sourceStoragePersisted={Boolean(sourceStoragePersisted)}
                t={t}
                onDraftChange={setExportDraft}
                onFiltersChange={setSourceFilters}
              />
            ) : null}

            <div className="console-version-workflow-actions">
              <Button
                disabled={!canCreateVersion || !exportValid || !storagePersisted}
                icon={<PackagePlus size={17} />}
                loading={exportVersionMutation.isPending}
                type="submit"
              >
                {t("admin.versions.actions.createRelease")}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {importOpen ? (
        <section className="console-admin-panel console-version-workflow-panel">
          <header className="console-admin-panel-header-row">
            <div>
              <h2>{t("admin.versions.import.title")}</h2>
              <p>{t("admin.versions.import.description")}</p>
            </div>
            <Button
              appearance="secondary"
              disabled={importVersionMutation.isPending}
              icon={<X size={17} />}
              onClick={() => setImportOpen(false)}
            >
              {t("admin.versions.actions.closeWorkflow")}
            </Button>
          </header>
          <form className="console-version-import-form" onSubmit={submitImport}>
            <label className="console-form-field">
              <span>{t("admin.versions.import.file")}</span>
              <input
                accept="application/json,.json"
                aria-label={t("admin.versions.import.file")}
                disabled={!canImportVersion || importVersionMutation.isPending}
                type="file"
                onChange={(event) => void readImportFile(event)}
              />
            </label>
            <label className="console-form-field">
              <span>{t("admin.versions.import.json")}</span>
              <textarea
                disabled={!canImportVersion || importVersionMutation.isPending}
                rows={12}
                value={importText}
                onChange={(event) => setImportText(event.currentTarget.value)}
              />
            </label>
            {importPreview ? (
              <VersionPackagePreview pkg={importPreview} t={t} />
            ) : importText.trim() ? (
              <StateBlock
                intent="danger"
                title={t("admin.versions.import.invalidTitle")}
                description={t("admin.versions.import.invalidDescription")}
              />
            ) : null}
            <div className="console-version-workflow-actions">
              <Button
                disabled={!canImportVersion || !importPreview || !storagePersisted}
                icon={<Upload size={17} />}
                loading={importVersionMutation.isPending}
                type="submit"
              >
                {t("admin.versions.actions.submitImport")}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {detailId !== null ? (
        <section className="console-admin-panel console-version-workflow-panel">
          <header className="console-admin-panel-header-row">
            <div>
              <h2>{t("admin.versions.detail.title")}</h2>
              <p>{t("admin.versions.detail.description")}</p>
            </div>
            <Button appearance="secondary" icon={<X size={17} />} onClick={() => setDetailId(null)}>
              {t("admin.versions.actions.closeWorkflow")}
            </Button>
          </header>
          {detailQuery.isLoading ? (
            <StateBlock
              title={t("admin.versions.states.detailLoadingTitle")}
              description={t("admin.versions.states.detailLoadingDescription")}
            />
          ) : detailQuery.error ? (
            <StateBlock
              intent="danger"
              title={t("admin.versions.states.detailErrorTitle")}
              description={adminErrorDescription(detailQuery.error, t, versionErrorCopy)}
            />
          ) : detailQuery.data ? (
            <VersionDetail detail={detailQuery.data} locale={i18n.language} t={t} />
          ) : null}
        </section>
      ) : null}

      <div className="console-admin-stat-grid" aria-label={t("admin.versions.summaryLabel")}>
        <VersionStatCard
          icon={<PackageCheck size={19} />}
          label={t("admin.versions.metrics.total")}
          value={
            pageData
              ? formatNumber(pageData.total, i18n.language)
              : fallbackValue(versionsQuery.isLoading, t)
          }
        />
        <VersionStatCard
          icon={<FileClock size={19} />}
          label={t("admin.versions.metrics.latest")}
          value={latestVersion?.versionName ?? fallbackValue(versionsQuery.isLoading, t)}
        />
        <VersionStatCard
          icon={<Hash size={19} />}
          label={t("admin.versions.metrics.page")}
          value={t("admin.versions.pagination.pageStatus", {
            page,
            totalPages,
          })}
        />
        <VersionStatCard
          icon={<PackageCheck size={19} />}
          label={t("admin.versions.metrics.storage")}
          value={pageData?.storageStatus ?? fallbackValue(versionsQuery.isLoading, t)}
        />
      </div>

      <section className="console-admin-panel">
        <header>
          <h2>{t("admin.versions.filters.title")}</h2>
          <p>{t("admin.versions.filters.description")}</p>
        </header>
        <form className="console-admin-filter-form" onSubmit={submitFilters}>
          <FormField
            label={t("admin.versions.filters.versionName")}
            value={draft.versionName}
            onChange={(event) => updateDraft("versionName", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.versions.filters.versionCode")}
            value={draft.versionCode}
            onChange={(event) => updateDraft("versionCode", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.versions.filters.startCreatedAt")}
            type="date"
            value={draft.startCreatedAt}
            onChange={(event) => updateDraft("startCreatedAt", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.versions.filters.endCreatedAt")}
            type="date"
            value={draft.endCreatedAt}
            onChange={(event) => updateDraft("endCreatedAt", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.versions.filters.pageSize")}
            max={100}
            min={1}
            type="number"
            value={draft.pageSize}
            onChange={(event) => updateDraft("pageSize", event.currentTarget.value)}
          />
          <div className="console-admin-filter-actions">
            <Button icon={<Search size={17} />} loading={versionsQuery.isFetching} type="submit">
              {t("admin.versions.actions.search")}
            </Button>
            <Button appearance="secondary" icon={<RotateCcw size={17} />} onClick={resetFilters}>
              {t("admin.versions.actions.reset")}
            </Button>
          </div>
        </form>
      </section>

      <section className="console-admin-panel">
        <header className="console-admin-panel-header-row">
          <div>
            <h2>{t("admin.versions.list.title")}</h2>
            <p>
              {t("admin.versions.list.description", {
                count: pageData?.total ?? 0,
              })}
            </p>
          </div>
          <div className="console-admin-pager" aria-label={t("admin.versions.pagination.label")}>
            <Button
              appearance="secondary"
              disabled={page <= 1 || versionsQuery.isFetching}
              icon={<ChevronLeft size={17} />}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("admin.versions.pagination.previous")}
            </Button>
            <span>
              {t("admin.versions.pagination.pageStatus", {
                page,
                totalPages,
              })}
            </span>
            <Button
              appearance="secondary"
              disabled={page >= totalPages || versionsQuery.isFetching}
              icon={<ChevronRight size={17} />}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {t("admin.versions.pagination.next")}
            </Button>
          </div>
        </header>

        {versionsQuery.isLoading ? (
          <StateBlock
            title={t("admin.versions.states.loadingTitle")}
            description={t("admin.versions.states.loadingDescription")}
          />
        ) : pageData ? (
          <>
            {pageData.storageStatus === "persisted" ? null : (
              <StateBlock
                title={t("admin.versions.states.storageUnavailableTitle")}
                description={t("admin.versions.states.storageUnavailableDescription")}
              />
            )}
            <div className="console-version-table">
              <DataTable
                columns={versionColumns}
                data={pageData.items}
                emptyLabel={t("admin.versions.empty")}
              />
            </div>
          </>
        ) : (
          <StateBlock
            title={t("admin.versions.states.emptyTitle")}
            description={t("admin.versions.states.emptyDescription")}
          />
        )}
      </section>
    </section>
  );
}

type VersionStatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function VersionStatCard({ icon, label, value }: VersionStatCardProps) {
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

type VersionSourceSelectorProps = {
  disabled: boolean;
  exportDraft: ExportDraft;
  filters: SourceFilters;
  onDraftChange: (draft: ExportDraft) => void;
  onFiltersChange: (filters: SourceFilters) => void;
  sourceStoragePersisted: boolean;
  sources: SystemVersionSourceCatalog;
  t: ReturnType<typeof useTranslation>["t"];
};

function VersionSourceSelector({
  disabled,
  exportDraft,
  filters,
  onDraftChange,
  onFiltersChange,
  sourceStoragePersisted,
  sources,
  t,
}: VersionSourceSelectorProps) {
  const menuGroups = filterMenuGroups(sources.menus, filters.menus);
  const apiGroups = filterAPIGroups(sources.apis, filters.apis);
  const dictionaries = filterDictionaries(sources.dictionaries, filters.dictionaries);

  const toggle = (
    key: "apiCodes" | "dictionaryCodes" | "menuCodes",
    code: string,
    checked: boolean,
  ) => {
    if (disabled) {
      return;
    }
    const current = exportDraft[key];
    onDraftChange({
      ...exportDraft,
      [key]: checked ? addUnique(current, code) : current.filter((item) => item !== code),
    });
  };

  return (
    <div className="console-version-source-grid">
      <section className="console-version-source-panel">
        <header>
          <h3>{t("admin.versions.columns.menus")}</h3>
          <FormField
            label={t("admin.versions.export.filterMenus")}
            value={filters.menus}
            onChange={(event) => onFiltersChange({ ...filters, menus: event.currentTarget.value })}
          />
        </header>
        <div className="console-version-source-list">
          {menuGroups.map((group) => (
            <div className="console-version-source-group" key={group.code}>
              <strong>{group.label}</strong>
              {group.items.map((item) => {
                const code = menuSelector(group, item.code);
                return (
                  <label className="console-version-source-option" key={code}>
                    <input
                      checked={exportDraft.menuCodes.includes(code)}
                      disabled={disabled}
                      type="checkbox"
                      onChange={(event) => toggle("menuCodes", code, event.currentTarget.checked)}
                    />
                    <span>{item.label}</span>
                    <code>{item.path}</code>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="console-version-source-panel">
        <header>
          <h3>API</h3>
          <FormField
            label={t("admin.versions.export.filterApis")}
            value={filters.apis}
            onChange={(event) => onFiltersChange({ ...filters, apis: event.currentTarget.value })}
          />
        </header>
        <div className="console-version-source-list">
          {apiGroups.map((group) => (
            <div className="console-version-source-group" key={group.code}>
              <strong>{group.label}</strong>
              {group.items.map((item) => {
                const code = apiSelector(item);
                return (
                  <label className="console-version-source-option" key={code}>
                    <input
                      checked={exportDraft.apiCodes.includes(code)}
                      disabled={disabled}
                      type="checkbox"
                      onChange={(event) => toggle("apiCodes", code, event.currentTarget.checked)}
                    />
                    <span>{item.method}</span>
                    <code>{item.path}</code>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="console-version-source-panel">
        <header>
          <h3>{t("admin.versions.columns.dictionaries")}</h3>
          <FormField
            label={t("admin.versions.export.filterDictionaries")}
            value={filters.dictionaries}
            onChange={(event) =>
              onFiltersChange({ ...filters, dictionaries: event.currentTarget.value })
            }
          />
        </header>
        {sourceStoragePersisted ? null : (
          <StateBlock
            title={t("admin.versions.states.dictionarySourceUnavailableTitle")}
            description={t("admin.versions.states.dictionarySourceUnavailableDescription")}
          />
        )}
        <div className="console-version-source-list">
          {dictionaries.map((dictionary) => (
            <label className="console-version-source-option" key={dictionary.code}>
              <input
                checked={exportDraft.dictionaryCodes.includes(dictionary.code)}
                disabled={disabled || !sourceStoragePersisted}
                type="checkbox"
                onChange={(event) =>
                  toggle("dictionaryCodes", dictionary.code, event.currentTarget.checked)
                }
              />
              <span>{dictionary.name}</span>
              <code>{dictionary.code}</code>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

type VersionPackagePreviewProps = {
  pkg: SystemVersionPackage;
  t: ReturnType<typeof useTranslation>["t"];
};

function VersionPackagePreview({ pkg, t }: VersionPackagePreviewProps) {
  const menuCount = pkg.menus.reduce((count, group) => count + group.items.length, 0);
  const apiCount = pkg.apis.reduce((count, group) => count + group.items.length, 0);
  return (
    <section className="console-version-package-preview">
      <div>
        <h3>{pkg.version.name}</h3>
        <p>{pkg.version.code}</p>
      </div>
      <Badge>{t("admin.versions.summary.menus", { count: menuCount })}</Badge>
      <Badge>{t("admin.versions.summary.apis", { count: apiCount })}</Badge>
      <Badge>{t("admin.versions.summary.dictionaries", { count: pkg.dictionaries.length })}</Badge>
    </section>
  );
}

type VersionDetailProps = {
  detail: SystemVersionDetail;
  locale: string;
  t: ReturnType<typeof useTranslation>["t"];
};

function VersionDetail({ detail, locale, t }: VersionDetailProps) {
  return (
    <div className="console-version-detail">
      <section className="console-version-package-preview">
        <div>
          <h3>{detail.item.versionName}</h3>
          <p>{detail.item.versionCode}</p>
        </div>
        <Badge>{sourceLabel(detail.item.source, t)}</Badge>
        <Badge>{formatDate(detail.item.createdAt, locale)}</Badge>
      </section>
      <pre>{JSON.stringify(detail.package, null, 2)}</pre>
    </div>
  );
}

function normalizeFilters(draft: VersionFilterDraft): VersionFilters {
  return {
    endCreatedAt: trimmedOrUndefined(draft.endCreatedAt),
    startCreatedAt: trimmedOrUndefined(draft.startCreatedAt),
    versionCode: trimmedOrUndefined(draft.versionCode),
    versionName: trimmedOrUndefined(draft.versionName),
  };
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

function fallbackValue(loading: boolean, t: ReturnType<typeof useTranslation>["t"]) {
  return loading ? t("loading.app") : t("common.labels.none");
}

function versionPermissionTitle(permission: string, t: ReturnType<typeof useTranslation>["t"]) {
  return t("admin.versions.states.writePermissionDescription", { permission });
}

function sourceLabel(source: string, t: ReturnType<typeof useTranslation>["t"]) {
  if (source === "export" || source === "import") {
    return t(`admin.versions.source.${source}`);
  }
  return source;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: string, locale: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function createInitialExportDraft(t: ReturnType<typeof useTranslation>["t"]): ExportDraft {
  const now = new Date();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return {
    apiCodes: [],
    description: "",
    dictionaryCodes: [],
    menuCodes: [],
    versionCode: `v${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}`,
    versionName: t("admin.versions.export.defaultName", { date }),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function menuSelector(group: SystemMenuGroup, itemCode: string) {
  return `${group.code}:${itemCode}`;
}

function apiSelector(item: SystemAPIEntry) {
  return item.code || `${item.method} ${item.path}`.toLowerCase();
}

function addUnique(items: string[], value: string) {
  return items.includes(value) ? items : [...items, value];
}

function filterMenuGroups(groups: SystemMenuGroup[], keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return groups;
  }
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        [group.code, group.label, item.code, item.label, item.path, item.permission].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalized),
        ),
      ),
    }))
    .filter((group) => group.items.length);
}

function filterAPIGroups(groups: SystemAPIGroup[], keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return groups;
  }
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        [
          group.code,
          group.label,
          item.code,
          item.description,
          item.method,
          item.path,
          item.permission,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalized),
        ),
      ),
    }))
    .filter((group) => group.items.length);
}

function filterDictionaries(items: SystemDictionary[], keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return items;
  }
  return items.filter((dictionary) =>
    [dictionary.code, dictionary.description, dictionary.name].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(normalized),
    ),
  );
}

function parseImportPackage(value: string): SystemVersionPackage | null {
  const raw = value.trim();
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SystemVersionPackage;
    if (!parsed?.version?.name || !parsed.version.code) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function triggerBrowserDownload(value: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function versionDownloadFilename(pkg: SystemVersionPackage, fallback: SystemVersionRecord) {
  const code = pkg.version.code || fallback.versionCode || fallback.id;
  return `system-version-${code}.json`;
}
