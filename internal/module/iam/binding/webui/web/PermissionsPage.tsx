import { useEffect, useState } from "react";
import { PageHeader, Surface } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { listPermissions } from "./api";
import styles from "./iam.module.css";
type Item={key:string;ownerModuleId:string;descriptionMessageId:string};
export default function PermissionsPage(){const{t}=useWebUITranslation("webui.iam");const[items,setItems]=useState<Item[]>([]);useEffect(()=>{void listPermissions().then(setItems)},[]);return <div className={`${styles.iamModule} module-page`}><PageHeader eyebrow={t("webui.iam.brand")} title={t("webui.iam.permissions.title")} description={t("webui.iam.permissions.description")}/><Surface className="permissions">{items.map((item)=><code key={item.key} title={item.ownerModuleId}>{item.key}</code>)}</Surface></div>}
