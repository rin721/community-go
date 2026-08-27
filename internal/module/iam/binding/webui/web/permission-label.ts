import { translateOptional, ensureRouteLocale } from "@webui/sdk/i18n";

// Permission catalog descriptionMessageId lives in two shapes:
//   "webui.<module>.<rest>"          -> direct host key (legacy/mock style);
//   "permission.<module>.<rest>"     -> Go catalog id, maps to the module-owned
//                                       "webui.<module>.permission.<rest>" key.
// Unresolvable ids fall back to the stable catalog key itself so the catalog
// page never renders the missing-marker fallback text (084 IAM-084-001).

// permissionCatalogKey converts a catalog descriptionMessageId to the webui
// locale key it should resolve against; returns undefined for ids that are
// already webui-style or cannot be mapped.
export function permissionCatalogKey(messageID: string): string | undefined {
  if (messageID.startsWith("webui.")) return messageID;
  const match = /^permission\.([^.]+)\.([\w.-]+)$/.exec(messageID);
  if (!match) return undefined;
  return `webui.${match[1]}.permission.${match[2]}`;
}

// permissionDescription resolves a catalog description id to readable text,
// falling back to the catalog key itself when no translation exists.
export function permissionDescription(messageID: string): string {
  const key = permissionCatalogKey(messageID);
  if (!key) return messageID;
  return translateOptional(key) ?? messageID;
}

// preloadPermissionDescriptions loads the locale namespaces referenced by a
// permission list so permissionDescription can resolve synchronously.
export function preloadPermissionDescriptions(items: ReadonlyArray<{ descriptionMessageId: string }>): Promise<void> {
  return Promise.all(
    items.map((item) => {
      const key = permissionCatalogKey(item.descriptionMessageId);
      return key ? ensureRouteLocale({ titleMessageId: key }).catch(() => undefined) : Promise.resolve();
    }),
  ).then(() => undefined);
}