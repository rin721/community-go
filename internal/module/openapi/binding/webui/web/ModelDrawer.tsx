import { Button } from "@heroui/react";
import { Drawer } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { ModelPane } from "./ModelPane";
import type { SchemaObject } from "./openapi-data";

// ModelDrawer presents one data-model definition in the platform Drawer
// (R075-006): the model header and its property table.
export function ModelDrawer({ name, schema, onClose }: { name: string; schema: SchemaObject | undefined; onClose: () => void }) {
  const { t } = useWebUITranslation("webui.openapi");
  return <Drawer open title={name} description={t("webui.openapi.detail.model")} closeLabel={t("webui.openapi.drawer.close")} onClose={onClose}
    footer={<Button variant="secondary" onPress={onClose}>{t("webui.openapi.drawer.close")}</Button>}
  >
    <ModelPane name={name} schema={schema} />
  </Drawer>;
}