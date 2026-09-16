export type NotificationType = "ORDER" | "DELIVERY" | "PROMOTION" | "SYSTEM";

export type PanelNotification = {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  unit_id: number | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
};
