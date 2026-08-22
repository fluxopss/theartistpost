import { Atmosphere } from "@/components/Atmosphere";
import { CursorTrailLazy } from "@/components/CursorTrailLazy";
import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { ScrollProgress } from "@/components/ScrollProgress";
import { PwaRegister } from "@/components/PwaRegister";
import { MobileStickyCta } from "@/components/MobileStickyCta";

/** Gallery-night marketing chrome. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-surface text-paper pb-[4.75rem] md:pb-0">
      <ScrollProgress />
      <Atmosphere />
      <CursorTrailLazy />
      <NavBar />
      <main className="relative flex-1">{children}</main>
      <Footer />
      <MobileStickyCta />
      <PwaRegister />
    </div>
  );
}
