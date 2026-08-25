import { Button, Input, Tabs, TextArea } from "@heroui/react";
import { ListBox, Select } from "@heroui/react";
import { Spinner } from "@heroui/react";
import { Field } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";import { MethodBadge } from "./MethodBadge";
import type { BodyType, FormFieldRow } from "./openapi-data";
import styles from "./openapi.module.css";

export type ParamEditorRow = { name: string; value: string; kind: "text" | "file"; required: boolean; description: string; location: "query" | "path" };
export type HeaderRow = { name: string; value: string };

// RequestPane is the upper request area of the openapi workspace (R075-009):
// a full URL line (method badge + assembled URL + send button) above the
// request tabs (Params / Body / Headers / Cookies / Auth) with dynamic form
// rows. It is presentational: editing state lives in the operation workspace.
export function RequestPane({ method, url, params, bodyTypes, bodyType, onBodyTypeChange, bodyText, onBodyTextChange, formRows, onFormChange, onFormFileChange, headers, cookies, executable, onParamChange, onAddParam, onRemoveParam, onHeaderChange, onAddHeader, onRemoveHeader, onCookieChange, onAddCookie, onRemoveCookie, bearer, onBearerChange, hasBearer, hasSession, onExecute, pending }: {
  method: string;
  url: string;
  params: ParamEditorRow[];
  bodyTypes: BodyType[];
  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  bodyText: string;
  onBodyTextChange: (value: string) => void;
  formRows: FormFieldRow[];
  onFormChange: (name: string, value: string) => void;
  onFormFileChange: (name: string, file: File | undefined) => void;
  headers: HeaderRow[];
  cookies: HeaderRow[];
  executable: boolean;
  onParamChange: (index: number, patch: Partial<ParamEditorRow>) => void;
  onAddParam: () => void;
  onRemoveParam: (index: number) => void;
  onHeaderChange: (index: number, patch: Partial<HeaderRow>) => void;
  onAddHeader: () => void;
  onRemoveHeader: (index: number) => void;
  onCookieChange: (index: number, patch: Partial<HeaderRow>) => void;
  onAddCookie: () => void;
  onRemoveCookie: (index: number) => void;
  bearer: string;
  onBearerChange: (value: string) => void;
  hasBearer: boolean;
  hasSession: boolean;
  onExecute: () => void;
  pending: boolean;
}) {
  const { t } = useWebUITranslation("webui.openapi");
  return <div className={styles.requestPane}>
    <div className={styles.requestUrlRow}>
      <div className={styles.requestUrlMethod}><MethodBadge method={method} /></div>
      <Input value={url} readOnly aria-label={t("webui.openapi.request.url")} className={styles.requestUrlInput} />
      {executable && <Button type="button" onClick={onExecute} isDisabled={pending} data-testid="openapi-send">
        {pending && <Spinner size="sm" />}
        {t(pending ? "webui.openapi.run.running" : "webui.openapi.run.execute")}
      </Button>}
    </div>
    <div className={styles.requestTabs}>
      <Tabs aria-label={t("webui.openapi.request.tabs")}>
        <Tabs.List>
          <Tabs.Tab id="params">{t("webui.openapi.request.params")}</Tabs.Tab>
          <Tabs.Tab id="body">{t("webui.openapi.detail.body")}</Tabs.Tab>
          <Tabs.Tab id="headers">{t("webui.openapi.debug.headers")}</Tabs.Tab>
          <Tabs.Tab id="cookies">{t("webui.openapi.debug.cookies")}</Tabs.Tab>
          <Tabs.Tab id="auth">{t("webui.openapi.detail.auth")}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel id="params">
          <DynamicRows label={t("webui.openapi.request.params")} addLabel={t("webui.openapi.request.add")} onAdd={onAddParam} count={params.length}>
            {params.map((row, index) => (
              <div className={styles.editorRow} key={index}>
                <Field label={t("webui.openapi.table.name")} value={row.name} onChange={(event) => onParamChange(index, { name: event.target.value })} disabled={!executable} className={styles.editorCellInput} />
                <Field label={t("webui.openapi.table.type")} value={row.kind === "file" ? "file" : "string"} disabled className={styles.editorCellInput} />
                <Field label={t("webui.openapi.table.required")} value={row.required ? t("webui.openapi.table.yes") : ""} disabled className={styles.editorCellInput} />
                <Field label={t("webui.openapi.table.description")} value={row.description} onChange={(event) => onParamChange(index, { description: event.target.value })} disabled={!executable} className={styles.editorCellInput} />
                <RemoveButton label={t("webui.openapi.request.remove")} onClick={() => onRemoveParam(index)} />
              </div>
            ))}
          </DynamicRows>
        </Tabs.Panel>
        <Tabs.Panel id="body">
          <div className={styles.formSectionHead}>
            <h3 className={styles.formSectionTitle}>{t("webui.openapi.detail.body")}</h3>
            {bodyTypes.length > 1 && (
              <Select aria-label={t("webui.openapi.debug.bodyType")} selectedKey={bodyType} onSelectionChange={(key) => onBodyTypeChange(String(key) as BodyType)} className={styles.bodyTypeSelect}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Indicator />
                <Select.Popover>
                  <ListBox>{bodyTypes.map((type) => <ListBox.Item key={type} id={type} textValue={type}>{t(`webui.openapi.debug.body.${type}`)}</ListBox.Item>)}</ListBox>
                </Select.Popover>
              </Select>
            )}
          </div>
          {bodyType === "json"
            ? <TextArea aria-label={t("webui.openapi.debug.body.json")} value={bodyText} onChange={(event) => onBodyTextChange(event.target.value)} rows={10} className={styles.bodyEditor} disabled={!executable} />
            : <div className={styles.editorRows}>
              {formRows.map((field) => (
                <div className={styles.editorRow} key={field.name}>
                  <span className={styles.editorCell}><code className={styles.monoCell}>{field.name}</code><span className={styles.formHint}>{field.kind}</span></span>
                  {field.kind === "file"
                    ? <input type="file" className={styles.fileInput} aria-label={field.name} disabled={!executable} onChange={(event) => onFormFileChange(field.name, event.target.files?.[0])} />
                    : <Field label={field.name} value={field.value} onChange={(event) => onFormChange(field.name, event.target.value)} disabled={!executable} className={styles.editorCellInput} />}
                </div>
              ))}
            </div>}
        </Tabs.Panel>
        <Tabs.Panel id="headers">
          <DynamicRows label={t("webui.openapi.debug.headers")} addLabel={t("webui.openapi.request.add")} onAdd={onAddHeader} count={headers.length}>
            {headers.map((row, index) => (
              <div className={styles.editorRow} key={index}>
                <Field label={t("webui.openapi.debug.name")} value={row.name} onChange={(event) => onHeaderChange(index, { name: event.target.value })} disabled={!executable} className={styles.editorCellInput} />
                <Field label={t("webui.openapi.debug.value")} value={row.value} onChange={(event) => onHeaderChange(index, { value: event.target.value })} disabled={!executable} className={styles.editorCellInput} />
                <RemoveButton label={t("webui.openapi.request.remove")} onClick={() => onRemoveHeader(index)} />
              </div>
            ))}
          </DynamicRows>
        </Tabs.Panel>
        <Tabs.Panel id="cookies">
          <p className={styles.formHint}>{t("webui.openapi.debug.cookiesHint")}</p>
          <DynamicRows label={t("webui.openapi.debug.cookies")} addLabel={t("webui.openapi.request.add")} onAdd={onAddCookie} count={cookies.length}>
            {cookies.map((row, index) => (
              <div className={styles.editorRow} key={index}>
                <Field label={t("webui.openapi.debug.name")} value={row.name} onChange={(event) => onCookieChange(index, { name: event.target.value })} disabled={!executable} className={styles.editorCellInput} />
                <Field label={t("webui.openapi.debug.value")} value={row.value} onChange={(event) => onCookieChange(index, { value: event.target.value })} disabled={!executable} className={styles.editorCellInput} />
                <RemoveButton label={t("webui.openapi.request.remove")} onClick={() => onRemoveCookie(index)} />
              </div>
            ))}
          </DynamicRows>
        </Tabs.Panel>
        <Tabs.Panel id="auth">
          <div className={styles.formSection}>
            {hasBearer && <Field label={t("webui.openapi.auth.bearer")} type="password" value={bearer} onChange={(event) => onBearerChange(event.target.value)} placeholder={t("webui.openapi.auth.bearerPlaceholder")} disabled={!executable} className={styles.authField} />}
            {hasSession && <p className={styles.formHint}>{t("webui.openapi.auth.session")}</p>}
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  </div>;
}

function DynamicRows({ label, addLabel, onAdd, count, children }: { label: string; addLabel: string; onAdd: () => void; count: number; children: React.ReactNode }) {
  return <section className={styles.formSection}>
    <div className={styles.formSectionHead}>
      <h3 className={styles.formSectionTitle}>{label}</h3>
      <Button type="button" variant="ghost" onClick={onAdd} isDisabled={count > 20}>{addLabel}</Button>
    </div>
    <div className={styles.editorRows}>{children}</div>
  </section>;
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button type="button" variant="ghost" aria-label={label} onClick={onClick}>−</Button>;
}