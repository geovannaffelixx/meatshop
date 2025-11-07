'use client'

import * as React from "react"
import Image from "next/image"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { User, Shield, House, ShoppingBag, Box, PiggyBank, LogOut, ChevronRight, Users } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useCurrentUser } from "@/hooks/useCurrentUser"

const navData = [
  {
    items: [
      { title: "Início", url: "/home", icon: House },
      { title: "Pedidos", url: "/pedidos", icon: ShoppingBag },
      { title: "Estoque", url: "/estoque", icon: Box },
      { title: "Financeiro", url: "/financeiro", icon: PiggyBank },
    ],
  },
  {
    title: "Configurações",
    items: [
      { title: "Perfil", url: "configuracoes/perfil", icon: User },
      { title: "Usuários", url: "configuracoes/usuario", icon: Users },
      { title: "Segurança", url: "configuracoes/seguranca", icon: Shield },
    ],
  },
]

type UserData = {
  name: string
  email: string
  logoUrl?: string | null
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: UserData
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { user: currentUser } = useCurrentUser()

  const displayUser: UserData = currentUser ?? user ?? {
    name: "Usuário",
    email: "email@exemplo.com",
    logoUrl: null,
  }
  
  const resolvedSrc =
  displayUser.logoUrl
    ? (displayUser.logoUrl.startsWith("http")
        ? displayUser.logoUrl
        : `${process.env.NEXT_PUBLIC_API_URL}${displayUser.logoUrl}`)
    : null;

  return (
    <Sidebar {...props}>
      <SidebarContent>
        {navData.map((group, i) => (
          <SidebarGroup key={i}>
            {group.title && <SidebarGroupLabel>{group.title}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item, j) => {
                  const isActive = pathname === item.url
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={j}>
                      <SidebarMenuButton asChild>
                        <Link
                          href={item.url}
                          className={`flex items-center gap-2 rounded-md px-2 py-1 transition-colors
                            ${isActive
                              ? "bg-gray-200 text-[#BE2C1B] font-bold"
                              : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                          {item.title}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <div className="mt-auto px-4 py-2">
          <Link
            href="/entrar"
            className="flex items-center gap-2 rounded-md px-2 py-1 text-gray-700 hover:text-red-600 hover:[&>svg]:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Link>
        </div>

        <Link
          href="/perfil"
          className="block px-4 py-3 border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            {resolvedSrc ? (
              <img
                src={resolvedSrc}
                alt={displayUser.name}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-white font-semibold">
                {displayUser?.name
                  ? displayUser.name.charAt(0).toUpperCase()
                  : "?"}
              </div>
            )}

            <div className="flex flex-col text-sm min-w-0">
              <span className="font-medium text-gray-800 truncate">{displayUser.name}</span>
              <span className="text-gray-500 truncate">{displayUser.email}</span>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
          </div>
        </Link>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
