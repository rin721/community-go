import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { useDocumentMeta } from "~/hooks/useDocumentMeta";
import { useJsonLd } from "~/hooks/useJsonLd";
import { announcementsApi } from "~/lib/api/announcements";
import { queryKeys } from "~/lib/api/query-keys";

export default function PublicAnnouncementDetailRoute() {
  const { announcementId } = useParams();
  const { i18n, t } = useTranslation();
  const detailQuery = useQuery({
    enabled: Boolean(announcementId),
    queryFn: ({ signal }) =>
      announcementsApi.getPublicAnnouncement(announcementId ?? "", { signal }),
    queryKey: queryKeys.announcements.publicDetail(i18n.language, announcementId ?? ""),
    retry: false,
  });
  const announcement = detailQuery.data;
  useDocumentMeta("seo.announcements.title", "seo.announcements.description", {
    article: announcement
      ? {
          modifiedTime: announcement.updatedAt,
          publishedTime: announcement.publishedAt ?? announcement.updatedAt,
        }
      : undefined,
    canonicalPath: announcementId ? `/announcements/${announcementId}` : "/announcements",
    description: announcement?.summary,
    title: announcement?.title,
    type: announcement ? "article" : "website",
  });
  useJsonLd(
    "public-announcement",
    announcement
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          dateModified: announcement.updatedAt,
          datePublished: announcement.publishedAt ?? announcement.updatedAt,
          description: announcement.summary,
          headline: announcement.title,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `/announcements/${announcement.id}`,
          },
        }
      : null,
  );

  if (!announcementId) {
    return <AnnouncementNotFound />;
  }

  if (detailQuery.isLoading) {
    return (
      <main className="console-page console-page--narrow">
        <StateBlock
          title={t("site.announcements.states.loadingTitle")}
          description={t("site.announcements.states.loadingDescription")}
        />
      </main>
    );
  }

  if (detailQuery.error) {
    return (
      <main className="console-page console-page--narrow">
        <StateBlock
          intent="danger"
          title={t("site.announcements.detail.errorTitle")}
          description={t("site.announcements.detail.errorDescription")}
          action={
            <Button asChild appearance="secondary">
              <Link to="/announcements">{t("site.announcements.actions.backToList")}</Link>
            </Button>
          }
        />
      </main>
    );
  }

  if (!announcement) {
    return <AnnouncementNotFound />;
  }

  return (
    <main className="console-page console-page--narrow">
      <article className="console-public-article">
        <header className="console-article-header">
          <div className="console-blog-card__meta">
            <Badge>{t("site.announcements.detail.badge")}</Badge>
            <span className="console-announcement-card__meta">
              <CalendarDays aria-hidden="true" size={18} />
              {formatDate(announcement.publishedAt, i18n.language)}
            </span>
          </div>
          <h1>{announcement.title}</h1>
          <p>{announcement.summary}</p>
        </header>
        <div className="console-public-article__content">
          {announcement.content.split(/\n{2,}/).map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
          ))}
        </div>
        <Button asChild appearance="secondary">
          <Link to="/announcements">
            <ArrowLeft aria-hidden="true" size={18} />
            <span>{t("site.announcements.actions.backToList")}</span>
          </Link>
        </Button>
      </article>
    </main>
  );
}

function AnnouncementNotFound() {
  const { t } = useTranslation();

  return (
    <main className="console-page console-page--narrow">
      <StateBlock
        title={t("site.announcements.detail.notFoundTitle")}
        description={t("site.announcements.detail.notFoundDescription")}
        action={
          <Button asChild>
            <Link to="/announcements">{t("site.announcements.actions.backToList")}</Link>
          </Button>
        }
      />
    </main>
  );
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
  }).format(date);
}
