import { TopBar } from "@/shared/ui/TopBar";
import { TabBar } from "@/shared/ui/TabBar";

/**
 * Phone-width app frame on an ink backdrop.
 * Screens scroll inside; TabBar is fixed to the frame bottom.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink md:flex md:items-stretch md:justify-center md:bg-[radial-gradient(ellipse_at_top,_#0a2748_0%,_#031a37_55%,_#020c1a_100%)] md:py-6">
      <div className="relative mx-auto flex min-h-dvh w-full flex-col overflow-hidden bg-surface shadow-2xl md:min-h-[min(900px,calc(100dvh-3rem))] md:max-w-[var(--app-frame-max)] md:rounded-[1.75rem] md:border md:border-line-on-dark">
        <TopBar />
        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{
            paddingBottom:
              "calc(var(--tab-bar-height) + var(--safe-bottom) + 0.5rem)",
          }}
        >
          {children}
        </div>
        <TabBar />
      </div>
    </div>
  );
}
