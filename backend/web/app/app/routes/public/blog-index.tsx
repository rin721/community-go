import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { useDocumentMeta } from "~/hooks/useDocumentMeta";
import { getBlogPosts } from "~/lib/markdown/posts";
import type { AppLocale } from "~/i18n/resources";

export default function BlogIndexRoute() {
  const { i18n, t } = useTranslation();
  useDocumentMeta("seo.blog.title", "seo.blog.description", {
    canonicalPath: "/blog",
    ogDescriptionKey: "seo.blog.ogDescription",
    ogTitleKey: "seo.blog.ogTitle",
  });
  const posts = getBlogPosts(i18n.language as AppLocale);

  return (
    <main className="console-page">
      <section className="console-section" aria-labelledby="blog-title">
        <div className="console-section__header">
          <Badge>{t("site.blog.eyebrow")}</Badge>
          <h1 id="blog-title">{t("site.blog.title")}</h1>
          <p className="console-section__description">{t("site.blog.description")}</p>
        </div>
        {posts.length ? (
          <div className="console-blog-grid">
            {posts.map((post) => (
              <article className="console-card console-blog-card" key={post.slug}>
                <img className="console-blog-card__cover" src={post.cover} alt={post.title} />
                <div className="console-blog-card__body">
                  <div className="console-blog-card__meta">
                    <Badge>{post.tags[0]}</Badge>
                    <span>
                      {t("markdown.blog.dateLabel")}: {post.date}
                    </span>
                  </div>
                  <h2>{post.title}</h2>
                  <p>{post.description}</p>
                  <Button appearance="ghost" asChild>
                    <Link to={`/blog/${post.slug}`}>{t("common.actions.readArticle")}</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <StateBlock
            title={t("site.blog.emptyTitle")}
            description={t("site.blog.emptyDescription")}
          />
        )}
      </section>
    </main>
  );
}
