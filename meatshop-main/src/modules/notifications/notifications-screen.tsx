"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotifications } from "./notifications-provider";
import type { PanelNotification } from "./types";

export function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  async function select(item: PanelNotification) {
    if (!item.read) await markAsRead(item.id);
    if (item.action_url) router.push(item.action_url);
  }

  return <section className="mx-auto max-w-4xl p-6">
    <div className="mb-6 flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Notificações</h1><p className="text-sm text-slate-500">Acompanhe os acontecimentos da unidade selecionada.</p></div>{unreadCount > 0 && <button type="button" onClick={() => void markAllAsRead()} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"><CheckCheck className="size-4" />Marcar todas como lidas</button>}</div>
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      {loading && notifications.length === 0 && <p className="p-8 text-center text-slate-500">Carregando notificações...</p>}
      {!loading && notifications.length === 0 && <div className="flex flex-col items-center p-12 text-center text-slate-500"><Bell className="mb-3 size-10" /><p>Nenhuma notificação por enquanto.</p></div>}
      {notifications.map((item) => <button key={item.id} type="button" onClick={() => void select(item)} className={`flex w-full gap-4 border-b p-4 text-left hover:bg-slate-50 ${item.read ? "" : "bg-red-50/40"}`}><span className={`mt-2 size-2 shrink-0 rounded-full ${item.read ? "bg-slate-200" : "bg-red-600"}`} /><span><strong>{item.title}</strong><span className="mt-1 block text-sm text-slate-600">{item.message}</span><time className="mt-2 block text-xs text-slate-400">{new Date(item.created_at).toLocaleString("pt-BR")}</time></span></button>)}
    </div>
  </section>;
}
