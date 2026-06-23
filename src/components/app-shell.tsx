"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
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

  return (
    <div className="min-h-dvh w-full text-[var(--text)]">
      {!isAuthRoute ? <SideNav /> : null}
      <div className="flex min-h-dvh w-full flex-col">
        <main
          className={`relative mx-auto w-full flex-1 px-5 sm:px-8 lg:px-12 ${
            isAuthRoute
              ? "max-w-[1440px] py-6 lg:py-10"
              : "max-w-[1280px] pb-20 pt-8 sm:pt-10 lg:pb-24 lg:pt-12"
          }`}
        >
          <div className="[animation:fadeRise_0.45s_ease]" key={pathname}>
            {children}
          </div>
          {!isAuthRoute ? <NotificationManager /> : null}
        </main>
      </div>
      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
    </div>
  );
}
