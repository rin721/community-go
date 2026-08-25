import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { SectionNav, type SectionNavItem } from "@webui/sdk/ui";
import { useOptionalHostRuntime } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { webuiOpenAPISpec } from "@webui/generated/openapi-spec";
import { CommandPalette } from "./CommandPalette";
import { OpenAPICommandProvider } from "./command-context";
import { groupedOperations, isOpenAPIDocument, type OpenAPIDocument } from "./openapi-data";
import styles from "./openapi.module.css";

export const OVERVIEW_NAV_ID = "openapi.nav.overview";
export const MODELS_NAV_ID = "openapi.nav.models";
export const tagNavID = (tag: string) => `openapi.nav.tag.${tag}`;

// OpenAPILayout is the openapi group layout entry (075-007, settings 073
// precedent): the in-page SectionNav lists the contract categories, and the
// content area (children, supplied by the host <Outlet />) switches between
// the four module routes without unmounting the layout. Nav items are derived
// from the generated contract snapshot (dynamic tags), not compiled in.
export default function OpenAPILayout({ children }: { children: ReactNode }) {
  const { t } = useWebUITranslation("webui.openapi");
  const runtime = useOptionalHostRuntime();
  const navigate = runtime?.navigate;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  const usable = isOpenAPIDocument(webuiOpenAPISpec);
  const document = webuiOpenAPISpec as unknown as OpenAPIDocument;
  const groups = useMemo(() => (usable ? groupedOperations(document) : []), [usable, document]);
  const rowsById = useMemo(() => new Map(groups.flatMap((group) => group.operations).map((row) => [row.id, row])), [groups]);

  const items = useMemo<ReadonlyArray<SectionNavItem>>(() => {
    const nav: SectionNavItem[] = [{ id: OVERVIEW_NAV_ID, label: t("webui.openapi.nav.overview"), href: "/openapi" }];
    for (const group of groups) {
      nav.push({ id: tagNavID(group.tag), label: group.tag, href: `/openapi/tags?tag=${encodeURIComponent(group.tag)}` });
    }
    nav.push({ id: MODELS_NAV_ID, label: t("webui.openapi.nav.models"), href: "/openapi/models" });
    return nav;
  }, [groups, t]);

  const active = currentOpenAPISection(window.location.pathname, window.location.search, rowsById);

  // Cmd/Ctrl+K opens the module-wide quick search from any module page.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <OpenAPICommandProvider openPalette={openPalette}>
    <div className={`${styles.openapiModule} module-page`}>
      <div className={styles.moduleInner}>
        <SectionNav ariaLabel={t("webui.openapi.nav.label")} items={items} activeId={active} onSelect={navigate ? (id) => {
          const item = items.find((candidate) => candidate.id === id);
          if (item && item.href) navigate(item.href);
        } : undefined} />
        <div className={styles.moduleContent}>{children}</div>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        groups={groups}
        models={Object.keys(document.components?.schemas ?? {})}
        onSelectOperation={(id) => { if (navigate) navigate(`/openapi/operation?op=${encodeURIComponent(id)}&mode=docs`); }}
        onSelectModel={(name) => { if (navigate) navigate(`/openapi/models?model=${encodeURIComponent(name)}`); }}
      />
    </div>
  </OpenAPICommandProvider>;
}

// currentOpenAPISection infers the active nav item id from the current route
// pathname and query: overview / tag pages highlight the matching category,
// the operation page highlights the tag holding the selected operation, and
// the models page highlights the models entry.
export function currentOpenAPISection(pathname: string, search: string, rowsById: Map<string, { tag: string }>): string {
  if (pathname === "/openapi/models") return MODELS_NAV_ID;
  if (pathname === "/openapi/tags") {
    const tag = new URLSearchParams(search).get("tag");
    return tag ? tagNavID(tag) : OVERVIEW_NAV_ID;
  }
  if (pathname === "/openapi/operation") {
    const op = new URLSearchParams(search).get("op");
    const row = op ? rowsById.get(op) : undefined;
    return row ? tagNavID(row.tag) : OVERVIEW_NAV_ID;
  }
  return OVERVIEW_NAV_ID;
}