import { useMemo } from "react";
import { Button, EmptyState, InlineAlert, PageHeader, PageSection } from "@webui/sdk/ui";
import { useOptionalHostRuntime } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { webuiOpenAPISpec, webuiOpenAPISpecSourceRevision } from "@webui/generated/openapi-spec";
import { MethodBadge } from "./MethodBadge";
import { useOpenAPICommand } from "./command-context";
import { groupedOperations, isOpenAPIDocument, OPENAPI_HTTP_METHODS, type OpenAPIDocument } from "./openapi-data";
import styles from "./openapi.module.css";

// OpenAPIOverviewPage is the module landing route (/openapi, 075-007): it
// presents the contract categories (one card per OpenAPI tag with its method
// inventory and operation count) plus the data-models entry, and navigates to
// the tag list or models pages. Nothing here issues requests, so the page is
// fully renderable from the generated contract snapshot.
export default function OpenAPIOverviewPage() {
  const { t } = useWebUITranslation("webui.openapi");
  const runtime = useOptionalHostRuntime();
  const navigate = runtime?.navigate;
  const openPalette = useOpenAPICommand();
  const usable = isOpenAPIDocument(webuiOpenAPISpec);
  const document = webuiOpenAPISpec as unknown as OpenAPIDocument;
  const groups = useMemo(() => (usable ? groupedOperations(document) : []), [usable, document]);
  const modelNames = useMemo(() => Object.keys(document.components?.schemas ?? {}), [document]);
  const totalOperations = groups.reduce((sum, group) => sum + group.operations.length, 0);

  return <div className="module-page">
    <PageHeader eyebrow={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.docs.title")} description={t("webui.openapi.docs.description")} actions={openPalette ? <Button variant="secondary" onClick={openPalette}>{t("webui.openapi.palette.title")}</Button> : undefined} />
    <div className="page-sections">
      {!usable
        ? <InlineAlert tone="danger" title={t("webui.openapi.docs.unavailable")} />
        : <>
          <PageSection kicker={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.docs.legend.title")} description={t("webui.openapi.docs.legend.detail")}>
            <p className={styles.pageMeta}>{t("webui.openapi.docs.contract", { title: document.info?.title ?? "", version: document.info?.version ?? "" })}</p>
            <p className={styles.pageMeta}>{t("webui.openapi.docs.source", { revision: webuiOpenAPISpecSourceRevision })}</p>
            <p className={styles.pageMeta}>{t("webui.openapi.overview.total", { total: totalOperations, models: modelNames.length })}</p>
          </PageSection>
          <PageSection title={t("webui.openapi.overview.categories.title")} description={t("webui.openapi.overview.categories.detail")}>
            {groups.length === 0
              ? <EmptyState title={t("webui.openapi.overview.categories.empty")} />
              : <div className={styles.categoryGrid}>{groups.map((group) => <CategoryCard key={group.tag} tag={group.tag} count={group.operations.length} methods={uniqueMethods(group.operations.map((operation) => operation.method))} onOpen={() => navigate?.(`/openapi/tags?tag=${encodeURIComponent(group.tag)}`)} t={t} />)}</div>}
          </PageSection>
          <PageSection title={t("webui.openapi.schemas.title")} description={t("webui.openapi.schemas.detail")} actions={<Button variant="secondary" onClick={() => navigate?.("/openapi/models")}>{t("webui.openapi.overview.models.open")}</Button>}>
            <p className={styles.pageMeta}>{modelNames.length > 0 ? t("webui.openapi.overview.models.count", { count: modelNames.length }) : t("webui.openapi.schemas.empty")}</p>
          </PageSection>
        </>}
    </div>
  </div>;
}

function uniqueMethods(methods: string[]): string[] {
  return OPENAPI_HTTP_METHODS.map((method) => method.toUpperCase()).filter((method) => methods.includes(method));
}

function CategoryCard({ tag, count, methods, onOpen, t }: { tag: string; count: number; methods: string[]; onOpen: () => void; t: (key: string, options?: Record<string, unknown>) => string }) {
  return <button type="button" className={styles.categoryCard} data-testid="openapi-category-card" onClick={onOpen}>
    <span className={styles.categoryCardHead}><strong className={styles.categoryCardTag}>{tag}</strong><span className={styles.categoryCardCount}>{t("webui.openapi.overview.categories.count", { count })}</span></span>
    <span className={styles.categoryCardMethods}>{methods.map((method) => <MethodBadge key={method} method={method} />)}</span>
  </button>;
}