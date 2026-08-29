import { useMemo, useState } from "react";
import { CommandList, ModalDialog, SearchControl } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { MethodBadge } from "./MethodBadge";
import type { OperationGroup } from "./openapi-data";
import styles from "./openapi.module.css";

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
  const [selectedKey, setSelectedKey] = useState<string>();
  const needle = query.trim().toLowerCase();
  const entries = useMemo(() => {
    if (needle === "") return [];
    const operations = groups.flatMap((group) => group.operations).filter((row) => `${row.method} ${row.path} ${row.operationId}`.toLowerCase().includes(needle));
    return [
      ...operations.map((row) => ({ kind: "operation" as const, key: row.id, label: row.operationId, row })),
      ...models.filter((name) => name.toLowerCase().includes(needle)).map((name) => ({ kind: "model" as const, key: name, label: name })),
    ];
  }, [groups, needle, models]);

  const choose = (key: string) => {
    const entry = entries.find((item) => item.key === key);
    if (!entry) return;
    if (entry.kind === "operation" && entry.row) onSelectOperation(entry.row.id);
    else onSelectModel(entry.key);
    setQuery("");
    onClose();
  };

  return <ModalDialog open={open} title={t("webui.openapi.palette.title")} closeLabel={t("webui.openapi.drawer.close")} onClose={() => { setQuery(""); onClose(); }} className={styles.paletteDialog}>
    <div className={styles.paletteSearch}><SearchControl autoFocus className={styles.paletteInput} label={t("webui.openapi.palette.title")} value={query} onValueChange={setQuery} placeholder={t("webui.openapi.palette.placeholder")} /><kbd>⌘K</kbd></div>
    <CommandList label={t("webui.openapi.palette.title")} className={styles.paletteList} selectedKey={selectedKey} onSelectionChange={setSelectedKey} onAction={choose} emptyState={<p className={styles.paletteEmpty}>{t("webui.openapi.palette.empty")}</p>} items={entries.map((entry) => ({ id: entry.key, textValue: entry.label, className: styles.paletteItem, label: <>{entry.kind === "operation" && entry.row && <MethodBadge method={entry.row.method} />}<span className={styles.paletteItemLabel}>{entry.label}</span></> }))} />
  </ModalDialog>;
}
