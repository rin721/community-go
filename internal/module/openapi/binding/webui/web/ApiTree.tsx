import { Disclosure } from "@heroui/react";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { Field } from "@webui/sdk/ui";
import { MethodBadge } from "./MethodBadge";
import type { OperationGroup } from "./openapi-data";
import styles from "./openapi.module.css";

// ApiTree renders the Apifox-style resource tree (R075-005): searchable,
// collapsible tag groups for operations plus a data-model section. Item
// selection opens the corresponding workspace tab via the page callback.
export function ApiTree({ groups, models, selectedId, search, onSearchChange, onSelectOperation, onSelectModel }: {
  groups: OperationGroup[];
  models: string[];
  selectedId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectOperation: (id: string) => void;
  onSelectModel: (name: string) => void;
}) {
  const { t } = useWebUITranslation("webui.openapi");
  return <div className={styles.treePanel}>
    <Field
      className={styles.treeSearch}
      label={t("webui.openapi.tree.search")}
      type="search"
      value={search}
      onChange={(event) => onSearchChange(event.target.value)}
    />
    <div className={styles.treeSections}>
      <Disclosure isExpanded>
        <Disclosure.Heading>
          <Disclosure.Trigger className={styles.treeGroupHeader}>{t("webui.openapi.views.operations")}</Disclosure.Trigger>
          <Disclosure.Indicator />
        </Disclosure.Heading>
        <Disclosure.Body>
          <Disclosure.Content>
            {groups.length === 0 && <p className={styles.treeEmpty}>{t("webui.openapi.tree.empty")}</p>}
            {groups.map((group) => (
              <Disclosure key={group.tag} isExpanded>
                <Disclosure.Heading>
                  <Disclosure.Trigger className={styles.treeTagHeader}>{group.tag}</Disclosure.Trigger>
                  <Disclosure.Indicator />
                </Disclosure.Heading>
                <Disclosure.Body>
                  <Disclosure.Content>
                    {group.operations.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className={styles.treeItem}
                        data-testid="openapi-tree-item"
                        aria-current={selectedId === row.id ? "true" : undefined}
                        onClick={() => onSelectOperation(row.id)}
                      >
                        <MethodBadge method={row.method} />
                        <span className={styles.treeItemLabel}>{row.operationId}</span>
                      </button>
                    ))}
                  </Disclosure.Content>
                </Disclosure.Body>
              </Disclosure>
            ))}
          </Disclosure.Content>
        </Disclosure.Body>
      </Disclosure>
      <Disclosure isExpanded>
        <Disclosure.Heading>
          <Disclosure.Trigger className={styles.treeGroupHeader}>{t("webui.openapi.views.schemas")}</Disclosure.Trigger>
          <Disclosure.Indicator />
        </Disclosure.Heading>
        <Disclosure.Body>
          <Disclosure.Content>
            {models.length === 0 && <p className={styles.treeEmpty}>{t("webui.openapi.schemas.empty")}</p>}
            {models.map((name) => (
              <button
                key={name}
                type="button"
                className={styles.treeItem}
                data-testid="openapi-model-item"
                onClick={() => onSelectModel(name)}
              >
                <span className={styles.treeItemLabel}>{name}</span>
              </button>
            ))}
          </Disclosure.Content>
        </Disclosure.Body>
      </Disclosure>
    </div>
  </div>;
}