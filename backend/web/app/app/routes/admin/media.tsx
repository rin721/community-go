import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  File,
  FolderTree,
  HardDrive,
  ImageIcon,
  Layers3,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "~/components/console/patterns/DataTable";
import { Collapse } from "~/components/console/patterns/Collapse";
import { Dialog } from "~/components/console/patterns/Dialog";
import { Drawer } from "~/components/console/patterns/Drawer";
import { FormField } from "~/components/console/patterns/FormField";
import { TableSkeleton } from "~/components/console/patterns/LoadingSkeletons";
import { SelectField } from "~/components/console/patterns/SelectField";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { adminErrorDescription, adminErrorTitle } from "~/features/admin/error-state";
import { queryKeys } from "~/lib/api/query-keys";
import { systemApi, type SystemMediaAssetListQuery } from "~/lib/api/system";
import type { SystemMediaAsset, SystemMediaCategory } from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const defaultPageSize = 10;
const rootCategoryId = "0";
const mediaErrorCopy = {
  defaultTitle: "admin.media.states.errorTitle",
  permissionDescription: "admin.media.states.permissionDescription",
  permissionTitle: "admin.media.states.permissionTitle",
  storageUnavailableDescription: "admin.media.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.media.states.storageUnavailableTitle",
};

type MediaFilters = Pick<SystemMediaAssetListQuery, "keyword">;

type MediaFilterDraft = MediaFilters & {
  pageSize: string;
};

type FlatCategory = {
  category: SystemMediaCategory;
  depth: number;
};

type Notice = {
  description: string;
  intent: "danger" | "info";
  title: string;
};

type MediaAssetBusyAction = "delete" | "download" | "rename";

type MediaAssetBusy = {
  action: MediaAssetBusyAction;
  id: string;
} | null;

type MediaCategoryBusyAction = "delete" | "save";

type MediaCategoryBusy = {
  action: MediaCategoryBusyAction;
  id: string;
} | null;

type MediaCategoryDraft = {
  name: string;
  parentId: string;
  sort: string;
};

const initialDraft: MediaFilterDraft = {
  keyword: "",
  pageSize: String(defaultPageSize),
};

const initialCategoryDraft: MediaCategoryDraft = {
  name: "",
  parentId: rootCategoryId,
  sort: "10",
};

export default function AdminMediaRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(rootCategoryId);
  const [draft, setDraft] = useState<MediaFilterDraft>(initialDraft);
  const [filters, setFilters] = useState<MediaFilters>({});
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [assetBusy, setAssetBusy] = useState<MediaAssetBusy>(null);
  const [categoryBusy, setCategoryBusy] = useState<MediaCategoryBusy>(null);
  const [categoryDraft, setCategoryDraft] = useState<MediaCategoryDraft>(initialCategoryDraft);
  const [categoryFormMode, setCategoryFormMode] = useState<"create" | "edit" | null>(null);
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<SystemMediaCategory | null>(
    null,
  );
  const [editingCategory, setEditingCategory] = useState<SystemMediaCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemMediaAsset | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renamingAsset, setRenamingAsset] = useState<SystemMediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const canUpdateMedia = hasSessionPermission(permissions, {
    code: "media:update",
    productCode: productCode || undefined,
    scope: "platform",
  });
  const canUploadMedia = hasSessionPermission(permissions, {
    code: "media:upload",
    productCode: productCode || undefined,
    scope: "platform",
  });
  const canImportMedia = hasSessionPermission(permissions, {
    code: "media:import",
    productCode: productCode || undefined,
    scope: "platform",
  });
  const canDeleteMedia = hasSessionPermission(permissions, {
    code: "media:delete",
    productCode: productCode || undefined,
    scope: "platform",
  });
  const canDownloadMedia = hasSessionPermission(permissions, {
    code: "media:download",
    productCode: productCode || undefined,
    scope: "platform",
  });

  const categoryQuery = useQuery({
    queryFn: ({ signal }) => systemApi.listMediaCategories({ signal }),
    queryKey: queryKeys.system.mediaCategories(i18n.language),
  });

  const assetFilters = useMemo(
    () => ({
      categoryId: selectedCategoryId === rootCategoryId ? undefined : selectedCategoryId,
      keyword: filters.keyword,
    }),
    [filters.keyword, selectedCategoryId],
  );

  const assetsQuery = useQuery({
    queryFn: ({ signal }) =>
      systemApi.listMediaAssets({ ...assetFilters, page, pageSize }, { signal }),
    queryKey: queryKeys.system.mediaAssets(i18n.language, page, pageSize, assetFilters),
  });

  const pageData = assetsQuery.data;
  const flatCategories = useMemo(
    () => flattenCategories(categoryQuery.data?.items ?? []),
    [categoryQuery.data?.items],
  );
  const categoryNames = useMemo(() => buildCategoryNameMap(flatCategories), [flatCategories]);
  const categoryParentOptions = useMemo(() => {
    const excludedIds = editingCategory
      ? collectCategoryTreeIds(editingCategory)
      : new Set<string>();
    return [
      { label: t("admin.media.categories.root"), value: rootCategoryId },
      ...flatCategories
        .filter(({ category }) => !excludedIds.has(String(category.id)))
        .map(({ category, depth }) => ({
          label: `${"  ".repeat(depth)}${category.name || t("admin.media.categories.unknown")}`,
          value: String(category.id),
        })),
    ];
  }, [editingCategory, flatCategories, t]);
  const totalPages = Math.max(1, Math.ceil((pageData?.total ?? 0) / pageSize));
  const selectedCategoryLabel =
    selectedCategoryId === rootCategoryId
      ? t("admin.media.categories.all")
      : (categoryNames.get(selectedCategoryId) ?? t("admin.media.categories.unknown"));
  const storageStatus = pageData?.storageStatus ?? categoryQuery.data?.storageStatus;
  const currentPageCount = pageData?.items.length ?? 0;
  const selectedCategoryRequestId =
    selectedCategoryId === rootCategoryId ? undefined : selectedCategoryId;
  const mediaWriteStatusReady = Boolean(pageData && categoryQuery.data);
  const mediaStoragePersisted =
    pageData?.storageStatus === "persisted" && categoryQuery.data?.storageStatus === "persisted";
  const categoryWriteReady = Boolean(categoryQuery.data);
  const categoryStoragePersisted = categoryQuery.data?.storageStatus === "persisted";
  const categoryWriteUnavailable = !categoryWriteReady || !categoryStoragePersisted;
  const mediaWriteUnavailable =
    !mediaWriteStatusReady || !mediaStoragePersisted || Boolean(pageData?.uploadUnavailable);
  const uploadDisabled = !canUploadMedia || uploading || importing || mediaWriteUnavailable;
  const importDisabled =
    !canImportMedia || importing || uploading || mediaWriteUnavailable || !importText.trim();
  const categorySaveDisabled =
    !canUpdateMedia ||
    Boolean(categoryBusy) ||
    categoryWriteUnavailable ||
    !categoryDraft.name.trim();
  const writeUnavailableReason = !mediaWriteStatusReady
    ? t("admin.media.write.loadingStatus")
    : pageData?.uploadUnavailable
      ? t("admin.media.states.uploadUnavailableDescription")
      : t("admin.media.states.storageUnavailableDescription");
  const categoryWriteUnavailableReason = !categoryWriteReady
    ? t("admin.media.categories.loadingStatus")
    : t("admin.media.states.storageUnavailableDescription");
  const mediaPermissionDescription = useCallback(
    (permission: string) =>
      t("admin.media.states.writePermissionDescription", {
        permission,
      }),
    [t],
  );
  const setMediaPermissionNotice = useCallback(
    (permission: string) => {
      setNotice({
        description: mediaPermissionDescription(permission),
        intent: "danger",
        title: t("admin.media.states.permissionTitle"),
      });
    },
    [mediaPermissionDescription, t],
  );

  const invalidateMediaRecords = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["system", "media", "assets"] });
  }, [queryClient]);

  const invalidateMediaCatalog = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["system", "media", "categories"] }),
      queryClient.invalidateQueries({ queryKey: ["system", "media", "assets"] }),
    ]);
  }, [queryClient]);

  const openCreateCategory = useCallback(() => {
    if (!canUpdateMedia || categoryWriteUnavailable || Boolean(categoryBusy)) {
      if (!canUpdateMedia) {
        setMediaPermissionNotice("media:update");
      }
      return;
    }
    setRenamingAsset(null);
    setDeleteTarget(null);
    setCategoryDeleteTarget(null);
    setNotice(null);
    setEditingCategory(null);
    setCategoryFormMode("create");
    setCategoryDraft({
      ...initialCategoryDraft,
      parentId: selectedCategoryId === rootCategoryId ? rootCategoryId : selectedCategoryId,
    });
  }, [
    canUpdateMedia,
    categoryBusy,
    categoryWriteUnavailable,
    selectedCategoryId,
    setMediaPermissionNotice,
  ]);

  const openEditCategory = useCallback(
    (category: SystemMediaCategory) => {
      if (!canUpdateMedia || categoryWriteUnavailable || Boolean(categoryBusy)) {
        if (!canUpdateMedia) {
          setMediaPermissionNotice("media:update");
        }
        return;
      }
      setRenamingAsset(null);
      setDeleteTarget(null);
      setCategoryDeleteTarget(null);
      setNotice(null);
      setEditingCategory(category);
      setCategoryFormMode("edit");
      setCategoryDraft({
        name: category.name,
        parentId:
          category.parentId === undefined ||
          category.parentId === null ||
          String(category.parentId) === ""
            ? rootCategoryId
            : String(category.parentId),
        sort: String(category.sort ?? 0),
      });
    },
    [canUpdateMedia, categoryBusy, categoryWriteUnavailable, setMediaPermissionNotice],
  );

  const openCategoryDelete = useCallback(
    (category: SystemMediaCategory) => {
      if (!canUpdateMedia || categoryWriteUnavailable || Boolean(categoryBusy)) {
        if (!canUpdateMedia) {
          setMediaPermissionNotice("media:update");
        }
        return;
      }
      setRenamingAsset(null);
      setDeleteTarget(null);
      setEditingCategory(null);
      setCategoryFormMode(null);
      setNotice(null);
      setCategoryDeleteTarget(category);
    },
    [canUpdateMedia, categoryBusy, categoryWriteUnavailable, setMediaPermissionNotice],
  );

  const startAssetRename = useCallback(
    (asset: SystemMediaAsset) => {
      if (!canUpdateMedia || Boolean(assetBusy)) {
        if (!canUpdateMedia) {
          setMediaPermissionNotice("media:update");
        }
        return;
      }
      setCategoryDeleteTarget(null);
      setEditingCategory(null);
      setCategoryFormMode(null);
      setDeleteTarget(null);
      setNotice(null);
      setRenamingAsset(asset);
      setRenameDraft(asset.displayName || asset.originalName);
    },
    [assetBusy, canUpdateMedia, setMediaPermissionNotice],
  );

  const openAssetDelete = useCallback(
    (asset: SystemMediaAsset) => {
      if (!canDeleteMedia || Boolean(assetBusy)) {
        if (!canDeleteMedia) {
          setMediaPermissionNotice("media:delete");
        }
        return;
      }
      setCategoryDeleteTarget(null);
      setEditingCategory(null);
      setCategoryFormMode(null);
      setRenamingAsset(null);
      setNotice(null);
      setDeleteTarget(asset);
    },
    [assetBusy, canDeleteMedia, setMediaPermissionNotice],
  );

  const handleAssetDownload = useCallback(
    async (asset: SystemMediaAsset) => {
      if (!canDownloadMedia || asset.external || Boolean(assetBusy)) {
        if (!canDownloadMedia) {
          setMediaPermissionNotice("media:download");
        }
        return;
      }
      const id = String(asset.id);
      setAssetBusy({ action: "download", id });
      setNotice(null);
      try {
        const download = await systemApi.downloadMediaAsset(asset.id);
        triggerBrowserDownload(download.blob, download.filename || mediaDownloadFilename(asset));
        setNotice({
          description: t("admin.media.messages.downloadedDescription", {
            name: assetDisplayName(asset, t),
          }),
          intent: "info",
          title: t("admin.media.messages.downloadedTitle"),
        });
      } catch (error) {
        setNotice({
          description: adminErrorDescription(error, t, mediaErrorCopy),
          intent: "danger",
          title: t("admin.media.messages.downloadFailedTitle"),
        });
      } finally {
        setAssetBusy((current) =>
          current?.action === "download" && current.id === id ? null : current,
        );
      }
    },
    [assetBusy, canDownloadMedia, setMediaPermissionNotice, t],
  );

  const mediaColumns = useMemo<ColumnDef<SystemMediaAsset>[]>(
    () => [
      {
        accessorKey: "displayName",
        cell: ({ row }) => (
          <div className="console-media-asset">
            <MediaPreview asset={row.original} />
            <div>
              <strong>{row.original.displayName || row.original.originalName}</strong>
              <span>{row.original.originalName || t("common.labels.none")}</span>
            </div>
          </div>
        ),
        header: t("admin.media.columns.asset"),
      },
      {
        accessorKey: "categoryId",
        cell: ({ row }) => categoryName(row.original.categoryId, categoryNames, t),
        header: t("admin.media.columns.category"),
      },
      {
        accessorKey: "source",
        cell: ({ row }) => (
          <div className="console-media-badges">
            <span className="console-media-source" data-source={row.original.source}>
              {sourceLabel(row.original.source, t)}
            </span>
            {row.original.external ? <span>{t("admin.media.values.external")}</span> : null}
          </div>
        ),
        header: t("admin.media.columns.source"),
      },
      {
        accessorKey: "mimeType",
        cell: ({ row }) => (
          <div className="console-media-type">
            <strong>{row.original.extension || t("common.labels.none")}</strong>
            <span>{row.original.mimeType || t("common.labels.none")}</span>
          </div>
        ),
        header: t("admin.media.columns.type"),
      },
      {
        accessorKey: "sizeBytes",
        cell: ({ getValue }) => formatBytes(Number(getValue()), i18n.language, t),
        header: t("admin.media.columns.size"),
      },
      {
        accessorKey: "uploadedByUsername",
        cell: ({ row }) =>
          row.original.uploadedByUsername ||
          String(row.original.uploadedBy || t("admin.media.values.unknownUser")),
        header: t("admin.media.columns.uploadedBy"),
      },
      {
        accessorKey: "createdAt",
        cell: ({ getValue }) => formatDate(String(getValue()), i18n.language),
        header: t("admin.media.columns.createdAt"),
      },
      {
        accessorKey: "url",
        cell: ({ row }) =>
          row.original.external && row.original.url ? (
            <a
              className="console-media-link"
              href={row.original.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink aria-hidden="true" size={15} />
              <span>{t("admin.media.actions.openExternal")}</span>
            </a>
          ) : (
            <span className="console-media-muted">
              {t("admin.media.actions.authenticatedDownload")}
            </span>
          ),
        header: t("admin.media.columns.link"),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const asset = row.original;
          const id = String(asset.id);
          const downloadBusy = assetBusy?.action === "download" && assetBusy.id === id;

          return (
            <div className="console-media-actions">
              <Button
                appearance="secondary"
                aria-label={t("admin.media.actions.renameAsset", {
                  name: assetDisplayName(asset, t),
                })}
                disabled={!canUpdateMedia || Boolean(assetBusy)}
                icon={<Pencil size={15} />}
                onClick={() => startAssetRename(asset)}
                title={canUpdateMedia ? undefined : mediaPermissionDescription("media:update")}
              >
                {t("admin.media.actions.rename")}
              </Button>
              <Button
                appearance="secondary"
                aria-label={t("admin.media.actions.downloadAsset", {
                  name: assetDisplayName(asset, t),
                })}
                disabled={!canDownloadMedia || asset.external || Boolean(assetBusy)}
                icon={<Download size={15} />}
                loading={downloadBusy}
                onClick={() => {
                  void handleAssetDownload(asset);
                }}
                title={
                  canDownloadMedia || asset.external
                    ? undefined
                    : mediaPermissionDescription("media:download")
                }
              >
                {t("admin.media.actions.download")}
              </Button>
              <Button
                appearance="ghost"
                aria-label={t("admin.media.actions.deleteAsset", {
                  name: assetDisplayName(asset, t),
                })}
                disabled={!canDeleteMedia || Boolean(assetBusy)}
                icon={<Trash2 size={15} />}
                onClick={() => openAssetDelete(asset)}
                title={canDeleteMedia ? undefined : mediaPermissionDescription("media:delete")}
              >
                {t("admin.media.actions.delete")}
              </Button>
            </div>
          );
        },
        header: t("admin.media.columns.actions"),
      },
    ],
    [
      assetBusy,
      canDeleteMedia,
      canDownloadMedia,
      canUpdateMedia,
      categoryNames,
      handleAssetDownload,
      i18n.language,
      mediaPermissionDescription,
      openAssetDelete,
      startAssetRename,
      t,
    ],
  );

  const updateDraft = (key: keyof MediaFilterDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateCategoryDraft = (key: keyof MediaCategoryDraft, value: string) => {
    setCategoryDraft((current) => ({ ...current, [key]: value }));
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
    setSelectedCategoryId(rootCategoryId);
    setPage(1);
    setPageSize(defaultPageSize);
  };

  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = categoryDraft.name.trim();
    if (!name) {
      setNotice({
        description: t("admin.media.categories.requiredDescription"),
        intent: "danger",
        title: t("admin.media.categories.requiredTitle"),
      });
      return;
    }
    if (!canUpdateMedia) {
      setMediaPermissionNotice("media:update");
      return;
    }
    if (categoryWriteUnavailable) {
      setNotice({
        description: categoryWriteUnavailableReason,
        intent: "danger",
        title: t("admin.media.messages.writeUnavailableTitle"),
      });
      return;
    }

    const id = editingCategory ? String(editingCategory.id) : "new";
    setCategoryBusy({ action: "save", id });
    setNotice(null);
    try {
      const saved = await systemApi.upsertMediaCategory({
        id: editingCategory?.id,
        name,
        parentId:
          categoryDraft.parentId === rootCategoryId || categoryDraft.parentId === ""
            ? undefined
            : categoryDraft.parentId,
        sort: parseSort(categoryDraft.sort),
      });
      await invalidateMediaCatalog();
      setEditingCategory(null);
      setCategoryFormMode(null);
      setCategoryDraft(initialCategoryDraft);
      setNotice({
        description: t(
          editingCategory
            ? "admin.media.messages.categoryUpdatedDescription"
            : "admin.media.messages.categoryCreatedDescription",
          {
            name: categoryDisplayName(saved, t),
          },
        ),
        intent: "info",
        title: t(
          editingCategory
            ? "admin.media.messages.categoryUpdatedTitle"
            : "admin.media.messages.categoryCreatedTitle",
        ),
      });
    } catch (error) {
      setNotice({
        description: adminErrorDescription(error, t, mediaErrorCopy),
        intent: "danger",
        title: t("admin.media.messages.categorySaveFailedTitle"),
      });
    } finally {
      setCategoryBusy((current) =>
        current?.action === "save" && current.id === id ? null : current,
      );
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryDeleteTarget) {
      return;
    }
    if (!canUpdateMedia) {
      setMediaPermissionNotice("media:update");
      return;
    }
    if (categoryWriteUnavailable) {
      setNotice({
        description: categoryWriteUnavailableReason,
        intent: "danger",
        title: t("admin.media.messages.writeUnavailableTitle"),
      });
      return;
    }

    const target = categoryDeleteTarget;
    const id = String(target.id);
    setCategoryBusy({ action: "delete", id });
    setNotice(null);
    try {
      await systemApi.deleteMediaCategory(target.id);
      if (selectedCategoryId === id) {
        setSelectedCategoryId(rootCategoryId);
        setPage(1);
      }
      setCategoryDeleteTarget(null);
      await invalidateMediaCatalog();
      setNotice({
        description: t("admin.media.messages.categoryDeletedDescription", {
          name: categoryDisplayName(target, t),
        }),
        intent: "info",
        title: t("admin.media.messages.categoryDeletedTitle"),
      });
    } catch (error) {
      setNotice({
        description: adminErrorDescription(error, t, mediaErrorCopy),
        intent: "danger",
        title: t("admin.media.messages.categoryDeleteFailedTitle"),
      });
    } finally {
      setCategoryBusy((current) =>
        current?.action === "delete" && current.id === id ? null : current,
      );
    }
  };

  const selectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
  };

  const refresh = () => {
    void categoryQuery.refetch();
    void assetsQuery.refetch();
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      return;
    }

    if (!canUploadMedia) {
      setMediaPermissionNotice("media:upload");
      input.value = "";
      return;
    }

    if (mediaWriteUnavailable) {
      setNotice({
        description: writeUnavailableReason,
        intent: "danger",
        title: t("admin.media.messages.writeUnavailableTitle"),
      });
      input.value = "";
      return;
    }

    setNotice(null);
    setUploading(true);
    try {
      for (const file of files) {
        await systemApi.uploadMediaAsset(file, selectedCategoryRequestId);
      }
      setPage(1);
      await invalidateMediaRecords();
      setNotice({
        description: t("admin.media.messages.uploadedDescription", {
          category: selectedCategoryLabel,
          count: files.length,
        }),
        intent: "info",
        title: t("admin.media.messages.uploadedTitle"),
      });
    } catch (error) {
      setNotice({
        description: adminErrorDescription(error, t, mediaErrorCopy),
        intent: "danger",
        title: t("admin.media.messages.uploadFailedTitle"),
      });
    } finally {
      input.value = "";
      setUploading(false);
    }
  };

  const submitURLImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = importText.trim();
    if (!text) {
      return;
    }

    if (!canImportMedia) {
      setMediaPermissionNotice("media:import");
      return;
    }

    if (mediaWriteUnavailable) {
      setNotice({
        description: writeUnavailableReason,
        intent: "danger",
        title: t("admin.media.messages.writeUnavailableTitle"),
      });
      return;
    }

    setImporting(true);
    setNotice(null);
    try {
      const result = await systemApi.importMediaURLs({
        categoryId: selectedCategoryRequestId,
        text,
      });
      setImportText("");
      setPage(1);
      await invalidateMediaRecords();
      setNotice({
        description: t("admin.media.messages.importedDescription", {
          category: selectedCategoryLabel,
          count: result.imported,
        }),
        intent: "info",
        title: t("admin.media.messages.importedTitle"),
      });
    } catch (error) {
      setNotice({
        description: adminErrorDescription(error, t, mediaErrorCopy),
        intent: "danger",
        title: t("admin.media.messages.importFailedTitle"),
      });
    } finally {
      setImporting(false);
    }
  };

  const submitAssetRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renamingAsset) {
      return;
    }
    if (!canUpdateMedia) {
      setMediaPermissionNotice("media:update");
      return;
    }
    const displayName = renameDraft.trim();
    if (!displayName) {
      setNotice({
        description: t("admin.media.rename.requiredDescription"),
        intent: "danger",
        title: t("admin.media.rename.requiredTitle"),
      });
      return;
    }

    const id = String(renamingAsset.id);
    setAssetBusy({ action: "rename", id });
    setNotice(null);
    try {
      const updated = await systemApi.updateMediaAsset(renamingAsset.id, { displayName });
      await invalidateMediaRecords();
      setRenamingAsset(null);
      setRenameDraft("");
      setNotice({
        description: t("admin.media.messages.renamedDescription", {
          name: assetDisplayName(updated, t),
        }),
        intent: "info",
        title: t("admin.media.messages.renamedTitle"),
      });
    } catch (error) {
      setNotice({
        description: adminErrorDescription(error, t, mediaErrorCopy),
        intent: "danger",
        title: t("admin.media.messages.renameFailedTitle"),
      });
    } finally {
      setAssetBusy((current) =>
        current?.action === "rename" && current.id === id ? null : current,
      );
    }
  };

  const confirmDeleteAsset = async () => {
    if (!deleteTarget) {
      return;
    }
    if (!canDeleteMedia) {
      setMediaPermissionNotice("media:delete");
      return;
    }
    const target = deleteTarget;
    const id = String(target.id);
    setAssetBusy({ action: "delete", id });
    setNotice(null);
    try {
      await systemApi.deleteMediaAsset(target.id);
      setDeleteTarget(null);
      await invalidateMediaRecords();
      setNotice({
        description: t("admin.media.messages.deletedDescription", {
          name: assetDisplayName(target, t),
        }),
        intent: "info",
        title: t("admin.media.messages.deletedTitle"),
      });
    } catch (error) {
      setNotice({
        description: adminErrorDescription(error, t, mediaErrorCopy),
        intent: "danger",
        title: t("admin.media.messages.deleteFailedTitle"),
      });
    } finally {
      setAssetBusy((current) =>
        current?.action === "delete" && current.id === id ? null : current,
      );
    }
  };

  const categoryFormTitle =
    categoryFormMode === "edit"
      ? t("admin.media.categories.editTitle")
      : t("admin.media.categories.createTitle");
  const categoryFormDescription =
    categoryFormMode === "edit"
      ? t("admin.media.categories.editDescription", {
          name: editingCategory
            ? categoryDisplayName(editingCategory, t)
            : t("admin.media.categories.unknown"),
        })
      : t("admin.media.categories.createDescription", {
          parent: selectedCategoryLabel,
        });
  const closeCategoryForm = () => {
    if (categoryBusy?.action === "save") {
      return;
    }
    setCategoryFormMode(null);
    setEditingCategory(null);
    setCategoryDraft(initialCategoryDraft);
  };
  const closeAssetRename = () => {
    if (assetBusy?.action === "rename") {
      return;
    }
    setRenamingAsset(null);
    setRenameDraft("");
  };

  return (
    <section className="console-admin-dashboard" aria-labelledby="admin-media-title">
      <div className="console-admin-page-header">
        <div>
          <Badge>{t("admin.media.badge")}</Badge>
          <h1 id="admin-media-title">{t("admin.media.title")}</h1>
          <p>{t("admin.media.description")}</p>
        </div>
        <Button
          appearance="secondary"
          icon={<RefreshCw size={17} />}
          loading={categoryQuery.isFetching || assetsQuery.isFetching}
          onClick={refresh}
        >
          {t("admin.media.actions.refresh")}
        </Button>
      </div>

      {categoryQuery.error || assetsQuery.error ? (
        <StateBlock
          intent="danger"
          title={adminErrorTitle(categoryQuery.error ?? assetsQuery.error, t, mediaErrorCopy)}
          description={adminErrorDescription(
            categoryQuery.error ?? assetsQuery.error,
            t,
            mediaErrorCopy,
          )}
        />
      ) : null}

      {notice ? (
        <StateBlock description={notice.description} intent={notice.intent} title={notice.title} />
      ) : null}

      <Drawer
        closeLabel={t("admin.media.actions.cancelCategory")}
        description={categoryFormDescription}
        open={Boolean(categoryFormMode)}
        title={categoryFormTitle}
        onOpenChange={(open) => {
          if (!open) {
            closeCategoryForm();
          }
        }}
      >
        <form onSubmit={(event) => void submitCategory(event)}>
          <FormField
            required
            help={t("admin.media.categories.nameHelp")}
            label={t("admin.media.categories.nameField")}
            value={categoryDraft.name}
            onChange={(event) => updateCategoryDraft("name", event.currentTarget.value)}
          />
          <SelectField
            help={t("admin.media.categories.parentHelp")}
            label={t("admin.media.categories.parentField")}
            options={categoryParentOptions}
            value={categoryDraft.parentId}
            onChange={(event) => updateCategoryDraft("parentId", event.currentTarget.value)}
          />
          <FormField
            help={t("admin.media.categories.sortHelp")}
            label={t("admin.media.categories.sortField")}
            min={0}
            type="number"
            value={categoryDraft.sort}
            onChange={(event) => updateCategoryDraft("sort", event.currentTarget.value)}
          />
          {categoryWriteUnavailable ? (
            <p className="console-media-muted">{categoryWriteUnavailableReason}</p>
          ) : null}
          <div className="console-media-category-action-panel-actions">
            <Button
              disabled={categorySaveDisabled}
              icon={<Save size={17} />}
              loading={categoryBusy?.action === "save"}
              title={canUpdateMedia ? undefined : mediaPermissionDescription("media:update")}
              type="submit"
            >
              {t("admin.media.actions.saveCategory")}
            </Button>
            <Button
              appearance="secondary"
              disabled={categoryBusy?.action === "save"}
              icon={<X size={17} />}
              onClick={closeCategoryForm}
            >
              {t("admin.media.actions.cancelCategory")}
            </Button>
          </div>
        </form>
      </Drawer>

      <Dialog
        closeLabel={t("admin.media.actions.cancelDelete")}
        description={
          categoryDeleteTarget
            ? t("admin.media.categories.deleteDescription", {
                name: categoryDisplayName(categoryDeleteTarget, t),
              })
            : undefined
        }
        footer={
          <div className="console-media-confirm-actions">
            <Button
              disabled={!canUpdateMedia}
              icon={<Trash2 size={17} />}
              loading={
                categoryBusy?.action === "delete" &&
                Boolean(categoryDeleteTarget) &&
                categoryBusy.id === String(categoryDeleteTarget?.id)
              }
              onClick={() => {
                void confirmDeleteCategory();
              }}
              title={canUpdateMedia ? undefined : mediaPermissionDescription("media:update")}
            >
              {t("admin.media.actions.confirmDeleteCategory")}
            </Button>
            <Button
              appearance="secondary"
              disabled={categoryBusy?.action === "delete"}
              icon={<X size={17} />}
              onClick={() => setCategoryDeleteTarget(null)}
            >
              {t("admin.media.actions.cancelDelete")}
            </Button>
          </div>
        }
        open={Boolean(categoryDeleteTarget)}
        title={t("admin.media.categories.deleteTitle")}
        onOpenChange={(open) => {
          if (!open && categoryBusy?.action !== "delete") {
            setCategoryDeleteTarget(null);
          }
        }}
      />

      <Drawer
        closeLabel={t("admin.media.actions.cancelRename")}
        description={
          renamingAsset
            ? t("admin.media.rename.description", {
                name: assetDisplayName(renamingAsset, t),
              })
            : undefined
        }
        open={Boolean(renamingAsset)}
        title={t("admin.media.rename.title")}
        onOpenChange={(open) => {
          if (!open) {
            closeAssetRename();
          }
        }}
      >
        {renamingAsset ? (
          <form onSubmit={(event) => void submitAssetRename(event)}>
            <FormField
              required
              disabled={!canUpdateMedia || assetBusy?.action === "rename"}
              help={t("admin.media.rename.help")}
              label={t("admin.media.rename.field")}
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.currentTarget.value)}
            />
            <div className="console-media-asset-action-panel-actions">
              <Button
                disabled={!canUpdateMedia}
                icon={<Save size={17} />}
                loading={
                  assetBusy?.action === "rename" && assetBusy.id === String(renamingAsset.id)
                }
                title={canUpdateMedia ? undefined : mediaPermissionDescription("media:update")}
                type="submit"
              >
                {t("admin.media.actions.saveRename")}
              </Button>
              <Button
                appearance="secondary"
                disabled={assetBusy?.action === "rename"}
                icon={<X size={17} />}
                onClick={closeAssetRename}
              >
                {t("admin.media.actions.cancelRename")}
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>

      <Dialog
        closeLabel={t("admin.media.actions.cancelDelete")}
        description={
          deleteTarget
            ? t("admin.media.delete.confirmDescription", {
                name: assetDisplayName(deleteTarget, t),
              })
            : undefined
        }
        footer={
          <div className="console-media-confirm-actions">
            <Button
              disabled={!canDeleteMedia}
              icon={<Trash2 size={17} />}
              loading={
                assetBusy?.action === "delete" &&
                Boolean(deleteTarget) &&
                assetBusy.id === String(deleteTarget?.id)
              }
              onClick={() => {
                void confirmDeleteAsset();
              }}
              title={canDeleteMedia ? undefined : mediaPermissionDescription("media:delete")}
            >
              {t("admin.media.actions.confirmDelete")}
            </Button>
            <Button
              appearance="secondary"
              disabled={assetBusy?.action === "delete"}
              icon={<X size={17} />}
              onClick={() => setDeleteTarget(null)}
            >
              {t("admin.media.actions.cancelDelete")}
            </Button>
          </div>
        }
        open={Boolean(deleteTarget)}
        title={t("admin.media.delete.confirmTitle")}
        onOpenChange={(open) => {
          if (!open && assetBusy?.action !== "delete") {
            setDeleteTarget(null);
          }
        }}
      />

      <div className="console-admin-stat-grid" aria-label={t("admin.media.summaryLabel")}>
        <MediaStatCard
          icon={<ImageIcon size={19} />}
          label={t("admin.media.metrics.assets")}
          value={
            pageData
              ? formatNumber(pageData.total, i18n.language)
              : fallbackValue(assetsQuery.isLoading, t)
          }
        />
        <MediaStatCard
          icon={<FolderTree size={19} />}
          label={t("admin.media.metrics.categories")}
          value={
            categoryQuery.data
              ? formatNumber(categoryQuery.data.total, i18n.language)
              : fallbackValue(categoryQuery.isLoading, t)
          }
        />
        <MediaStatCard
          icon={<HardDrive size={19} />}
          label={t("admin.media.metrics.storage")}
          value={
            storageStatus
              ? storageStatusLabel(storageStatus, t)
              : fallbackValue(assetsQuery.isLoading, t)
          }
        />
        <MediaStatCard
          icon={<Layers3 size={19} />}
          label={t("admin.media.metrics.uploadLimit")}
          value={
            pageData
              ? formatUploadLimit(pageData.uploadMaxMb, i18n.language, t)
              : fallbackValue(assetsQuery.isLoading, t)
          }
        />
        <MediaStatCard
          icon={<File size={19} />}
          label={t("admin.media.metrics.currentPage")}
          value={formatNumber(currentPageCount, i18n.language)}
        />
      </div>

      <Collapse
        description={t("admin.media.filters.description")}
        title={t("admin.media.filters.title")}
      >
        <form
          className="console-admin-filter-form console-admin-filter-form--compact"
          onSubmit={submitFilters}
        >
          <FormField
            label={t("admin.media.filters.keyword")}
            value={draft.keyword}
            onChange={(event) => updateDraft("keyword", event.currentTarget.value)}
          />
          <FormField
            label={t("admin.media.filters.pageSize")}
            max={100}
            min={1}
            type="number"
            value={draft.pageSize}
            onChange={(event) => updateDraft("pageSize", event.currentTarget.value)}
          />
          <div className="console-admin-filter-actions">
            <Button icon={<Search size={17} />} loading={assetsQuery.isFetching} type="submit">
              {t("admin.media.actions.search")}
            </Button>
            <Button appearance="secondary" icon={<RotateCcw size={17} />} onClick={resetFilters}>
              {t("admin.media.actions.reset")}
            </Button>
          </div>
        </form>
      </Collapse>

      <Collapse
        className="console-media-write-panel"
        description={t("admin.media.write.description", { category: selectedCategoryLabel })}
        title={t("admin.media.write.title")}
      >
        <div className="console-media-write-grid">
          <div className="console-media-write-section">
            <div className="console-media-write-heading">
              <span aria-hidden="true">
                <UploadCloud size={19} />
              </span>
              <div>
                <h3>{t("admin.media.write.upload.title")}</h3>
                <p>
                  {t("admin.media.write.upload.description", {
                    limit: pageData
                      ? formatUploadLimit(pageData.uploadMaxMb, i18n.language, t)
                      : fallbackValue(assetsQuery.isLoading, t),
                  })}
                </p>
              </div>
            </div>
            <input
              ref={uploadInputRef}
              aria-label={t("admin.media.a11y.fileInput")}
              className="console-sr-only"
              multiple
              type="file"
              onChange={(event) => {
                void handleFileSelection(event);
              }}
            />
            <dl className="console-media-write-meta">
              <div>
                <dt>{t("admin.media.write.targetCategory")}</dt>
                <dd>{selectedCategoryLabel}</dd>
              </div>
              <div>
                <dt>{t("admin.media.write.storage")}</dt>
                <dd>
                  {storageStatus
                    ? storageStatusLabel(storageStatus, t)
                    : fallbackValue(assetsQuery.isLoading || categoryQuery.isLoading, t)}
                </dd>
              </div>
            </dl>
            {mediaWriteUnavailable ? (
              <p className="console-media-muted">{writeUnavailableReason}</p>
            ) : null}
            <div className="console-media-write-actions">
              <Button
                disabled={uploadDisabled}
                icon={<UploadCloud size={17} />}
                loading={uploading}
                onClick={() => uploadInputRef.current?.click()}
                title={canUploadMedia ? undefined : mediaPermissionDescription("media:upload")}
              >
                {t("admin.media.actions.upload")}
              </Button>
            </div>
          </div>

          <form
            className="console-media-write-section"
            onSubmit={(event) => {
              void submitURLImport(event);
            }}
          >
            <div className="console-media-write-heading">
              <span aria-hidden="true">
                <Link2 size={19} />
              </span>
              <div>
                <h3>{t("admin.media.write.import.title")}</h3>
                <p>{t("admin.media.write.import.description")}</p>
              </div>
            </div>
            <div className="console-form-field">
              <label htmlFor="admin-media-url-import">{t("admin.media.write.import.label")}</label>
              <textarea
                id="admin-media-url-import"
                aria-describedby="admin-media-url-import-help"
                disabled={!canImportMedia || uploading || importing}
                rows={5}
                value={importText}
                placeholder={t("admin.media.write.import.placeholder")}
                onChange={(event) => setImportText(event.currentTarget.value)}
              />
              <span id="admin-media-url-import-help" className="console-form-field__help">
                {t("admin.media.write.import.help")}
              </span>
            </div>
            <div className="console-media-write-actions">
              <Button
                disabled={importDisabled}
                icon={<Link2 size={17} />}
                loading={importing}
                title={canImportMedia ? undefined : mediaPermissionDescription("media:import")}
                type="submit"
              >
                {t("admin.media.actions.importUrls")}
              </Button>
            </div>
          </form>
        </div>
      </Collapse>

      <section className="console-media-workbench">
        <aside className="console-admin-panel console-media-categories">
          <header className="console-admin-panel-header-row">
            <div>
              <h2>{t("admin.media.categories.title")}</h2>
              <p>
                {t("admin.media.categories.count", {
                  count: categoryQuery.data?.total ?? 0,
                })}
              </p>
            </div>
            <Button
              appearance="secondary"
              aria-label={t("admin.media.actions.createCategory")}
              className="console-icon-button"
              disabled={!canUpdateMedia || categoryWriteUnavailable || Boolean(categoryBusy)}
              icon={<Plus size={17} />}
              onClick={openCreateCategory}
              title={canUpdateMedia ? undefined : mediaPermissionDescription("media:update")}
            >
              <span className="console-sr-only">{t("admin.media.actions.createCategory")}</span>
            </Button>
          </header>
          <div
            className="console-media-category-list"
            aria-label={t("admin.media.categories.title")}
          >
            <button
              type="button"
              className="console-media-category-button"
              aria-pressed={selectedCategoryId === rootCategoryId}
              onClick={() => selectCategory(rootCategoryId)}
            >
              <FolderTree aria-hidden="true" size={17} />
              <span>
                <strong>{t("admin.media.categories.all")}</strong>
                <small>{t("admin.media.categories.root")}</small>
              </span>
            </button>
            {categoryQuery.isLoading ? (
              <p className="console-media-muted">{t("admin.media.states.loadingDescription")}</p>
            ) : flatCategories.length > 0 ? (
              flatCategories.map(({ category, depth }) => (
                <div key={category.id} className="console-media-category-item">
                  <button
                    type="button"
                    className="console-media-category-button"
                    style={{ "--console-media-category-depth": depth } as CSSProperties}
                    aria-pressed={String(category.id) === selectedCategoryId}
                    onClick={() => selectCategory(String(category.id))}
                  >
                    <FolderTree aria-hidden="true" size={17} />
                    <span>
                      <strong>{category.name || t("admin.media.categories.unknown")}</strong>
                      <small>{formatDate(category.updatedAt, i18n.language)}</small>
                    </span>
                  </button>
                  <div className="console-media-category-actions">
                    <Button
                      appearance="ghost"
                      aria-label={t("admin.media.actions.editCategory", {
                        name: categoryDisplayName(category, t),
                      })}
                      className="console-icon-button"
                      disabled={!canUpdateMedia || Boolean(categoryBusy)}
                      icon={<Pencil size={15} />}
                      onClick={() => openEditCategory(category)}
                      title={
                        canUpdateMedia ? undefined : mediaPermissionDescription("media:update")
                      }
                    >
                      <span className="console-sr-only">{t("admin.media.actions.edit")}</span>
                    </Button>
                    <Button
                      appearance="ghost"
                      aria-label={t("admin.media.actions.deleteCategory", {
                        name: categoryDisplayName(category, t),
                      })}
                      className="console-icon-button"
                      disabled={!canUpdateMedia || Boolean(categoryBusy)}
                      icon={<Trash2 size={15} />}
                      onClick={() => openCategoryDelete(category)}
                      title={
                        canUpdateMedia ? undefined : mediaPermissionDescription("media:update")
                      }
                    >
                      <span className="console-sr-only">{t("admin.media.actions.delete")}</span>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="console-media-muted">{t("admin.media.categories.empty")}</p>
            )}
          </div>
        </aside>

        <section className="console-admin-panel console-media-assets">
          <header className="console-admin-panel-header-row">
            <div>
              <h2>{t("admin.media.list.title")}</h2>
              <p>
                {t("admin.media.list.description", {
                  category: selectedCategoryLabel,
                  count: pageData?.total ?? 0,
                })}
              </p>
            </div>
            <div className="console-admin-pager" aria-label={t("admin.media.pagination.label")}>
              <Button
                appearance="secondary"
                disabled={page <= 1 || assetsQuery.isFetching}
                icon={<ChevronLeft size={17} />}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {t("admin.media.pagination.previous")}
              </Button>
              <span>
                {t("admin.media.pagination.pageStatus", {
                  page,
                  totalPages,
                })}
              </span>
              <Button
                appearance="secondary"
                disabled={page >= totalPages || assetsQuery.isFetching}
                icon={<ChevronRight size={17} />}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                {t("admin.media.pagination.next")}
              </Button>
            </div>
          </header>

          {assetsQuery.isLoading ? (
            <TableSkeleton
              caption={t("admin.media.states.loadingDescription")}
              columns={9}
              rows={pageSize}
            />
          ) : pageData ? (
            <>
              {pageData.storageStatus === "persisted" &&
              categoryQuery.data?.storageStatus === "persisted" ? null : (
                <StateBlock
                  title={t("admin.media.states.storageUnavailableTitle")}
                  description={t("admin.media.states.storageUnavailableDescription")}
                />
              )}
              {pageData.uploadUnavailable ? (
                <StateBlock
                  title={t("admin.media.states.uploadUnavailableTitle")}
                  description={t("admin.media.states.uploadUnavailableDescription")}
                />
              ) : null}
              <div className="console-media-table">
                <DataTable
                  columns={mediaColumns}
                  data={pageData.items}
                  emptyLabel={t("admin.media.empty")}
                />
              </div>
            </>
          ) : (
            <StateBlock
              title={t("admin.media.states.emptyTitle")}
              description={t("admin.media.states.emptyDescription")}
            />
          )}
        </section>
      </section>
    </section>
  );
}

type MediaStatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function MediaStatCard({ icon, label, value }: MediaStatCardProps) {
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

function MediaPreview({ asset }: { asset: SystemMediaAsset }) {
  const [previewFailed, setPreviewFailed] = useState(false);

  if (asset.external && asset.url && isImageAsset(asset) && !previewFailed) {
    return (
      <span className="console-media-preview">
        <img src={asset.url} alt="" loading="lazy" onError={() => setPreviewFailed(true)} />
      </span>
    );
  }

  const Icon = isImageAsset(asset) ? ImageIcon : File;

  return (
    <span className="console-media-preview" data-kind="icon">
      <Icon aria-hidden="true" size={20} />
    </span>
  );
}

function assetDisplayName(asset: SystemMediaAsset, t: ReturnType<typeof useTranslation>["t"]) {
  return asset.displayName || asset.originalName || t("admin.media.values.unknownAsset");
}

function categoryDisplayName(
  category: SystemMediaCategory,
  t: ReturnType<typeof useTranslation>["t"],
) {
  return category.name || t("admin.media.categories.unknown");
}

function collectCategoryTreeIds(category: SystemMediaCategory) {
  const ids = new Set<string>([String(category.id)]);
  for (const child of category.children ?? []) {
    for (const id of collectCategoryTreeIds(child)) {
      ids.add(id);
    }
  }
  return ids;
}

function mediaDownloadFilename(asset: SystemMediaAsset) {
  const fallback = asset.displayName || asset.originalName || `media-${asset.id}`;
  const extension = asset.extension ? asset.extension.replace(/^\./, "") : "";
  if (!extension || fallback.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
    return fallback;
  }
  return `${fallback}.${extension}`;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function normalizeFilters(draft: MediaFilterDraft): MediaFilters {
  return {
    keyword: trimmedOrUndefined(draft.keyword),
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

function parseSort(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.trunc(parsed));
}

function flattenCategories(categories: SystemMediaCategory[], depth = 0): FlatCategory[] {
  return categories.flatMap((category) => [
    { category, depth },
    ...flattenCategories(category.children ?? [], depth + 1),
  ]);
}

function buildCategoryNameMap(categories: FlatCategory[]) {
  return new Map(categories.map(({ category }) => [String(category.id), category.name]));
}

function categoryName(
  categoryId: number | string | undefined,
  categoryNames: Map<string, string>,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (categoryId === undefined || categoryId === null || String(categoryId) === rootCategoryId) {
    return t("admin.media.values.noCategory");
  }
  return categoryNames.get(String(categoryId)) ?? t("admin.media.categories.unknown");
}

function fallbackValue(loading: boolean, t: ReturnType<typeof useTranslation>["t"]) {
  return loading ? t("loading.app") : t("common.labels.none");
}

function sourceLabel(source: string, t: ReturnType<typeof useTranslation>["t"]) {
  if (source === "upload") {
    return t("admin.media.source.upload");
  }
  if (source === "resumable") {
    return t("admin.media.source.resumable");
  }
  if (source === "url") {
    return t("admin.media.source.url");
  }
  return source;
}

function storageStatusLabel(status: string, t: ReturnType<typeof useTranslation>["t"]) {
  if (status === "persisted") {
    return t("admin.media.storage.persisted");
  }
  if (status === "unavailable") {
    return t("admin.media.storage.unavailable");
  }
  return status || t("admin.media.storage.unknown");
}

function isImageAsset(asset: SystemMediaAsset) {
  const mimeType = asset.mimeType.toLowerCase();
  const extension = asset.extension.toLowerCase();
  return (
    mimeType.startsWith("image/") ||
    ["avif", "gif", "jpeg", "jpg", "png", "svg", "webp"].includes(extension)
  );
}

function formatUploadLimit(
  value: number,
  locale: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (!Number.isFinite(value) || value <= 0) {
    return t("common.labels.none");
  }
  return t("admin.media.values.uploadLimit", {
    value: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value),
  });
}

function formatBytes(value: number, locale: string, t: ReturnType<typeof useTranslation>["t"]) {
  if (!Number.isFinite(value) || value < 0) {
    return t("admin.media.values.unknownSize");
  }

  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(size)} ${units[unitIndex]}`;
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
