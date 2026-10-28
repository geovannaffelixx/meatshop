"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, LogOut, ShieldCheck } from "lucide-react";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import type { PanelMembership, UnitRole } from "@/shared/auth/panel-access";
import {
  UNIT_STORAGE_KEY,
  UNIT_USER_STORAGE_KEY,
  unitHomeRoute,
} from "@/shared/auth/unit-selection";
import { Button } from "@/shared/components/ui/button";
import { SearchField } from "@/shared/components/search-field";
import { EmptyState } from "@/shared/components/empty-state";
import { LoadingOverlay } from "@/shared/components/loading-overlay";
import { Spinner } from "@/shared/components/ui/spinner";
import { apiPost, resolveAssetUrl } from "@/shared/lib/api";
import { resetApiCache } from "@/shared/lib/query-cache";

const roleLabels: Record<UnitRole, string> = {
  OWNER: "Responsável",
  MANAGER: "Gerente",
  OPERATOR: "Operador",
  DELIVERY: "Entregador",
};

export function SelectUnitScreen() {
  const { user, panel, selectedMembership, setUnitId } = usePanelAccess();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const memberships = useMemo(() => panel?.memberships ?? [], [panel]);
  const isAdmin = user?.global_role === "SUPER_ADMIN";
  const filtered = useMemo(() => {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR");
    const term = normalize(search.trim());
    return memberships.filter((membership) => normalize(membership.unit_name).includes(term));
  }, [memberships, search]);

  useEffect(() => {
    if (!user || !panel) return;
    if (memberships.length === 0) router.replace(isAdmin ? "/audit" : "/no-panel-access");
    else if (memberships.length === 1) router.replace(unitHomeRoute(memberships[0], isAdmin));
  }, [user, panel, memberships, isAdmin, router]);

  function choose(membership: PanelMembership) {
    if (selecting !== null || loggingOut) return;
    setSelecting(membership.unit_id);
    if (membership.unit_id === selectedMembership?.unit_id)
      router.replace(unitHomeRoute(membership, isAdmin));
    else setUnitId(membership.unit_id);
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await apiPost("/auth/logout", {});
      resetApiCache();
      localStorage.removeItem(UNIT_STORAGE_KEY);
      localStorage.removeItem(UNIT_USER_STORAGE_KEY);
      window.dispatchEvent(new Event("auth:session-expired"));
      router.replace("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  if (!user || memberships.length < 2) return <LoadingOverlay title="Preparando seu acesso..." />;

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="relative flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 sm:px-8">
        <span className="hidden text-sm font-medium text-slate-300 sm:block">
          Acesso às unidades
        </span>
        <Image
          src="/logoClaraEscrita.png"
          alt="MeatShop"
          width={684}
          height={225}
          priority
          className="absolute left-1/2 top-1/2 h-10 w-auto max-w-[36vw] -translate-x-1/2 -translate-y-1/2 object-contain"
        />
        <Button
          type="button"
          variant="ghost"
          disabled={loggingOut || selecting !== null}
          onClick={() => void logout()}
          className="ml-auto text-white hover:bg-white/10 hover:text-white"
        >
          {loggingOut ? <Spinner /> : <LogOut aria-hidden="true" />}Sair
        </Button>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-red-100 bg-white text-red-700 shadow-sm">
            <Building2 className="size-7" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-red-700">
            Olá, {user.name?.trim().split(/\s+/)[0] || "bem-vindo"}!
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Em qual unidade vamos trabalhar?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Escolha um açougue para acessar o painel. Suas permissões acompanham o cargo que você
            tem em cada unidade.
          </p>
        </div>
        <section aria-label="Unidades disponíveis" className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p role="status" className="text-sm text-slate-600">
              {search
                ? `${filtered.length} de ${memberships.length} unidades`
                : `${memberships.length} unidades disponíveis`}
            </p>
            <SearchField
              value={search}
              onValueChange={setSearch}
              label="Buscar unidade"
              placeholder="Buscar pelo nome da unidade"
              className="sm:max-w-sm"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <EmptyState
                icon={Building2}
                title="Nenhuma unidade encontrada"
                description="Tente buscar por outro nome ou limpe a busca para ver todas as unidades."
                action={
                  <Button type="button" variant="outline" onClick={() => setSearch("")}>
                    Limpar busca
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((membership) => (
                <UnitCard
                  key={membership.unit_id}
                  membership={membership}
                  isAdmin={isAdmin}
                  current={selectedMembership?.unit_id === membership.unit_id}
                  busy={selecting !== null || loggingOut}
                  selecting={selecting === membership.unit_id}
                  onSelect={() => choose(membership)}
                />
              ))}
            </div>
          )}
        </section>
        <p className="flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-slate-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Você pode trocar de unidade a qualquer momento pelo seletor “Unidade atual” no menu
          lateral.
        </p>
      </main>
    </div>
  );
}

function UnitCard({
  membership,
  isAdmin,
  current,
  busy,
  selecting,
  onSelect,
}: {
  membership: PanelMembership;
  isAdmin: boolean;
  current: boolean;
  busy: boolean;
  selecting: boolean;
  onSelect: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const role = isAdmin
    ? "Administrador do sistema"
    : membership.role
      ? roleLabels[membership.role]
      : "Acesso à unidade";
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onSelect}
      aria-label={`Acessar ${membership.unit_name} como ${role}`}
      className="group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-red-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-60 sm:p-6"
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
          {membership.unit_image_url && !imageError ? (
            <Image
              unoptimized
              src={resolveAssetUrl(membership.unit_image_url)}
              alt=""
              width={56}
              height={56}
              onError={() => setImageError(true)}
              className="size-14 object-contain p-1"
            />
          ) : (
            <Building2 className="size-6" aria-hidden="true" />
          )}
        </span>
        {current && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            <Check className="size-3" aria-hidden="true" />
            Atual
          </span>
        )}
      </span>
      <span className="mb-4 mt-4 block w-full break-words text-lg font-semibold leading-snug text-slate-950">
        {membership.unit_name}
      </span>
      <span className="mb-5 inline-flex self-start rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
        {role}
      </span>
      <span className="mt-auto flex w-full items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm font-semibold text-red-700">
        {selecting ? "Entrando na unidade..." : "Acessar unidade"}
        {selecting ? (
          <Spinner />
        ) : (
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
}
