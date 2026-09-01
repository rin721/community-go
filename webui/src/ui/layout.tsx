import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Card, Typography } from "@heroui/react";
import { Reveal } from "../motion/reveal";
import { useZoneContributions, ZoneSlot } from "../sdk/zone";

/**
 * PageFrame 是业务页面唯一的内容宽度语义入口。
 * 页面只选择场景，不再在模块 CSS 中重复声明 max-width、左右 margin 或
 * workbench 的宽度策略；具体尺度由 styles.css 的 layout token 提供。
 */
export type PageFrameVariant = "dashboard" | "index" | "detail" | "form" | "settings" | "workbench";

export type PageFrameProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  variant?: PageFrameVariant;
  children?: ReactNode;
};

export function PageFrame({ variant = "index", className = "", children, ...props }: PageFrameProps) {
  return <div className={`page-frame page-frame-${variant} module-page ${className}`.trim()} data-page-frame={variant} {...props}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  const zoneItems = useZoneContributions("page-header");
  return <header className="page-header"><div>{eyebrow && <p className="page-eyebrow">{eyebrow}</p>}<Typography.Heading level={1} className="page-header-title">{title}</Typography.Heading>{description && <p className="page-description">{description}</p>}</div>{(actions || zoneItems.length > 0) && <div className="page-actions">{actions}{zoneItems.map((item) => <ZoneSlot key={item.id} contribution={item} />)}</div>}</header>;
}

/** Surface 是无需标题 anatomy 的轻量语义容器。 */
export function Surface({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`surface ${className}`.trim()} {...props} />;
}

export type PageSectionProps = {
  as?: "section" | "div" | "article";
  kicker?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  /** section 只提供文档节奏；panel 才拥有一层独立 Surface。 */
  surface?: "section" | "panel";
  rhythm?: "calm" | "balanced" | "playful";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/** PageSection 提供标题/内容/footer 三段 anatomy，所有业务区块共用同一节奏。 */
export function PageSection({ as: As = "section", kicker, title, description, actions, footer, rhythm = "balanced", surface = "section", className = "", style, children }: PageSectionProps) {
  const heading = (Header: typeof Card.Header | "div") => Header === "div"
    ? <div className="page-section-header">{(kicker || title || description || actions) && <div className="page-section-heading">{kicker && <span className="section-kicker">{kicker}</span>}{title && <h2 className="section-title">{title}</h2>}{description && <p className="section-description">{description}</p>}{actions && <div className="page-section-actions">{actions}</div>}</div>}</div>
    : <Card.Header className="page-section-header">{(kicker || title || description || actions) && <><div className="page-section-heading">{kicker && <span className="section-kicker">{kicker}</span>}{title && <h2 className="section-title">{title}</h2>}{description && <p className="section-description">{description}</p>}</div>{actions && <div className="page-section-actions">{actions}</div>}</>}</Card.Header>;
  const content = (Content: typeof Card.Content | "div") => Content === "div"
    ? <div className="page-section-content">{children}</div>
    : <Card.Content className="page-section-content">{children}</Card.Content>;
  const end = (Footer: typeof Card.Footer | "div") => footer ? (Footer === "div" ? <div className="page-section-footer">{footer}</div> : <Card.Footer className="page-section-footer">{footer}</Card.Footer>) : null;
  return (
    <Reveal as={As} rhythm={rhythm} className={`page-section w-full ${className}`.trim()} style={style}>
      {surface === "panel" ? <Card className="page-section-card" data-ui-layer="pattern" data-ui-pattern="page-section" data-surface-owner="page-section">{heading(Card.Header)}{content(Card.Content)}{end(Card.Footer)}</Card> : <div className="page-section-flow" data-ui-layer="pattern" data-ui-pattern="page-section">{heading("div")}{content("div")}{end("div")}</div>}
    </Reveal>
  );
}
