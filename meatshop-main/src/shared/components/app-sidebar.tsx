"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Box, ChevronRight, House, LogOut, PiggyBank, Shield, ShoppingBag, Tags, User, Users } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/shared/components/ui/sidebar";
import { apiPost } from "@/shared/lib/api";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { unitPermissions, type UnitPermission } from "@/shared/auth/panel-access";

const navData = [
  { items: [
    { title: "Início", url: "/dashboard", icon: House, permission: unitPermissions.viewDashboard },
    { title: "Pedidos", url: "/orders", icon: ShoppingBag, permission: unitPermissions.manageOrders },
    { title: "Estoque", url: "/products", icon: Box, permission: unitPermissions.manageProducts },
    { title: "Categorias", url: "/categories", icon: Tags, permission: unitPermissions.manageCategories },
    { title: "Financeiro", url: "/finance", icon: PiggyBank, permission: unitPermissions.viewFinance },
  ]},
  { title: "Configurações", items: [
    { title: "Perfil", url: "/settings/profile", icon: User, permission: unitPermissions.manageUnit },
    { title: "Usuários", url: "/settings/users", icon: Users, permission: unitPermissions.manageMembers },
    { title: "Segurança", url: "/settings/security", icon: Shield, permission: unitPermissions.viewDashboard },
  ]},
];

type UserData = { name: string; email: string; logoUrl?: string | null };
type AppSidebarProps = React.ComponentProps<typeof Sidebar> & { user?: UserData };

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: currentUser, panel, unitId, setUnitId, hasPermission } = usePanelAccess();
  const displayUser = currentUser ?? user ?? { name: "Usuário", email: "email@exemplo.com", logoUrl: null };
  const resolvedSrc = displayUser.logoUrl ? (displayUser.logoUrl.startsWith("http") ? displayUser.logoUrl : `${process.env.NEXT_PUBLIC_API_URL}${displayUser.logoUrl}`) : null;

  async function handleLogout() {
    try { await apiPost("/auth/logout", {}); }
    finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("currentUser");
      window.dispatchEvent(new Event("currentUserUpdated"));
      router.push("/login");
    }
  }

  return <Sidebar {...props}><SidebarContent>
    {(panel?.memberships.length ?? 0) > 1 && <div className="px-3 pt-3">
      <label htmlFor="active-unit" className="mb-1 block text-xs font-medium text-gray-500">Unidade ativa</label>
      <select id="active-unit" value={unitId ?? ""} onChange={(event) => setUnitId(Number(event.target.value))} className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm">
        {panel?.memberships.map((membership) => <option key={membership.unit_id} value={membership.unit_id}>{membership.unit_name}</option>)}
      </select>
    </div>}
    {navData.map((group, index) => <SidebarGroup key={index}>
      {group.title && <SidebarGroupLabel>{group.title}</SidebarGroupLabel>}
      <SidebarGroupContent><SidebarMenu>{group.items.filter((item) => hasPermission(item.permission as UnitPermission)).map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.url;
        return <SidebarMenuItem key={item.url}><SidebarMenuButton asChild><Link href={item.url} className={`flex items-center gap-2 rounded-md px-2 py-1 transition-colors ${isActive ? "bg-gray-200 font-bold text-[#BE2C1B]" : "text-gray-700 hover:bg-gray-100"}`}><Icon className="h-4 w-4" />{item.title}</Link></SidebarMenuButton></SidebarMenuItem>;
      })}</SidebarMenu></SidebarGroupContent>
    </SidebarGroup>)}
    <div className="mt-auto px-4 py-2"><button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-gray-700 transition-colors hover:text-red-600"><LogOut className="h-4 w-4" />Sair</button></div>
    <Link href="/settings/profile" className="block border-t border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50"><div className="flex items-center gap-3">
      {resolvedSrc ? <img src={resolvedSrc} alt={displayUser.name} width={32} height={32} className="h-8 w-8 rounded-full object-cover" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-red-500 font-semibold text-white">{displayUser.name.charAt(0).toUpperCase()}</div>}
      <div className="flex min-w-0 flex-col text-sm"><span className="truncate font-medium text-gray-800">{displayUser.name}</span><span className="truncate text-gray-500">{displayUser.email}</span></div><ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
    </div></Link>
  </SidebarContent><SidebarRail /></Sidebar>;
}
