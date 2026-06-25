import { useTranslation } from "react-i18next";

import { Badge } from "~/components/console/primitives/Badge";
import { useDocumentMeta } from "~/hooks/useDocumentMeta";

const privacySectionKeys = ["collection", "storage", "integrations", "launch"] as const;

export default function PrivacyRoute() {
  const { t } = useTranslation();
  useDocumentMeta("seo.privacy.title", "seo.privacy.description", {
    canonicalPath: "/privacy",
    ogDescriptionKey: "seo.privacy.ogDescription",
    ogTitleKey: "seo.privacy.ogTitle",
  });

  return (
    <main className="console-page console-page--narrow">
      <section className="console-section console-legal-page" aria-labelledby="privacy-title">
        <Badge>{t("site.legal.eyebrow")}</Badge>
        <h1 id="privacy-title">{t("site.legal.privacyTitle")}</h1>
        <p className="console-section__description">{t("site.legal.privacyDescription")}</p>
        <div className="console-stacked-list">
          {privacySectionKeys.map((key) => (
            <article className="console-stacked-list__item" key={key}>
              <h2>{t(`site.legal.privacy.${key}.title`)}</h2>
              <p>{t(`site.legal.privacy.${key}.description`)}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
