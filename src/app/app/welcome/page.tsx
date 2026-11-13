import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WelcomeForm } from "@/components/onboarding/welcome-form";
import { requireViewer } from "@/lib/data/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Welcome") };
}

export default async function WelcomePage() {
  const viewer = await requireViewer();
  const t = await getT();
  if (viewer.onboarded) redirect("/app");

  return (
    <div className="mx-auto max-w-2xl py-4 lg:py-10">
      <p className="eyebrow mb-4">{t("Welcome")}{viewer.displayName ? `, ${viewer.displayName}` : ""}</p>
      <h1 className="text-[2.4rem] font-normal leading-[1.05] sm:text-[3.2rem]">{t("Let’s set up your kitchen.")}</h1>
      <p className="mb-10 mt-4 max-w-lg text-[1.0625rem] text-ink-2">
        {t("Savora works best when it knows what you have. It only takes a minute, and you can change everything later.")}
      </p>
      <WelcomeForm defaultName={viewer.householdName} />
    </div>
  );
}
