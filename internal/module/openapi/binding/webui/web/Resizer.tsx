import { useCallback, useRef } from "react";
import { useWebUITranslation } from "@webui/sdk/i18n";
import styles from "./openapi.module.css";

const MIN_RATIO = 0.25;
const MAX_RATIO = 0.75;
const STEP = 0.05;

// Resizer is the narrow self-built vertical divider between the request and
// response panes (R075-009). There is no platform Splitter component and no
// maintained third-party candidate worth introducing for a purely local
// interaction, so this stays a thin pointer/keyboard controller over a
// flex-basis ratio (platform tokens for the visual). It reports the ratio of
// the top pane to the container height (0..1).
export function Resizer({ ratio, onRatioChange }: { ratio: number; onRatioChange: (ratio: number) => void }) {
  const { t } = useWebUITranslation("webui.openapi");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const clamp = useCallback((value: number) => Math.min(MAX_RATIO, Math.max(MIN_RATIO, value)), []);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.height <= 0) return;
    onRatioChange(clamp((event.clientY - rect.top) / rect.height));
  };
  const onPointerUp = (event: React.PointerEvent) => {
    if (dragging.current) event.currentTarget.releasePointerCapture(event.pointerId);
    dragging.current = false;
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowUp") { event.preventDefault(); onRatioChange(clamp(ratio + STEP)); }
    else if (event.key === "ArrowDown") { event.preventDefault(); onRatioChange(clamp(ratio - STEP)); }
  };

  return <div ref={containerRef} className={styles.splitArea}>
    <div
      className={styles.resizer}
      role="separator"
      aria-orientation="horizontal"
      aria-label={t("webui.openapi.split.label")}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      data-testid="openapi-resizer"
    />
  </div>;
}