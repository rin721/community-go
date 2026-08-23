import { useCallback, useEffect, useState } from "react";
import { ActionTrigger, Check, InlineAlert, PageHeader, PageSection, SelectField } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { getAssignment, replaceAssignment, listAccounts, listDepartments, listPositions, type Account, type Department, type Position } from "./api";
import styles from "./organization.module.css";

export default function AssignmentsPage() {
  const { t } = useWebUITranslation("webui.organization");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [accountId, setAccountId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [positionIds, setPositionIds] = useState<string[]>([]);
  const [expectedVersion, setExpectedVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const reloadAssignment = useCallback((id: string) => {
    void getAssignment(id).then((value) => {
      setDepartmentId(value.departmentId || "");
      setPositionIds(value.positionIds);
      setExpectedVersion(value.version);
      setMessage("");
      setError("");
    }).catch(() => setError(t("webui.organization.error")));
  }, [t]);
  useEffect(() => {
    void Promise.all([listAccounts(), listDepartments(), listPositions()]).then(([nextAccounts, nextDepartments, nextPositions]) => {
      setAccounts(nextAccounts);
      setDepartments(nextDepartments);
      setPositions(nextPositions);
      setAccountId(nextAccounts[0]?.id || "");
    }).catch(() => setError(t("webui.organization.error")));
  }, [t]);
  useEffect(() => { if (accountId) reloadAssignment(accountId); }, [accountId, reloadAssignment]);
  const toggle = (id: string) => setPositionIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const save = () => {
    if (!accountId) return;
    void replaceAssignment(accountId, expectedVersion, departmentId, positionIds).then((value) => {
      setExpectedVersion(value.version);
      setMessage(t("webui.organization.assignments.saved"));
    }).catch(() => {
      reloadAssignment(accountId);
      setMessage(t("webui.organization.assignments.conflict"));
    });
  };
  return <div className={`${styles.organizationModule} module-page`}>
    <PageHeader eyebrow={t("webui.organization.brand")} title={t("webui.organization.assignments.title")} description={t("webui.organization.assignments.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.organization.assignments.panel.kicker")} title={t("webui.organization.assignments.panel.title")}>
        <form className="form-panel" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <SelectField label={t("webui.organization.account")} value={accountId} onValueChange={setAccountId} options={accounts.map((item) => ({ value: item.id, label: `${item.displayName} (@${item.username})` }))} />
          <SelectField label={t("webui.organization.department")} value={departmentId} onValueChange={setDepartmentId} options={[{ value: "", label: "—" }, ...departments.filter((item) => item.active && !item.archived).map((item) => ({ value: item.id, label: item.name }))]} />
          <fieldset><legend>{t("webui.organization.positions.label")}</legend>{positions.filter((item) => item.active && !item.archived).map((item) => <Check key={item.id} checked={positionIds.includes(item.id)} onChange={() => toggle(item.id)} className="permission-row">{item.name}</Check>)}</fieldset>
          {error && <InlineAlert tone="danger" title={error} />}
          {message && <p className="page-meta">{message}</p>}
          <div className="page-meta">{t("webui.organization.assignments.revision")}: {expectedVersion}</div>
          <ActionTrigger operationId="organization.assignments.replace" disabled={!accountId} onAction={save}>{t("webui.organization.assignments.save")}</ActionTrigger>
        </form>
      </PageSection>
    </div>
  </div>;
}