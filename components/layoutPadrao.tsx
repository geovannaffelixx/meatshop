"use client"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

type LayoutPadraoProps = {
  titulo: string
  imagem: string
  children: React.ReactNode
}

function LayoutPadrao({ titulo, imagem, children }: LayoutPadraoProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex bg-[#2D2D2D] h-24 px-4 items-center justify-between">
          <SidebarTrigger />
          <img src={imagem} alt={titulo} className="h-16 mx-auto" />
          <div className="w-6" />
        </header>
        
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default LayoutPadrao
