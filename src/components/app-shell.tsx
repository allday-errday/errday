import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white shadow-2xl shadow-black/10">
      <main className="flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
