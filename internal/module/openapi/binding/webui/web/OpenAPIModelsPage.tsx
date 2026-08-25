import { useMemo, useState } from "react";
import { EmptyState, PageHeader, PageSection } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { webuiOpenAPISpec } from "@webui/generated/openapi-spec";
import { ModelPane } from "./ModelPane";
import { isOpenAPIDocument, type OpenAPIDocument } from "./openapi-data";
import styles from "./openapi.module.css";

// OpenAPIModelsPage is the data-models directory (/openapi/models, ?model=):
// clicking a model chip selects it (state + replaceState keeps the URL
// deep-linkable without pushing history), and the ModelPane shows the property
// table. The page is static over the generated snapshot.
export default function OpenAPIModelsPage() {
  const { t } = useWebUITranslation("webui.openapi");
  const usable = isOpenAPIDocument(webuiOpenAPISpec);
  const document = webuiOpenAPISpec as unknown as OpenAPIDocument;
  const modelNames = useMemo(() => Object.keys(document.components?.schemas ?? {}), [document]);
  // Initial selection from the deep link (?model=), otherwise the first model.
  const firstModel = modelNames[0];
  const [selected, setSelected] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("model");
    return requested && modelNames.includes(requested) ? requested : firstModel;
  });

  const selectModel = (name: string) => {
    setSelected(name);
    const params = new URLSearchParams(window.location.search);
    params.set("model", name);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };

  return <div className="module-page">
    <PageHeader eyebrow={t("webui.openapi.docs.eyebrow")} title={t("webui.openapi.models.title")} description={t("webui.openapi.schemas.detail")} />
    <div className="page-sections">
      {!usable
        ? <EmptyState title={t("webui.openapi.models.title")} detail={t("webui.openapi.docs.unavailable")} />
        : modelNames.length === 0
          ? <EmptyState title={t("webui.openapi.models.title")} detail={t("webui.openapi.schemas.empty")} />
          : <PageSection title={t("webui.openapi.models.list.title")} description={t("webui.openapi.models.list.detail")}>
            <div className={styles.modelList}>{modelNames.map((name) => (
              <button key={name} type="button" className={selected === name ? `${styles.modelItem} ${styles.modelItemActive}` : styles.modelItem} data-testid="openapi-model-item" onClick={() => selectModel(name)}>
                <code className={styles.monoCell}>{name}</code>
              </button>
            ))}</div>
            <div className={styles.modelDetail}><ModelPane key={selected} name={selected} schema={document.components?.schemas?.[selected]} /></div>
          </PageSection>}
    </div>
  </div>;
}