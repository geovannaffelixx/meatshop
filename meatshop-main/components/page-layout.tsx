"use client"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

type PageLayoutProps = {
  title: string
  image: string
  children: React.ReactNode
}

function PageLayout({ title, image, children }: PageLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex bg-[#2D2D2D] h-24 px-4 items-center justify-between">
          <SidebarTrigger />
          <img src={image} alt={title} className="h-16 mx-auto" />
          <div className="w-6" />
        </header>

        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default PageLayout
