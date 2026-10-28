"use client";

import { EmptyState } from "@/shared/components/empty-state";
import { Bell, CheckCheck, ChevronRight, Package, Tag, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { DataSkeleton } from "@/shared/components/data-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/utils";
import { useNotifications } from "./notifications-provider";
import type { NotificationType, PanelNotification } from "./types";

const notificationTypes = {
  ORDER: { label: "Pedido", icon: Package },
  DELIVERY: { label: "Entrega", icon: Truck },
  PROMOTION: { label: "Promoção", icon: Tag },
  SYSTEM: { label: "Sistema", icon: Bell },
} satisfies Record<NotificationType, { label: string; icon: typeof Bell }>;

export function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  async function select(item: PanelNotification) {
    if (!item.read) await markAsRead(item.id);
    if (item.action_url) router.push(item.action_url);
  }

  return (
    <div className="page-surface">
      <div className="page-container">
        <PageHeader
          eyebrow="Atividades"
          title="Notificações"
          description="Acompanhe os acontecimentos da unidade selecionada."
          actions={
            unreadCount > 0 && (
              <Button type="button" variant="outline" onClick={() => void markAllAsRead()}>
                <CheckCheck aria-hidden="true" />
                Marcar todas como lidas
              </Button>
            )
          }
        />

        <Card className="gap-0 overflow-hidden border-slate-200 bg-white py-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-950">Últimas notificações</h2>
            <span
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
              role="status"
            >
              {loading && notifications.length === 0
                ? "Carregando..."
                : unreadCount > 0
                  ? `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`
                  : "Tudo em dia"}
            </span>
          </div>

          {loading && notifications.length === 0 ? (
            <DataSkeleton label="Carregando notificações..." />
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nenhuma notificação por enquanto"
              description="As novidades sobre pedidos, entregas e sua unidade aparecerão aqui."
            />
          ) : (
            <ul className="divide-y divide-slate-200">
              {notifications.map((item) => {
                const { label, icon: Icon } = notificationTypes[item.type];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void select(item)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-600 sm:gap-4 sm:px-6",
                        !item.read && "bg-red-50/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl",
                          item.read ? "bg-slate-100 text-slate-500" : "bg-red-100 text-red-700",
                        )}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">{label}</span>
                          {!item.read && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              Não lida
                            </span>
                          )}
                        </span>
                        <span className="block break-words text-sm font-semibold text-slate-950">
                          {item.title}
                        </span>
                        <span className="mt-1 block break-words text-sm text-slate-600">
                          {item.message}
                        </span>
                        <time
                          dateTime={item.created_at}
                          className="mt-2 block text-xs text-slate-500"
                        >
                          {formatDateTime(item.created_at)}
                        </time>
                      </span>
                      {item.action_url && (
                        <ChevronRight
                          className="mt-2 size-4 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
