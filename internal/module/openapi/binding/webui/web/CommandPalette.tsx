import { useMemo, useState, type KeyboardEvent } from "react";
import { Kbd, Modal } from "@heroui/react";
import { Field } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { MethodBadge } from "./MethodBadge";
import type { OperationGroup } from "./openapi-data";
import styles from "./openapi.module.css";

// CommandPalette is the Cmd/Ctrl+K quick navigation (R075-009): a platform
// modal that filters operations and opens or activates the matching operation
// in the workspace tabs. Callbacks are supplied by the workspace shell.
export function CommandPalette({ open, onClose, groups, models, onSelectOperation, onSelectModel }: {
  open: boolean;
  onClose: () => void;
  groups: OperationGroup[];
  models: string[];
  onSelectOperation: (id: string) => void;
  onSelectModel: (name: string) => void;
}) {
  const { t } = useWebUITranslation("webui.openapi");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const needle = query.trim().toLowerCase();

  const entries = useMemo(() => {
    if (needle === "") return [];
    const operations = groups.flatMap((group) => group.operations).filter((row) => `${row.method} ${row.path} ${row.operationId}`.toLowerCase().includes(needle));
    return [
      ...operations.map((row) => ({ kind: "operation" as const, key: row.id, label: row.operationId, row })),
      ...models.filter((name) => name.toLowerCase().includes(needle)).map((name) => ({ kind: "model" as const, key: name, label: name })),
    ];
  }, [groups, needle, models]);

  const choose = (index: number) => {
    const entry = entries[index];
    if (!entry) return;
    if (entry.kind === "operation" && entry.row) onSelectOperation(entry.row.id);
    else if (entry.kind === "model") onSelectModel(entry.key);
    setQuery("");
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((current) => Math.min(current + 1, Math.max(entries.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(cursor);
    }
  };

  return <Modal.Root isOpen={open} onOpenChange={(value) => { if (!value) { setQuery(""); onClose(); } }}>
    <Modal.Backdrop />
    <Modal.Container placement="center">
      <Modal.Dialog className={styles.paletteDialog}>
        <Modal.Body>
          <div className={styles.paletteSearch}>
            <Field
              autoFocus
              className={styles.paletteInput}
              label={t("webui.openapi.palette.title")}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setCursor(0); }}
              onKeyDown={onKeyDown}
              placeholder={t("webui.openapi.palette.placeholder")}
            />
            <Kbd>⌘K</Kbd>
          </div>
          <div className={styles.paletteList}>
            {entries.length === 0 && <p className={styles.paletteEmpty}>{t("webui.openapi.palette.empty")}</p>}
            {entries.map((entry, index) => (
              <button
                key={`${entry.kind}-${entry.key}`}
                type="button"
                className={cursor === index ? `${styles.paletteItem} ${styles.paletteItemActive}` : styles.paletteItem}
                onClick={() => choose(index)}
              >
                {entry.kind === "operation" && entry.row && <MethodBadge method={entry.row.method} />}
                <span className={styles.paletteItemLabel}>{entry.label}</span>
              </button>
            ))}
          </div>
        </Modal.Body>
      </Modal.Dialog>
    </Modal.Container>
  </Modal.Root>;
}