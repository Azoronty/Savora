import { LogoMark } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="mb-8 size-12" />
      <p className="eyebrow mb-3">404</p>
      <h1 className="text-4xl font-normal">{t("This shelf is empty.")}</h1>
      <p className="mt-3 max-w-sm text-muted">{t("The page you’re looking for doesn’t exist or has moved.")}</p>
      <LinkButton href="/" className="mt-8">
        {t("Back to Savora")}
      </LinkButton>
    </main>
  );
}
