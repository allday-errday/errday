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

const authRoutes = new Set([
  "/login",
  "/signup",
  "/onboarding",
  "/imprint",
  "/privacy",
  "/terms",
]);

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthRoute = authRoutes.has(pathname);

  return (
    <div className="errday-app-shell min-h-dvh w-full text-[var(--text)]" data-errday-shell>
      {!isAuthRoute ? <SideNav /> : null}
      <div
        className={`errday-app-content flex w-full flex-col ${
          isAuthRoute ? "" : "errday-app-content-with-nav"
        }`}
      >
        <main
          className={`relative mx-auto w-full flex-1 px-4 sm:px-8 lg:px-12 ${
            isAuthRoute
              ? "max-w-[1440px] py-4 sm:py-6 lg:py-10"
              : "max-w-[1280px] pb-[calc(7.25rem+env(safe-area-inset-bottom))] pt-6 sm:pt-10 lg:pb-24 lg:pt-12"
          }`}
        >
          <div className="[animation:fadeRise_0.45s_ease]" key={pathname}>
            {children}
          </div>
          {!isAuthRoute ? <NotificationManager /> : null}
        </main>
      </div>
      {!isAuthRoute ? <BottomNav /> : null}
      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
    </div>
  );
}
