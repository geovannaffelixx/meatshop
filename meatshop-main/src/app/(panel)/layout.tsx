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
          <header className="flex bg-[#2D2D2D] h-24 px-4 items-center justify-between">
            <SidebarTrigger />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logoClaraEscrita.png" alt="MeatShop" className="h-16 mx-auto" />
            <NotificationBell />
          </header>

          <main className="flex-1">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </NotificationsProvider>
  );
}
