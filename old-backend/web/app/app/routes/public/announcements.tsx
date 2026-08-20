import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Search } from "lucide-react";
import { Form, Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { Badge } from "~/components/console/primitives/Badge";
import { Button } from "~/components/console/primitives/Button";
import { StateBlock } from "~/components/console/patterns/StateBlock";
import { useDocumentMeta } from "~/hooks/useDocumentMeta";
import { announcementsApi } from "~/lib/api/announcements";
import { queryKeys } from "~/lib/api/query-keys";

const pageSize = 6;

export default function PublicAnnouncementsRoute() {
  const { i18n, t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = normalizePage(searchParams.get("page"));
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  useDocumentMeta("seo.announcements.title", "seo.announcements.description", {
    canonicalPath: "/announcements",
    ogDescriptionKey: "seo.announcements.ogDescription",
    ogTitleKey: "seo.announcements.ogTitle",
  });

  const announcementsQuery = useQuery({
    queryFn: ({ signal }) =>
      announcementsApi.listPublicAnnouncements({ keyword, page, pageSize }, { signal }),
    queryKey: queryKeys.announcements.publicList(i18n.language, page, pageSize, { keyword }),
    retry: false,
  });
  const total = announcementsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const submitSearch = (formData: FormData) => {
    const rawKeyword = formData.get("keyword");
    const nextKeyword = typeof rawKeyword === "string" ? rawKeyword.trim() : "";
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", "1");
      if (nextKeyword) {
        next.set("keyword", nextKeyword);
      } else {
        next.delete("keyword");
      }
      return next;
    });
  };

  const goToPage = (nextPage: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(Math.min(Math.max(1, nextPage), totalPages)));
      return next;
    });
  };

  return (
    <main className="console-page">
      <section className="console-section" aria-labelledby="public-announcements-title">
        <div className="console-section__header">
          <Badge>{t("site.announcements.eyebrow")}</Badge>
          <h1 id="public-announcements-title">{t("site.announcements.title")}</h1>
          <p className="console-section__description">{t("site.announcements.description")}</p>
        </div>

        <Form
          className="console-public-filter"
          action="/announcements"
          method="get"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch(new FormData(event.currentTarget));
          }}
        >
          <label htmlFor="public-announcement-keyword">
            {t("site.announcements.search.label")}
          </label>
          <div className="console-public-filter__row">
            <input
              id="public-announcement-keyword"
              name="keyword"
              placeholder={t("site.announcements.search.placeholder")}
              type="search"
              defaultValue={keyword}
            />
            <Button type="submit">
              <Search aria-hidden="true" size={18} />
              <span>{t("site.announcements.search.submit")}</span>
            </Button>
          </div>
        </Form>

        {announcementsQuery.isLoading ? (
          <StateBlock
            title={t("site.announcements.states.loadingTitle")}
            description={t("site.announcements.states.loadingDescription")}
          />
        ) : announcementsQuery.error ? (
          <StateBlock
            intent="danger"
            title={t("site.announcements.states.errorTitle")}
            description={t("site.announcements.states.errorDescription")}
            action={
              <Button appearance="secondary" onClick={() => void announcementsQuery.refetch()}>
                {t("site.announcements.actions.retry")}
              </Button>
            }
          />
        ) : announcementsQuery.data?.storageStatus !== "persisted" ? (
          <StateBlock
            title={t("site.announcements.states.unavailableTitle")}
            description={t("site.announcements.states.unavailableDescription")}
          />
        ) : announcementsQuery.data.items.length ? (
          <>
            <div className="console-announcement-list">
              {announcementsQuery.data.items.map((announcement) => (
                <article className="console-card console-announcement-card" key={announcement.id}>
                  <div className="console-announcement-card__meta">
                    <CalendarDays aria-hidden="true" size={18} />
                    <span>{formatDate(announcement.publishedAt, i18n.language)}</span>
                  </div>
                  <h2>{announcement.title}</h2>
                  <p>{announcement.summary}</p>
                  <Button appearance="ghost" asChild>
                    <Link to={`/announcements/${announcement.id}`}>
                      {t("site.announcements.actions.read")}
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
            <nav
              className="console-public-pagination"
              aria-label={t("site.announcements.pagination.label")}
            >
              <Button
                appearance="secondary"
                disabled={page <= 1 || announcementsQuery.isFetching}
                onClick={() => goToPage(page - 1)}
              >
                {t("site.announcements.pagination.previous")}
              </Button>
              <span>
                {t("site.announcements.pagination.pageStatus", {
                  page,
                  totalPages,
                })}
              </span>
              <Button
                appearance="secondary"
                disabled={page >= totalPages || announcementsQuery.isFetching}
                onClick={() => goToPage(page + 1)}
              >
                {t("site.announcements.pagination.next")}
              </Button>
            </nav>
          </>
        ) : (
          <StateBlock
            title={t("site.announcements.states.emptyTitle")}
            description={t("site.announcements.states.emptyDescription")}
          />
        )}
      </section>
    </main>
  );
}

function normalizePage(value: string | null) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
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
    dateStyle: "medium",
  }).format(date);
}
