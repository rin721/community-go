import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/console/primitives/Button";
import { StateBlock } from "~/components/console/patterns/StateBlock";

export default function NotFoundRoute() {
  const { t } = useTranslation();

  return (
    <main className="console-page console-page--narrow">
      <StateBlock
        title={t("empty.notFound.title")}
        description={t("empty.notFound.description")}
        action={
          <Button asChild>
            <Link to="/">{t("common.actions.backHome")}</Link>
          </Button>
        }
      />
    </main>
  );
}
