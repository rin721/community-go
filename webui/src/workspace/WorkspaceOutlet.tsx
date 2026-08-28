import { useMemo } from "react";
import { Routes } from "react-router-dom";
import type { Manifest, WorkspaceSessionLookup } from "@webui/sdk/runtime";
import { renderPanelRoutes, toLocationObject } from "../routes";
import type { ContentWidth } from "../components/ContentViewport";
import { ContentViewport } from "../components/ContentViewport";
import type { ThemeExperience } from "../theme";
import type { WorkspaceID, WorkspaceLocation } from "./registry";
import { useWorkspaceHost } from "./WorkspaceProvider";
import { WorkspaceSessionLookupProvider, WorkspaceScopeContext } from "../contracts";

// WorkspaceOutlet 为每个打开的标签页建立一个 mounted panel（ROUTER-085-001）：
// - 面板以打开时的固定 location 挂载，不随浏览器导航卸载；切换标签只切换 hidden/inert；
// - inactive 面板 hidden + inert，不可聚焦/交互，模块依据会话 active 信号暂停副作用；
// - 唯一活动面板使用 role=tabpanel 并与标签 aria-labelledby 关联（REQ-085-007/010）；
// - 每个面板内容渲染在 ContentViewport（086）：与普通 fallback 路由共用唯一滚动/
//   宽度容器语义，不再有第二份 page-viewport padding。
export function WorkspaceOutlet({ manifest, theme, reducedMotion }: { manifest: Manifest; theme: ThemeExperience; reducedMotion: boolean }) {
  const host = useWorkspaceHost();
  const hasActive = host.state.activeWorkspaceID !== undefined;
  return (
    <div className="workspace-panels" hidden={!hasActive} data-testid="workspace-panels">
      {host.state.open.map((descriptor) => (
        <WorkspacePanel key={descriptor.id} descriptor={descriptor} manifest={manifest} sessionLookup={host.sessionLookup} theme={theme} reducedMotion={reducedMotion} />
      ))}
    </div>
  );
}

function WorkspacePanel({ descriptor, manifest, sessionLookup, theme, reducedMotion }: { descriptor: { id: WorkspaceID; routeID: string; location: WorkspaceLocation }; manifest: Manifest; sessionLookup: WorkspaceSessionLookup; theme: ThemeExperience; reducedMotion: boolean }) {
  const host = useWorkspaceHost();
  const active = descriptor.id === host.state.activeWorkspaceID;
  const locationObject = useMemo(() => toLocationObject(descriptor.location, descriptor.id), [descriptor.location, descriptor.id]);
  const panelRoutes = useMemo(() => renderPanelRoutes(manifest), [manifest]);
  // 面板内容宽度语义：设置模块路由收窄；其余正式页面 wide（086 REQ-086-003）。
  const pageWidth: ContentWidth = descriptor.routeID.startsWith("settings.") ? "settings" : "wide";

  return (
    <section
      className="workspace-panel"
      id={`workspace-panel-${descriptor.id}`}
      role={active ? "tabpanel" : undefined}
      aria-labelledby={active ? `workspace-tab-${descriptor.id}` : undefined}
      hidden={!active}
      inert={!active}
      data-workspace-id={descriptor.id}
      data-active={active ? "true" : "false"}
      data-testid={`workspace-panel-${descriptor.id}`}
    >
      <ContentViewport pageWidth={pageWidth} experience={theme} reducedMotion={reducedMotion} panelProps={{ id: `${descriptor.id}-content` }}>
        <WorkspaceSessionLookupProvider value={sessionLookup}>
          <WorkspaceScopeContext.Provider value={descriptor.id}>
            <Routes location={locationObject}>{panelRoutes}</Routes>
          </WorkspaceScopeContext.Provider>
        </WorkspaceSessionLookupProvider>
      </ContentViewport>
    </section>
  );
}

export function tabDOMID(id: WorkspaceID): string {
  return `workspace-tab-${id}`;
}

export function panelDOMID(id: WorkspaceID): string {
  return `workspace-panel-${id}`;
}