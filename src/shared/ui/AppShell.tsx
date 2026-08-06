import { Nav } from "@/shared/ui/Nav";
import { SiteFooter } from "@/shared/ui/SiteFooter";

/** Standard marketing website chrome — not an app shell. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <Nav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
