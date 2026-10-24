"use client";

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BadgePercent, BarChart3, Boxes, Building2, ChevronDown, CircleHelp, ClipboardList, House, MessageSquare, PackageSearch, Percent, PiggyBank, ScrollText, Settings, ShoppingBag, Star, Tags, TicketPercent, Truck, User as UserIcon, Users, UtensilsCrossed, X, type LucideIcon } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar } from '@/shared/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { unitPermissions, type UnitPermission } from '@/shared/auth/panel-access';
import { resolveAssetUrl } from '@/shared/lib/api';
import { usePanelAccess } from '@/shared/providers/panel-access-provider';

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  permission: UnitPermission | null;
  adminOnly?: boolean;
};

type NavGroup = {
  id: string;
  title: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  items: NavItem[];
};

const dashboardItem: NavItem = {
  title: "Início",
  url: "/dashboard",
  icon: House,
  permission: unitPermissions.viewDashboard,
};

const supportItem: NavItem = {
  title: "Ajuda e suporte",
  url: "/support",
  icon: CircleHelp,
  permission: null,
};

const navGroups: NavGroup[] = [
  {
    id: "operation",
    title: "Operação",
    icon: ClipboardList,
    items: [
      {
        title: "Pedidos",
        url: "/orders",
        icon: ShoppingBag,
        permission: unitPermissions.manageOrders,
      },
      {
        title: "Mensagens",
        url: "/chat",
        icon: MessageSquare,
        permission: unitPermissions.manageOrders,
      },
      {
        title: "Entregas",
        url: "/deliveries",
        icon: Truck,
        permission: unitPermissions.viewDeliveries,
      },
    ],
  },
  {
    id: "catalog",
    title: "Catálogo",
    icon: PackageSearch,
    items: [
      {
        title: "Produtos e estoque",
        url: "/products",
        icon: Boxes,
        permission: unitPermissions.manageProducts,
      },
      {
        title: "Categorias",
        url: "/categories",
        icon: Tags,
        permission: unitPermissions.manageCategories,
      },
    ],
  },
  {
    id: "growth",
    title: "Marketing e clientes",
    icon: BadgePercent,
    items: [
      {
        title: "Promoções",
        url: "/promotions",
        icon: Percent,
        permission: unitPermissions.manageProducts,
      },
      {
        title: "Cupons",
        url: "/coupons",
        icon: TicketPercent,
        permission: unitPermissions.manageProducts,
      },
      {
        title: "Receitas",
        url: "/recipes",
        icon: UtensilsCrossed,
        permission: unitPermissions.manageProducts,
      },
      {
        title: "Avaliações",
        url: "/reviews",
        icon: Star,
        permission: unitPermissions.viewDashboard,
      },
    ],
  },
  {
    id: "management",
    title: "Gestão",
    icon: BarChart3,
    items: [
      {
        title: "Financeiro",
        url: "/finance",
        icon: PiggyBank,
        permission: unitPermissions.viewFinance,
      },
      {
        title: "Auditoria",
        url: "/audit",
        icon: ScrollText,
        permission: null,
        adminOnly: true,
      },
    ],
  },
  {
    id: "settings",
    title: "Configurações",
    icon: Settings,
    items: [
      {
        title: "Unidade",
        url: "/settings/unit",
        icon: Building2,
        permission: unitPermissions.manageUnit,
      },
      {
        title: "Equipe e acessos",
        url: "/settings/users",
        icon: Users,
        permission: unitPermissions.manageMembers,
      },
      {
        title: "Termos e privacidade",
        url: "/settings/legal",
        icon: UserIcon,
        permission: null,
      },
    ],
  },
];

type AppSidebarProps = React.ComponentProps<typeof Sidebar>;

export function AppSidebar(props: AppSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { user, panel, selectedMembership, unitId, setUnitId, hasPermission } = usePanelAccess();
  const memberships = panel?.memberships ?? [];
  const unitLogo = resolveAssetUrl(selectedMembership?.unit_image_url);
  const canSee = (item: NavItem) => (!item.adminOnly || user?.global_role === 'SUPER_ADMIN') && (!item.permission || hasPermission(item.permission));
  const groups = navGroups.map(group => ({ ...group, items: group.items.filter(canSee) })).filter(group => group.items.length);

  function itemLink(item: NavItem) {
    const active = pathname === item.url || pathname.startsWith(`${item.url}/`);
    const Icon = item.icon;
    return <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={active} tooltip={item.title}
        className="h-10 rounded-xl px-3 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 data-[active=true]:bg-red-50 data-[active=true]:font-semibold data-[active=true]:text-red-700">
        <Link href={item.url} aria-current={active ? 'page' : undefined} onClick={() => setOpenMobile(false)}>
          <Icon className="size-[18px]" /><span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>;
  }

  const unitCard = <>
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-red-50 text-red-700">
      {unitLogo ? <Image unoptimized src={unitLogo} alt="" width={40} height={40} className="size-10 object-contain p-1" /> : <Building2 className="size-5" />}
    </span>
    <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Unidade atual</span>
      <span className="mt-0.5 block break-words text-sm font-semibold leading-snug text-slate-900">{selectedMembership?.unit_name ?? 'Painel de gestão'}</span>
    </span>
    {memberships.length > 1 && <ChevronDown className="size-4 shrink-0 text-slate-400 group-data-[collapsible=icon]:hidden" />}
  </>;

  return <Sidebar {...props}>
    <SidebarHeader className="gap-5 px-3 pb-4 pt-5">
      <div className="relative flex min-h-10 items-center justify-center px-3 group-data-[collapsible=icon]:hidden">
        <Image src="/logoEscuraEscrita.png" alt="MeatShop" width={140} height={40} className="h-8 w-auto object-contain" priority />
        <button type="button" aria-label="Fechar menu" onClick={() => setOpenMobile(false)} className="absolute right-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-red-600 md:hidden"><X className="size-4" /></button>
      </div>
      {memberships.length > 1 ? <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Trocar unidade" className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
            {unitCard}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="w-72 max-w-[calc(100vw-2rem)] rounded-2xl p-2 shadow-xl">
          <DropdownMenuLabel className="px-3 py-2 text-xs text-slate-500">Escolha sua unidade</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={String(unitId)} onValueChange={value => { setOpenMobile(false); setUnitId(Number(value)); }}>
            {memberships.map(membership => <DropdownMenuRadioItem key={membership.unit_id} value={String(membership.unit_id)} className="my-1 rounded-xl py-3 pr-3 focus:bg-red-50 focus:text-red-700">
              <span className="min-w-0"><span className="block break-words font-medium">{membership.unit_name}</span><span className="mt-0.5 block text-xs text-slate-500">{membership.unit_id === unitId ? 'Unidade selecionada' : 'Acessar unidade'}</span></span>
            </DropdownMenuRadioItem>)}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu> : <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 group-data-[collapsible=icon]:p-0">{unitCard}</div>}
    </SidebarHeader>
    <SidebarContent className="gap-1 px-1">
      <SidebarGroup className="py-0"><SidebarGroupContent><SidebarMenu>{canSee(dashboardItem) && itemLink(dashboardItem)}</SidebarMenu></SidebarGroupContent></SidebarGroup>
      {groups.map(group => <SidebarGroup key={group.id} className="py-2">
        <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.title}</SidebarGroupLabel>
        <SidebarGroupContent><SidebarMenu className="gap-1">{group.items.map(itemLink)}</SidebarMenu></SidebarGroupContent>
      </SidebarGroup>)}
      <SidebarGroup className="py-2"><SidebarGroupContent><SidebarMenu>{itemLink(supportItem)}</SidebarMenu></SidebarGroupContent></SidebarGroup>
    </SidebarContent>

    <SidebarRail />
  </Sidebar>;
}
