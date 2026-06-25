import { Blocks, Boxes, GitBranch, Layers3, Route } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { useDocumentMeta } from "~/hooks/useDocumentMeta";

const principleKeys = ["evidence", "boundary", "cleanup"] as const;
const architectureKeys = ["public", "setup", "admin", "productLines", "shared"] as const;
const architectureIcons = {
  admin: Layers3,
  productLines: Boxes,
  public: Route,
  setup: GitBranch,
  shared: Blocks,
};

export default function AboutRoute() {
  const { t } = useTranslation();
  useDocumentMeta("seo.about.title", "seo.about.description", {
    canonicalPath: "/about",
    ogDescriptionKey: "seo.about.ogDescription",
    ogTitleKey: "seo.about.ogTitle",
  });

  return (
    <main className="console-page">
      <section className="console-section console-section--intro" aria-labelledby="about-title">
        <Badge>{t("site.about.eyebrow")}</Badge>
        <h1 id="about-title">{t("site.about.title")}</h1>
        <p className="console-section__description">{t("site.about.description")}</p>
      </section>

      <section
        className="console-section console-section--split"
        aria-labelledby="about-principles"
      >
        <div className="console-section__header">
          <Badge>{t("site.about.principles.eyebrow")}</Badge>
          <h2 id="about-principles">{t("site.about.principles.title")}</h2>
          <p className="console-section__description">{t("site.about.principles.description")}</p>
        </div>
        <div className="console-stacked-list">
          {principleKeys.map((key) => (
            <article className="console-stacked-list__item" key={key}>
              <h3>{t(`site.about.principles.items.${key}.title`)}</h3>
              <p>{t(`site.about.principles.items.${key}.description`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="console-section" aria-labelledby="about-architecture">
        <div className="console-section__header">
          <Badge>{t("site.about.architecture.eyebrow")}</Badge>
          <h2 id="about-architecture">{t("site.about.architecture.title")}</h2>
          <p className="console-section__description">{t("site.about.architecture.description")}</p>
        </div>
        <div className="console-grid">
          {architectureKeys.map((key) => {
            const Icon = architectureIcons[key];
            return (
              <article className="console-card" key={key}>
                <Icon aria-hidden="true" size={24} />
                <h3>{t(`site.about.architecture.items.${key}.title`)}</h3>
                <p>{t(`site.about.architecture.items.${key}.description`)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="console-section console-cta-band" aria-labelledby="about-cta">
        <div>
          <Badge>{t("site.about.cta.eyebrow")}</Badge>
          <h2 id="about-cta">{t("site.about.cta.title")}</h2>
          <p>{t("site.about.cta.description")}</p>
        </div>
        <div className="console-cta-band__actions">
          <Button asChild>
            <Link to="/blog">{t("site.about.cta.primary")}</Link>
          </Button>
          <Button appearance="secondary" asChild>
            <Link to="/admin">{t("site.about.cta.secondary")}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
