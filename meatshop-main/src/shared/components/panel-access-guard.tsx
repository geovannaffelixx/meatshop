"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";

export function PanelAccessGuard({ children }: { children: React.ReactNode }) {
  const { panel, loading } = usePanelAccess();
  const router = useRouter();

  useEffect(() => {
    if (!loading && panel && !panel.can_access) router.replace("/no-panel-access");
  }, [loading, panel, router]);

  if (loading) return <div className="grid min-h-screen place-items-center text-gray-600">Carregando seu acesso...</div>;
  if (!panel?.can_access) return <div className="grid min-h-screen place-items-center text-gray-600">Redirecionando...</div>;
  return children;
}
