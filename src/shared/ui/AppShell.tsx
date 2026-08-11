import { Atmosphere } from "@/components/Atmosphere";
import { CursorTrailLazy } from "@/components/CursorTrailLazy";
import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { ScrollProgress } from "@/components/ScrollProgress";
import { PwaRegister } from "@/components/PwaRegister";

/** Gallery-night marketing chrome. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-surface text-paper">
      <ScrollProgress />
      <Atmosphere />
      <CursorTrailLazy />
      <NavBar />
      <main className="relative flex-1">{children}</main>
      <Footer />
      <PwaRegister />
    </div>
  );
}
