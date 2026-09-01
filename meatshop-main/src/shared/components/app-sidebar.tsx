"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgePercent,
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  House,
  LogOut,
  MessageSquare,
  PackageSearch,
  Percent,
  PiggyBank,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Star,
  Tags,
  TicketPercent,
  Truck,
  User as UserIcon,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/shared/components/ui/sidebar";
import {
  unitPermissions,
  type UnitPermission,
} from "@/shared/auth/panel-access";
import { API_URL, apiPost } from "@/shared/lib/api";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";

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
    defaultOpen: true,
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
        title: "Minha conta",
        url: "/settings/account",
        icon: UserIcon,
        permission: unitPermissions.viewDashboard,
      },
      {
        title: "Segurança da conta",
        url: "/settings/security",
        icon: Shield,
        permission: unitPermissions.viewDashboard,
      },
    ],
  },
];

type UserData = { name: string; email: string; avatar_url?: string | null };
type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: UserData;
};

function itemIsActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user: currentUser,
    panel,
    selectedMembership,
    unitId,
    setUnitId,
    hasPermission,
  } = usePanelAccess();
  const displayUser = currentUser ??
    user ?? { name: "Usuário", email: "email@exemplo.com", avatar_url: null };
  const resolvedSrc = displayUser.avatar_url
    ? displayUser.avatar_url.startsWith("http")
      ? displayUser.avatar_url
      : `${process.env.NEXT_PUBLIC_API_URL}${displayUser.avatar_url}`
    : null;
  const unitLogoSrc = selectedMembership?.unit_image_url
    ? selectedMembership.unit_image_url.startsWith("http")
      ? selectedMembership.unit_image_url
      : `${API_URL}${selectedMembership.unit_image_url}`
    : null;

  const visibleGroups = React.useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              (!item.adminOnly ||
                currentUser?.global_role === "SUPER_ADMIN") &&
              (!item.permission || hasPermission(item.permission)),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [currentUser?.global_role, hasPermission],
  );

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        navGroups.map((group) => [group.id, Boolean(group.defaultOpen)]),
      ),
  );

  React.useEffect(() => {
    const activeGroup = visibleGroups.find((group) =>
      group.items.some((item) => itemIsActive(pathname, item.url)),
    );
    if (!activeGroup) return;
    setOpenGroups((current) =>
      current[activeGroup.id]
        ? current
        : { ...current, [activeGroup.id]: true },
    );
  }, [pathname, visibleGroups]);

  function canSee(item: NavItem) {
    return (
      (!item.adminOnly || currentUser?.global_role === "SUPER_ADMIN") &&
      (!item.permission || hasPermission(item.permission))
    );
  }

  async function handleLogout() {
    try {
      await apiPost("/auth/logout", {});
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("currentUser");
      window.dispatchEvent(new Event("currentUserUpdated"));
      router.push("/login");
    }
  }

  function directItem(item: NavItem) {
    if (!canSee(item)) return null;
    const Icon = item.icon;
    const active = itemIsActive(pathname, item.url);
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={item.title}
          className={active ? "font-semibold text-red-700" : ""}
        >
          <Link href={item.url}>
            <Icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b border-slate-200 p-3">
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-red-700 text-white shadow-sm ring-1 ring-red-800/10">
            {unitLogoSrc ? (
              <Image
                unoptimized
                src={unitLogoSrc}
                alt={`Logo de ${selectedMembership?.unit_name ?? "unidade"}`}
                width={36}
                height={36}
                className="h-full w-full object-contain p-0.5"
              />
            ) : (
              <span className="text-sm font-bold" aria-hidden="true">
                {selectedMembership?.unit_name?.charAt(0).toUpperCase() ?? "M"}
              </span>
            )}
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold text-slate-950">MeatShop</p>
            <p className="truncate text-xs text-slate-500">
              {selectedMembership?.unit_name ?? "Painel de gestão"}
            </p>
          </div>
        </div>
        {(panel?.memberships.length ?? 0) > 1 && (
          <div className="mt-2 group-data-[collapsible=icon]:hidden">
            <label
              htmlFor="active-unit"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Unidade ativa
            </label>
            <select
              id="active-unit"
              value={unitId ?? ""}
              onChange={(event) => setUnitId(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            >
              {panel?.memberships.map((membership) => (
                <option key={membership.unit_id} value={membership.unit_id}>
                  {membership.unit_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {directItem(dashboardItem)}
              {visibleGroups.map((group) => {
                const GroupIcon = group.icon;
                const groupActive = group.items.some((item) =>
                  itemIsActive(pathname, item.url),
                );
                const open = Boolean(openGroups[group.id]);
                return (
                  <Collapsible
                    key={group.id}
                    asChild
                    open={open}
                    onOpenChange={(nextOpen) =>
                      setOpenGroups((current) => ({
                        ...current,
                        [group.id]: nextOpen,
                      }))
                    }
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={group.title}
                          className={
                            groupActive
                              ? "font-semibold text-slate-950"
                              : "text-slate-700"
                          }
                        >
                          <GroupIcon />
                          <span>{group.title}</span>
                          <ChevronDown
                            className={`ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            const active = itemIsActive(pathname, item.url);
                            return (
                              <SidebarMenuSubItem key={item.url}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={active}
                                  className={
                                    active
                                      ? "bg-red-50 font-semibold text-red-700 hover:bg-red-50 hover:text-red-700"
                                      : ""
                                  }
                                >
                                  <Link href={item.url}>
                                    <Icon />
                                    <span>{item.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
              <div className="my-1 border-t border-slate-100" />
              {directItem(supportItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              onClick={() => void handleLogout()}
              tooltip="Sair"
              className="text-slate-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Link
          href="/settings/account"
          className="mt-1 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-100 group-data-[collapsible=icon]:justify-center"
        >
          {resolvedSrc ? (
            <Image
              unoptimized
              src={resolvedSrc}
              alt={displayUser.name}
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 font-semibold text-white">
              {displayUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col text-sm group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold text-slate-800">
              {displayUser.name}
            </span>
            <span className="truncate text-xs text-slate-500">
              {displayUser.email}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-data-[collapsible=icon]:hidden" />
        </Link>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
