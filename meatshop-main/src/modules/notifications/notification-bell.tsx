"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useNotifications } from "./notifications-provider";
import type { PanelNotification } from "./types";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
});

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  async function openNotification(notification: PanelNotification) {
    if (!notification.read) await markAsRead(notification.id);
    setOpen(false);
    if (notification.action_url) router.push(notification.action_url);
  }

  return (
    <div className="relative">
      <button type="button" aria-label={`Notificações: ${unreadCount} não lidas`} onClick={() => setOpen((value) => !value)} className="relative rounded-full p-2 text-white hover:bg-white/10">
        <Bell className="size-6" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-white text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Notificações</h2>
            {unreadCount > 0 && <button type="button" onClick={() => void markAllAsRead()} className="flex items-center gap-1 text-xs font-medium text-red-700 hover:underline"><CheckCheck className="size-4" />Marcar todas como lidas</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma notificação por enquanto.</p> : notifications.slice(0, 10).map((notification) => (
              <button key={notification.id} type="button" onClick={() => void openNotification(notification)} className="flex w-full gap-3 border-b px-4 py-3 text-left hover:bg-slate-50">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.read ? "bg-transparent" : "bg-red-600"}`} />
                <span className="min-w-0"><strong className="block text-sm">{notification.title}</strong><span className="block text-sm text-slate-600">{notification.message}</span><time className="mt-1 block text-xs text-slate-400">{dateFormatter.format(new Date(notification.created_at))}</time></span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { setOpen(false); router.push("/notifications"); }} className="w-full px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50">Ver todas</button>
        </div>
      )}
    </div>
  );
}
