"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/app-sidebar";
import { RouteProgress } from "@/shared/components/route-progress";
import { NotificationBell, NotificationsProvider } from "@/modules/notifications";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <RouteProgress />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 shadow-sm sm:px-6">
            <SidebarTrigger className="text-white hover:bg-white/10 hover:text-white" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logoClaraEscrita.png" alt="MeatShop" className="absolute left-1/2 h-12 max-w-[42vw] -translate-x-1/2 object-contain sm:h-14" />
            <NotificationBell />
          </header>

          <main id="main-content" className="flex-1">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </NotificationsProvider>
  );
}
