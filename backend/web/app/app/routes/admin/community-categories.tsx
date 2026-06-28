import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ListTree, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "~/components/console/patterns/DataTable";
import { FormField } from "~/components/console/patterns/FormField";
import { SelectField, type SelectOption } from "~/components/console/patterns/SelectField";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { adminErrorDescription } from "~/features/admin/error-state";
import { CommunityStatCard, formatCommunityNumber, type CommunityNotice } from "~/features/community/admin-components";
import { queryKeys } from "~/lib/api/query-keys";
import {
  systemApi,
  type SystemDictionaryInput,
  type SystemDictionaryItemInput,
  type SystemDictionaryItemUpdateInput,
} from "~/lib/api/system";
import type { SystemDictionary, SystemDictionaryItem } from "~/lib/api/types";
import { hasSessionPermission, useAuthStore } from "~/stores/auth-store";

const communityCategoryDictionaryCode = "community.video.category";
const categorySlugPattern = /^[a-z0-9][a-z0-9_-]{0,95}$/;
const emptyItems: SystemDictionaryItem[] = [];

const categoryErrorCopy = {
  defaultTitle: "admin.community.categories.states.errorTitle",
  permissionDescription: "admin.community.categories.states.permissionDescription",
  permissionTitle: "admin.community.categories.states.permissionTitle",
  storageUnavailableDescription: "admin.community.categories.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.community.categories.states.storageUnavailableTitle",
};

type CategoryDraft = {
  accentColor: string;
  description: string;
  label: string;
  parentSlug: string;
  sort: string;
  status: "active" | "disabled";
  value: string;
};

type CategoryFormState =
  | {
      mode: "create";
    }
  | {
      item: SystemDictionaryItem;
      mode: "edit";
    };

const emptyDraft: CategoryDraft = {
  accentColor: "",
  description: "",
  label: "",
  parentSlug: "",
  sort: "10",
  status: "active",
  value: "",
};

export default function AdminCommunityCategoriesRoute() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const productCode = useAuthStore((state) => state.productCode);
  const [formState, setFormState] = useState<CategoryFormState>({ mode: "create" });
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft);
  const [notice, setNotice] = useState<CommunityNotice | null>(null);
  const [deleteItem, setDeleteItem] = useState<SystemDictionaryItem | null>(null);

  const canReadDictionaries = hasSessionPermission(permissions, {
    code: "dictionary:read",
    productCode: productCode || undefined,
    scope: "platform",
  });
  const canCreateDictionaries = hasSessionPermission(permissions, {
    code: "dictionary:create",
    productCode: productCode || undefined,
    scope: "platform",
  });
  const canUpdateDictionaries = hasSessionPermission(permissions, {
    code: "dictionary:update",
    productCode: productCode || undefined,
    scope: "platform",
  });
  const canDeleteDictionaries = hasSessionPermission(permissions, {
    code: "dictionary:delete",
    productCode: productCode || undefined,
    scope: "platform",
  });

  const dictionariesQuery = useQuery({
    enabled: canReadDictionaries,
    queryFn: ({ signal }) => systemApi.listDictionaries({ signal }),
    queryKey: queryKeys.system.dictionaries(i18n.language),
  });

  const dictionary = useMemo(
    () =>
      dictionariesQuery.data?.items.find((item) => item.code === communityCategoryDictionaryCode) ??
      null,
    [dictionariesQuery.data?.items],
  );
  const categories = useMemo(
    () => [...(dictionary?.items ?? emptyItems)].sort(compareCategoryItems),
    [dictionary?.items],
  );
  const parentOptions = useMemo<SelectOption[]>(
    () => [
      { label: t("admin.community.categories.controls.noParent"), value: "" },
      ...categories
        .filter((item) => formState.mode !== "edit" || item.value !== formState.item.value)
        .map((item) => ({ label: `${item.label} (${item.value})`, value: item.value })),
    ],
    [categories, formState, t],
  );

  const invalidateDictionaries = () =>
    queryClient.invalidateQueries({ queryKey: ["system", "dictionaries"] });

  const resetForm = () => {
    setFormState({ mode: "create" });
    setDraft(emptyDraft);
  };

  const createDictionaryMutation = useMutation({
    mutationFn: (input: SystemDictionaryInput) => systemApi.createDictionary(input),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, categoryErrorCopy),
        intent: "danger",
        title: t("admin.community.categories.messages.dictionaryCreateFailedTitle"),
      });
    },
    onSuccess: () => {
      setNotice({
        description: t("admin.community.categories.messages.dictionaryCreatedDescription"),
        title: t("admin.community.categories.messages.dictionaryCreatedTitle"),
      });
      void invalidateDictionaries();
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (input: { dictionary: SystemDictionary; value: SystemDictionaryItemInput }) =>
      systemApi.createDictionaryItem(input.dictionary.id, input.value),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, categoryErrorCopy),
        intent: "danger",
        title: t("admin.community.categories.messages.saveFailedTitle"),
      });
    },
    onSuccess: (item) => {
      resetForm();
      setNotice({
        description: t("admin.community.categories.messages.createdDescription", {
          name: item.label,
        }),
        title: t("admin.community.categories.messages.createdTitle"),
      });
      void invalidateDictionaries();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (input: { id: number | string; value: SystemDictionaryItemUpdateInput }) =>
      systemApi.updateDictionaryItem(input.id, input.value),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, categoryErrorCopy),
        intent: "danger",
        title: t("admin.community.categories.messages.saveFailedTitle"),
      });
    },
    onSuccess: (item) => {
      resetForm();
      setNotice({
        description: t("admin.community.categories.messages.updatedDescription", {
          name: item.label,
        }),
        title: t("admin.community.categories.messages.updatedTitle"),
      });
      void invalidateDictionaries();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (item: SystemDictionaryItem) => systemApi.deleteDictionaryItem(item.id),
    onError: (error) => {
      setNotice({
        description: adminErrorDescription(error, t, categoryErrorCopy),
        intent: "danger",
        title: t("admin.community.categories.messages.deleteFailedTitle"),
      });
    },
    onSuccess: (_result, item) => {
      setDeleteItem(null);
      if (formState.mode === "edit" && formState.item.id === item.id) {
        resetForm();
      }
      setNotice({
        description: t("admin.community.categories.messages.deletedDescription", {
          name: item.label,
        }),
        title: t("admin.community.categories.messages.deletedTitle"),
      });
      void invalidateDictionaries();
    },
  });

  const columns = useMemo<ColumnDef<SystemDictionaryItem>[]>(
    () => [
      {
        cell: ({ row }) => (
          <div className="console-community-identity">
            <strong>{row.original.label}</strong>
            <code className="console-audit-code">{row.original.value}</code>
            <span>{parseCategoryExtra(row.original.extra).description || t("common.labels.none")}</span>
          </div>
        ),
        header: t("admin.community.categories.columns.category"),
      },
      {
        cell: ({ row }) => {
          const extra = parseCategoryExtra(row.original.extra);
          return extra.parentSlug || t("common.labels.none");
        },
        header: t("admin.community.categories.columns.parent"),
      },
      {
        accessorKey: "sort",
        header: t("admin.community.categories.columns.sort"),
      },
      {
        cell: ({ row }) => categoryStatusLabel(row.original.status, t),
        header: t("admin.community.categories.columns.status"),
      },
      {
        cell: ({ row }) => (
          <div className="console-community-row-actions">
            <Button
              appearance="secondary"
              disabled={!canUpdateDictionaries}
              icon={<Pencil size={16} />}
              onClick={() => editCategory(row.original)}
            >
              {t("admin.community.categories.actions.edit")}
            </Button>
            <Button
              appearance="ghost"
              disabled={!canDeleteDictionaries}
              icon={<Trash2 size={16} />}
              onClick={() => setDeleteItem(row.original)}
            >
              {t("admin.community.categories.actions.delete")}
            </Button>
          </div>
        ),
        header: t("admin.community.categories.columns.actions"),
      },
    ],
    [canDeleteDictionaries, canUpdateDictionaries, t],
  );

  const activeCount = categories.filter((item) => item.status === "active").length;
  const rootCount = categories.filter((item) => !parseCategoryExtra(item.extra).parentSlug).length;
  const disabled = !dictionary || !canUpdateDictionaries;
  const saving = createItemMutation.isPending || updateItemMutation.isPending;

  function editCategory(item: SystemDictionaryItem) {
    const extra = parseCategoryExtra(item.extra);
    setDeleteItem(null);
    setFormState({ item, mode: "edit" });
    setDraft({
      accentColor: extra.accentColor,
      description: extra.description,
      label: item.label,
      parentSlug: extra.parentSlug,
      sort: String(item.sort),
      status: item.status === "disabled" ? "disabled" : "active",
      value: item.value,
    });
  }

  function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!dictionary) {
      return;
    }
    const value = draft.value.trim();
    const label = draft.label.trim();
    const parentSlug = draft.parentSlug.trim();
    const sort = Number.parseInt(draft.sort, 10);
    if (!categorySlugPattern.test(value) || !label || Number.isNaN(sort)) {
      setNotice({
        description: t("admin.community.categories.validation.description"),
        intent: "danger",
        title: t("admin.community.categories.validation.title"),
      });
      return;
    }
    if (parentSlug && parentSlug === value) {
      setNotice({
        description: t("admin.community.categories.validation.parentDescription"),
        intent: "danger",
        title: t("admin.community.categories.validation.title"),
      });
      return;
    }
    const input = {
      extra: stringifyCategoryExtra({
        accentColor: draft.accentColor.trim(),
        description: draft.description.trim(),
        parentSlug,
      }),
      label,
      sort,
      status: draft.status,
      value,
    };
    if (formState.mode === "edit") {
      updateItemMutation.mutate({
        id: formState.item.id,
        value: input,
      });
      return;
    }
    createItemMutation.mutate({ dictionary, value: input });
  }

  return (
    <section className="console-admin-dashboard" aria-labelledby="admin-community-categories-title">
      <header className="console-admin-header">
        <div>
          <Badge>{t("admin.community.categories.badge")}</Badge>
          <h1 id="admin-community-categories-title">{t("admin.community.categories.title")}</h1>
          <p>{t("admin.community.categories.description")}</p>
        </div>
        <div className="console-admin-actions">
          <Button
            appearance="secondary"
            disabled={!canReadDictionaries}
            icon={<RefreshCw size={16} />}
            loading={dictionariesQuery.isFetching}
            onClick={() => void dictionariesQuery.refetch()}
          >
            {t("admin.community.actions.refresh")}
          </Button>
          {!dictionary ? (
            <Button
              disabled={!canCreateDictionaries}
              icon={<ListTree size={16} />}
              loading={createDictionaryMutation.isPending}
              onClick={() =>
                createDictionaryMutation.mutate({
                  code: communityCategoryDictionaryCode,
                  description: t("admin.community.categories.dictionary.description"),
                  name: t("admin.community.categories.dictionary.name"),
                  status: "active",
                })
              }
            >
              {t("admin.community.categories.actions.createDictionary")}
            </Button>
          ) : null}
        </div>
      </header>

      {!canReadDictionaries ? (
        <StateBlock
          title={t("admin.community.categories.states.permissionTitle")}
          description={t("admin.community.categories.states.permissionDescription")}
        />
      ) : null}

      {notice ? <StateBlock title={notice.title} description={notice.description} intent={notice.intent} /> : null}

      {dictionariesQuery.isError ? (
        <StateBlock
          title={t("admin.community.categories.states.errorTitle")}
          description={adminErrorDescription(dictionariesQuery.error, t, categoryErrorCopy)}
          intent="danger"
        />
      ) : null}

      {canReadDictionaries && dictionariesQuery.data?.storageStatus === "unavailable" ? (
        <StateBlock
          title={t("admin.community.categories.states.storageUnavailableTitle")}
          description={t("admin.community.categories.states.storageUnavailableDescription")}
          intent="danger"
        />
      ) : null}

      {canReadDictionaries && !dictionary && !dictionariesQuery.isLoading ? (
        <StateBlock
          title={t("admin.community.categories.states.dictionaryMissingTitle")}
          description={t("admin.community.categories.states.dictionaryMissingDescription")}
        />
      ) : null}

      <div className="console-admin-stat-grid" aria-label={t("admin.community.categories.summaryLabel")}>
        <CommunityStatCard
          icon={<ListTree size={18} />}
          label={t("admin.community.categories.metrics.total")}
          value={formatCommunityNumber(categories.length, i18n.language)}
        />
        <CommunityStatCard
          icon={<ListTree size={18} />}
          label={t("admin.community.categories.metrics.active")}
          value={formatCommunityNumber(activeCount, i18n.language)}
        />
        <CommunityStatCard
          icon={<ListTree size={18} />}
          label={t("admin.community.categories.metrics.roots")}
          value={formatCommunityNumber(rootCount, i18n.language)}
        />
      </div>

      {dictionary && !canUpdateDictionaries ? (
        <StateBlock
          title={t("admin.community.categories.states.updatePermissionTitle")}
          description={t("admin.community.categories.states.updatePermissionDescription")}
        />
      ) : null}

      <section className="console-admin-card">
        <div className="console-admin-card__header">
          <div>
            <h2>{t("admin.community.categories.form.title")}</h2>
            <p>{t("admin.community.categories.form.description")}</p>
          </div>
          {formState.mode === "edit" ? (
            <Button appearance="ghost" icon={<X size={16} />} onClick={resetForm}>
              {t("admin.community.categories.actions.cancelEdit")}
            </Button>
          ) : null}
        </div>
        <form className="console-admin-filter-grid" onSubmit={submitCategory}>
          <FormField
            disabled={disabled || formState.mode === "edit"}
            label={t("admin.community.categories.controls.slug")}
            value={draft.value}
            onChange={(event) => setDraft((value) => ({ ...value, value: event.target.value }))}
          />
          <FormField
            disabled={disabled}
            label={t("admin.community.categories.controls.label")}
            value={draft.label}
            onChange={(event) => setDraft((value) => ({ ...value, label: event.target.value }))}
          />
          <SelectField
            disabled={disabled}
            label={t("admin.community.categories.controls.parent")}
            options={parentOptions}
            value={draft.parentSlug}
            onChange={(event) => setDraft((value) => ({ ...value, parentSlug: event.target.value }))}
          />
          <FormField
            disabled={disabled}
            label={t("admin.community.categories.controls.sort")}
            type="number"
            value={draft.sort}
            onChange={(event) => setDraft((value) => ({ ...value, sort: event.target.value }))}
          />
          <FormField
            disabled={disabled}
            label={t("admin.community.categories.controls.accentColor")}
            value={draft.accentColor}
            onChange={(event) => setDraft((value) => ({ ...value, accentColor: event.target.value }))}
          />
          <SelectField
            disabled={disabled}
            label={t("admin.community.categories.controls.status")}
            options={[
              { label: t("admin.community.accountStatus.active"), value: "active" },
              { label: t("admin.community.accountStatus.disabled"), value: "disabled" },
            ]}
            value={draft.status}
            onChange={(event) =>
              setDraft((value) => ({
                ...value,
                status: event.target.value === "disabled" ? "disabled" : "active",
              }))
            }
          />
          <FormField
            className="console-admin-filter-grid__wide"
            disabled={disabled}
            label={t("admin.community.categories.controls.description")}
            value={draft.description}
            onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))}
          />
          <div className="console-admin-filter-actions">
            <Button disabled={disabled} icon={<Plus size={16} />} onClick={resetForm}>
              {t("admin.community.categories.actions.new")}
            </Button>
            <Button disabled={disabled} icon={<Save size={16} />} loading={saving} type="submit">
              {formState.mode === "edit"
                ? t("admin.community.categories.actions.save")
                : t("admin.community.categories.actions.create")}
            </Button>
          </div>
        </form>
      </section>

      {deleteItem ? (
        <StateBlock
          title={t("admin.community.categories.delete.title")}
          description={t("admin.community.categories.delete.description", {
            name: deleteItem.label,
          })}
          intent="danger"
          action={
            <div className="console-community-row-actions">
              <Button appearance="ghost" icon={<X size={16} />} onClick={() => setDeleteItem(null)}>
                {t("admin.community.categories.actions.cancel")}
              </Button>
              <Button
                icon={<Trash2 size={16} />}
                loading={deleteItemMutation.isPending}
                onClick={() => deleteItemMutation.mutate(deleteItem)}
              >
                {t("admin.community.categories.actions.confirmDelete")}
              </Button>
            </div>
          }
        />
      ) : null}

      <section className="console-admin-card">
        <div className="console-admin-card__header">
          <div>
            <h2>{t("admin.community.categories.list.title")}</h2>
            <p>{t("admin.community.categories.list.description", { count: categories.length })}</p>
          </div>
        </div>
        <DataTable
          caption={dictionariesQuery.isLoading ? t("admin.community.categories.states.loadingDescription") : undefined}
          columns={columns}
          data={categories}
          emptyLabel={t("admin.community.categories.empty")}
        />
      </section>
    </section>
  );
}

function parseCategoryExtra(value: string) {
  if (!value.trim()) {
    return { accentColor: "", description: "", parentSlug: "" };
  }
  try {
    const raw = JSON.parse(value) as Partial<Record<"accentColor" | "description" | "parentSlug", string>>;
    return {
      accentColor: typeof raw.accentColor === "string" ? raw.accentColor : "",
      description: typeof raw.description === "string" ? raw.description : "",
      parentSlug: typeof raw.parentSlug === "string" ? raw.parentSlug : "",
    };
  } catch {
    return { accentColor: "", description: "", parentSlug: "" };
  }
}

function stringifyCategoryExtra(input: { accentColor: string; description: string; parentSlug: string }) {
  const value = Object.fromEntries(
    Object.entries(input).filter(([, item]) => item.trim() !== ""),
  );
  return Object.keys(value).length === 0 ? "" : JSON.stringify(value);
}

function compareCategoryItems(a: SystemDictionaryItem, b: SystemDictionaryItem) {
  if (a.sort === b.sort) {
    return a.value.localeCompare(b.value);
  }
  return a.sort - b.sort;
}

function categoryStatusLabel(status: string, t: (key: string) => string) {
  if (status === "disabled") {
    return t("admin.community.accountStatus.disabled");
  }
  return t("admin.community.accountStatus.active");
}
