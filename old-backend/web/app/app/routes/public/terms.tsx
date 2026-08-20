import { useTranslation } from "react-i18next";

import { Badge } from "~/components/console/primitives/Badge";
import { useDocumentMeta } from "~/hooks/useDocumentMeta";

const termSectionKeys = ["scope", "accounts", "content", "changes"] as const;

export default function TermsRoute() {
  const { t } = useTranslation();
  useDocumentMeta("seo.terms.title", "seo.terms.description", {
    canonicalPath: "/terms",
    ogDescriptionKey: "seo.terms.ogDescription",
    ogTitleKey: "seo.terms.ogTitle",
  });

  return (
    <main className="console-page console-page--narrow">
      <section className="console-section console-legal-page" aria-labelledby="terms-title">
        <Badge>{t("site.legal.eyebrow")}</Badge>
        <h1 id="terms-title">{t("site.legal.termsTitle")}</h1>
        <p className="console-section__description">{t("site.legal.termsDescription")}</p>
        <div className="console-stacked-list">
          {termSectionKeys.map((key) => (
            <article className="console-stacked-list__item" key={key}>
              <h2>{t(`site.legal.terms.${key}.title`)}</h2>
              <p>{t(`site.legal.terms.${key}.description`)}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
