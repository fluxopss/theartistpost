import { TopBar } from "@/shared/ui/TopBar";
import { TabBar } from "@/shared/ui/TabBar";

/**
 * Mobile-first brand shell: full bleed, sticky tabs.
 * Desktop centers content in a readable column — not a phone mockup.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[var(--app-frame-max)] flex-col bg-surface">
      <TopBar />
      <main
        className="flex-1"
        style={{
          paddingBottom:
            "calc(var(--tab-bar-height) + var(--safe-bottom) + 0.75rem)",
        }}
      >
        {children}
      </main>
      <TabBar />
    </div>
  );
}
