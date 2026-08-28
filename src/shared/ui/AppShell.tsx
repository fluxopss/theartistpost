import { Atmosphere } from "@/components/Atmosphere";
import { CursorTrailLazy } from "@/components/CursorTrailLazy";
import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { ScrollProgress } from "@/components/ScrollProgress";
import { PwaRegister } from "@/components/PwaRegister";
import { AppTabBar } from "@/features/app/AppTabBar";
import { InstallPrompt } from "@/features/app/InstallPrompt";
import { Onboarding } from "@/features/app/Onboarding";

/** Gallery-night chrome + native app shell on small screens. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-surface text-paper pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
      <ScrollProgress />
      <Atmosphere />
      <CursorTrailLazy />
      <NavBar />
      <main className="relative flex-1">{children}</main>
      <Footer />
      <AppTabBar />
      <InstallPrompt />
      <Onboarding />
      <PwaRegister />
    </div>
  );
}
