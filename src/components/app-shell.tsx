"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { NotificationManager } from "@/components/notification-manager";
import { SideNav } from "@/components/side-nav";
import { Toaster } from "@/components/toaster";

type AppShellProps = {
  children: ReactNode;
};

const authRoutes = new Set(["/login", "/signup"]);

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthRoute = authRoutes.has(pathname);
  const isWide = pathname === "/today";

  return (
    <div className="flex min-h-dvh w-full text-[var(--text)]">
      <SideNav />
      <div
        className={`flex min-h-dvh w-full flex-col ${
          isAuthRoute ? "" : "lg:pl-[var(--sidebar-width)]"
        }`}
      >
        <main
          className={`mx-auto w-full flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-12 lg:pt-10 ${
            isWide ? "max-w-5xl" : "max-w-3xl"
          }`}
        >
          <div className="[animation:fadeRise_0.35s_ease]" key={pathname}>
            {children}
          </div>
          <NotificationManager />
        </main>
      </div>
      <BottomNav />
      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
    </div>
  );
}
