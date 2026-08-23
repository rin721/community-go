import { useEffect, useState } from "react";
import { PageHeader, PageSection } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { listPermissions } from "./api";
import styles from "./iam.module.css";

type Item = { key: string; ownerModuleId: string; descriptionMessageId: string };

export default function PermissionsPage() {
  const { t } = useWebUITranslation("webui.iam");
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => { void listPermissions().then(setItems); }, []);
  return <div className={`${styles.iamModule} module-page`}>
    <PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.permissions.title")} description={t("webui.iam.permissions.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.iam.permissions.list.kicker")} title={t("webui.iam.permissions.list.title")}>
        <div className="permissions">{items.map((item) => <code key={item.key} title={item.ownerModuleId}>{item.key}</code>)}</div>
      </PageSection>
    </div>
  </div>;
}