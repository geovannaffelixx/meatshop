"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL, apiGet, apiPatch } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import type { PanelNotification } from "./types";

type NotificationsContextValue = {
  notifications: PanelNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, unitId } = usePanelAccess();
  const [notifications, setNotifications] = useState<PanelNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !unitId) return;
    setLoading(true);
    try {
      const data = await apiGet(`/notifications?unit_id=${unitId}&limit=50`, { silent: true });
      setNotifications(data as PanelNotification[]);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [unitId, user]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;

    const socket: Socket = io(`${API_URL}/notifications`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socket.on("notification:new", (notification: PanelNotification) => {
      if (notification.unit_id && notification.unit_id !== unitId) return;
      setNotifications((current) => [notification, ...current.filter(({ id }) => id !== notification.id)]);
      toast.show({
        title: notification.title,
        description: notification.message,
        variant: notification.type === "SYSTEM" ? "warning" : "info",
        duration: 8000,
        action: notification.action_url
          ? { label: "Ver detalhes", href: notification.action_url }
          : undefined,
      });
    });

    return () => { socket.disconnect(); };
  }, [unitId, user]);

  const markAsRead = useCallback(async (id: number) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
    await apiPatch(`/notifications/${id}/read`, {});
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!unitId) return;
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    await apiPatch(`/notifications/read-all?unit_id=${unitId}`, {});
  }, [unitId]);

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter(({ read }) => !read).length,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
  }), [loading, markAllAsRead, markAsRead, notifications, refresh]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications deve ser usado dentro de NotificationsProvider");
  return context;
}
