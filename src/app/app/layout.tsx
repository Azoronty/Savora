import { Logo } from "@/components/brand/logo";
import { AccountPanel, MobileAccountMenu } from "@/components/app/account-menu";
import { DemoBanner } from "@/components/app/demo-banner";
import { AddShortcut, MobileAddButton, MobileNav, SidebarNav } from "@/components/app/nav";
import { ProductSheetProvider } from "@/components/app/product-sheet";
import { TimezoneSync } from "@/components/app/timezone-sync";
import { SaviProvider } from "@/components/savi/savi-companion";
import { ToastProvider } from "@/components/ui/toast";
import { USE_SOON_DAYS } from "@/lib/domain/constants";
import { addDays } from "@/lib/domain/dates";
import { recommendRecipes } from "@/lib/domain/recommend";
import { getSaviState, hasDemoData, listInventorySnapshot } from "@/lib/data/queries";
import { requireViewer } from "@/lib/data/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const [snapshot, demo, savi] = await Promise.all([listInventorySnapshot(viewer), hasDemoData(viewer), getSaviState(viewer)]);

  const soonLimit = addDays(viewer.today, USE_SOON_DAYS);
  const attention = snapshot.products.filter((p) => p.expires_on <= soonLimit);
  const usable = attention.filter((p) => p.expires_on >= viewer.today);
  const ready = recommendRecipes(snapshot.products, viewer.today, { maxMissing: 0, limit: 1 })[0];

  return (
    <ToastProvider>
      <ProductSheetProvider today={viewer.today}>
        <SaviProvider
          data={{
            householdId: viewer.householdId,
            today: viewer.today,
            mode: viewer.saviMode,
            xp: savi.xp,
            missionsDone: savi.missionsDone,
            productCount: snapshot.products.length,
            expiring: { names: usable.slice(0, 3).map((p) => p.name), count: usable.length },
            readyRecipe: ready ? { slug: ready.recipe.slug, title: ready.recipe.title } : null,
          }}
        >
          <TimezoneSync cookieZone={viewer.timeZone} profileZone={viewer.profileTimeZone} />
          <AddShortcut />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2"
          >
            Skip to content
          </a>
          <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
            <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-paper px-5 pb-5 pt-7 lg:flex">
              <div className="px-2">
                <Logo href="/app" />
              </div>
              <div className="mt-9 overflow-y-auto">
                <SidebarNav counts={{ attention: attention.length, shopping: snapshot.openShopping }} />
              </div>
              {/* Savi's home: free space in the sidebar, never over page content. */}
              <div data-savi-home className="min-h-[150px] flex-1" aria-hidden="true" />
              <AccountPanel viewer={viewer} />
            </aside>

            <div className="min-w-0">
              <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur-md sm:px-6 lg:hidden">
                <Logo href="/app" />
                <div className="flex items-center gap-2">
                  {/* Savi's phone home: in the header chrome, never over content. */}
                  <span data-savi-home-mobile className="block h-10 w-12" aria-hidden="true" />
                  <MobileAddButton />
                  <MobileAccountMenu viewer={viewer} />
                </div>
              </header>
              {(demo || viewer.isAnonymous) && <DemoBanner isAnonymous={viewer.isAnonymous} />}
              <main id="main" className="mx-auto max-w-[1180px] px-4 pb-36 pt-8 sm:px-6 lg:px-10 lg:pb-16 lg:pt-12">
                {children}
              </main>
            </div>
          </div>
          <MobileNav />
        </SaviProvider>
      </ProductSheetProvider>
    </ToastProvider>
  );
}
