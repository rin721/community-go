import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionTrigger, Check, EmptyState, InlineAlert, PageFrame, PageHeader, PageSection, SearchInput, SelectField, StickyActionBar, ToggleButton } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { getAssignment, replaceAssignment, listAccounts, listDepartments, listPositions, type Account, type Department, type Position } from "./api";
import styles from "./organization.module.css";

export default function AssignmentsPage() {
  const { t } = useWebUITranslation("webui.organization");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [query, setQuery] = useState("");
  const [accountId, setAccountId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [positionIds, setPositionIds] = useState<string[]>([]);
  const [savedDepartmentId, setSavedDepartmentId] = useState("");
  const [savedPositionIds, setSavedPositionIds] = useState<string[]>([]);
  const [expectedVersion, setExpectedVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveConflict, setSaveConflict] = useState(false);

  const reloadAssignment = useCallback((id: string, preserveMessage = false) => {
    void getAssignment(id).then((value) => {
      setDepartmentId(value.departmentId || "");
      setPositionIds(value.positionIds);
      setSavedDepartmentId(value.departmentId || "");
      setSavedPositionIds(value.positionIds);
      setExpectedVersion(value.version);
      if (!preserveMessage) setMessage("");
      setError("");
    }).catch(() => setError(t("webui.organization.error")));
  }, [t]);

  useEffect(() => {
    void Promise.all([listAccounts(), listDepartments(), listPositions()]).then(([nextAccounts, nextDepartments, nextPositions]) => {
      setAccounts(nextAccounts);
      setDepartments(nextDepartments);
      setPositions(nextPositions);
      setAccountId((current) => (current && nextAccounts.some((item) => item.id === current) ? current : nextAccounts[0]?.id || ""));
    }).catch(() => setError(t("webui.organization.error")));
  }, [t]);

  useEffect(() => { if (accountId) { setSaveConflict(false); void reloadAssignment(accountId); } }, [accountId, reloadAssignment]);

  const filteredAccounts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter((item) => item.displayName.toLowerCase().includes(needle) || item.username.toLowerCase().includes(needle));
  }, [accounts, query]);

  const activeDepartments = useMemo(() => departments.filter((item) => item.active && !item.archived), [departments]);
  const activePositions = useMemo(() => positions.filter((item) => item.active && !item.archived), [positions]);

  const toggle = (id: string) => setPositionIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const positionsChanged = positionIds.length !== savedPositionIds.length || positionIds.some((id) => !savedPositionIds.includes(id));
  const dirty = departmentId !== savedDepartmentId || positionsChanged;
  const saveState = saveConflict ? "conflict" : saving ? "pending" : dirty ? "dirty" : "clean";

  const save = () => {
    if (!accountId || !dirty || saving) return Promise.resolve();
    setSaving(true);
    setSaveConflict(false);
    return replaceAssignment(accountId, expectedVersion, departmentId, positionIds).then((value) => {
      setExpectedVersion(value.version);
      setSavedDepartmentId(departmentId);
      setSavedPositionIds(positionIds);
      setMessage(t("webui.organization.assignments.saved"));
    }).catch(() => {
      setSaveConflict(true);
      void reloadAssignment(accountId, true);
      setMessage(t("webui.organization.assignments.conflict"));
    }).finally(() => setSaving(false));
  };

  return <PageFrame variant="detail" className={styles.organizationModule}>
    <PageHeader eyebrow={t("webui.organization.brand")} title={t("webui.organization.assignments.title")} description={t("webui.organization.assignments.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.organization.assignments.panel.kicker")} title={t("webui.organization.assignments.panel.title")}>
        {error && <InlineAlert tone="danger" title={error} />}
        {message && <p className="page-meta">{message}</p>}
        <div className="split-workspace">
          <section className={`${styles.selectPane} split-workspace-pane`} aria-label={t("webui.organization.assignments.accounts")}>
            <div className={styles.selectPaneHead}>
              <span className={styles.selectPaneTitle}>{t("webui.organization.assignments.accounts")}</span>
              <span className={styles.selectPaneCount}>{String(filteredAccounts.length)}</span>
            </div>
            <div className={styles.selectPaneSearch}>
              <SearchInput value={query} onChange={setQuery} placeholder={t("webui.organization.assignments.search")} label={t("webui.organization.assignments.search")} />
            </div>
            <div className={styles.selectPaneBody}>
              {filteredAccounts.length === 0
                ? <EmptyState title={t("webui.organization.assignments.empty")} />
                : filteredAccounts.map((item) => (
                    <ToggleButton key={item.id} className={`${styles.selectRow} ${item.id === accountId ? styles.selectRowActive : ""}`.trim()} selected={item.id === accountId} onChange={() => setAccountId(item.id)}>
                      <strong>{item.displayName}</strong>
                      <small>@{item.username}</small>
                    </ToggleButton>
                  ))}
            </div>
          </section>
          <section className="split-workspace-pane">
            <form className={`${styles.detailPane} split-workspace-pane`} onSubmit={(event) => { event.preventDefault(); save(); }}>
              <div className={styles.editorPaneHead}>
                <span className={styles.selectPaneTitle}>{t("webui.organization.assignments.panel.title")}</span>
              </div>
              <SelectField label={t("webui.organization.department")} value={departmentId} onValueChange={setDepartmentId} options={[{ value: "", label: "—" }, ...activeDepartments.map((item) => ({ value: item.id, label: item.name }))]} />
              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>{t("webui.organization.positions.label")}</h4>
                <p className={`${styles.detailHint} page-meta`}>{t("webui.organization.assignments.positions.hint")}</p>
                <div className={styles.positionCheckGrid}>
                  {activePositions.length === 0 && <p className="page-meta">{t("webui.organization.positions.empty.title")}</p>}
                  {activePositions.map((item) => (
                    <Check key={item.id} checked={positionIds.includes(item.id)} onChange={() => toggle(item.id)}>{item.name}</Check>
                  ))}
                </div>
              </div>
              <div className="page-meta">{t("webui.organization.assignments.revision")}: {expectedVersion}</div>
              <StickyActionBar state={saveState} status={saving ? t("webui.organization.saving") : undefined}>
                <ActionTrigger operationId="organization.assignments.replace" pendingLabel={t("webui.organization.saving")} disabled={!accountId || !dirty || saving} onAction={save}>{t("webui.organization.assignments.save")}</ActionTrigger>
              </StickyActionBar>
            </form>
          </section>
        </div>
      </PageSection>
    </div>
  </PageFrame>;
}
