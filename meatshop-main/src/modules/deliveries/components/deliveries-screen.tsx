"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bike,
  CircleAlert,
  Clock3,
  MapPin,
  PackageCheck,
  Radio,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import {
  API_URL,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { DeliveriesMap } from "./deliveries-map";
import type {
  LiveDeliveriesSnapshot,
  LiveDelivery,
  LocationUpdatedEvent,
  UnitDeliveryPerson,
} from "../types";

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  WAITING_DELIVERY_PERSON: "Aguardando entregador",
  PICKUP: "Indo buscar",
  ON_THE_WAY: "Em rota",
  DELIVERED: "Entregue",
};

function signalFor(delivery: LiveDelivery, now: number) {
  if (!delivery.location) {
    return {
      label: "Sem localização",
      className: "bg-slate-100 text-slate-600",
    };
  }
  const age = now - new Date(delivery.location.recordedAt).getTime();
  if (age <= 30_000) {
    return { label: "Ao vivo", className: "bg-emerald-100 text-emerald-700" };
  }
  if (age <= 120_000) {
    return {
      label: "Sinal atrasado",
      className: "bg-amber-100 text-amber-700",
    };
  }
  return { label: "Sem sinal", className: "bg-red-100 text-red-700" };
}

function formatLastSignal(delivery: LiveDelivery) {
  if (!delivery.location) return "Nenhuma posição recebida";
  return `Atualizado às ${new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(delivery.location.recordedAt))}`;
}

export function DeliveriesScreen() {
  const {
    unitId,
    selectedMembership,
    hasPermission,
    loading: accessLoading,
  } = usePanelAccess();
  const [snapshot, setSnapshot] = useState<LiveDeliveriesSnapshot | null>(null);
  const [people, setPeople] = useState<UnitDeliveryPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<"operation" | "people">("operation");
  const [assigningOrder, setAssigningOrder] = useState<LiveDelivery | null>(
    null,
  );
  const [deliveryPersonId, setDeliveryPersonId] = useState("");
  const [verifyingOrder, setVerifyingOrder] = useState<LiveDelivery | null>(
    null,
  );
  const [pickupCode, setPickupCode] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage = hasPermission("MANAGE_DELIVERIES");

  const loadPeople = useCallback(
    async (silent = false) => {
      if (!unitId) return;
      const data = (await apiGet(
        `/delivery/units/${unitId}/people`,
        silent ? { silent: true } : undefined,
      )) as UnitDeliveryPerson[];
      setPeople(data);
    },
    [unitId],
  );

  const loadSnapshot = useCallback(
    async (silent = false) => {
      if (!unitId) return;
      if (!silent) setLoading(true);
      try {
        const data = (await apiGet(
          `/delivery/units/${unitId}/live`,
          silent ? { silent: true } : undefined,
        )) as LiveDeliveriesSnapshot;
        setSnapshot(data);
        setSelectedOrderId((current) => {
          if (
            current &&
            data.deliveries.some(({ orderId }) => orderId === current)
          ) {
            return current;
          }
          return data.deliveries[0]?.orderId ?? null;
        });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [unitId],
  );

  useEffect(() => {
    if (!unitId) return;
    void Promise.all([loadSnapshot(), loadPeople()]);
    const interval = window.setInterval(
      () => void Promise.all([loadSnapshot(true), loadPeople(true)]),
      30_000,
    );
    return () => window.clearInterval(interval);
  }, [loadPeople, loadSnapshot, unitId]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!unitId) return;
    const socket: Socket = io(`${API_URL}/delivery`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      socket.emit("delivery:subscribe", { unitId });
      setConnected(true);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("delivery:location.updated", (event: LocationUpdatedEvent) => {
      if (event.unitId !== unitId) return;
      setSnapshot((current) => {
        if (!current) return current;
        return {
          ...current,
          deliveries: current.deliveries.map((delivery) =>
            delivery.orderId === event.orderId
              ? {
                  ...delivery,
                  location: {
                    latitude: event.latitude,
                    longitude: event.longitude,
                    recordedAt: event.recordedAt,
                  },
                }
              : delivery,
          ),
        };
      });
    });
    socket.on("delivery:status.updated", () => void loadSnapshot(true));

    return () => {
      socket.disconnect();
    };
  }, [loadSnapshot, unitId]);

  const deliveries = useMemo(() => snapshot?.deliveries ?? [], [snapshot]);
  const metrics = useMemo(
    () => ({
      waiting: deliveries.filter((item) => !item.deliveryPerson).length,
      pickup: deliveries.filter((item) => item.deliveryStatus === "PICKUP")
        .length,
      onTheWay: deliveries.filter(
        (item) => item.deliveryStatus === "ON_THE_WAY",
      ).length,
      withoutSignal: deliveries.filter(
        (item) => signalFor(item, now).label !== "Ao vivo",
      ).length,
    }),
    [deliveries, now],
  );
  const availablePeople = useMemo(
    () =>
      people.filter(
        (person) =>
          person.deliveryPersonId &&
          person.membershipStatus === "ACTIVE" &&
          person.profileStatus === "ACTIVE" &&
          !person.activeOrderId,
      ),
    [people],
  );

  async function refreshOperation() {
    await Promise.all([loadSnapshot(true), loadPeople(true)]);
  }

  async function assign() {
    if (!unitId || !assigningOrder || !deliveryPersonId) return;
    setBusy(true);
    try {
      await apiPost(
        `/delivery/units/${unitId}/orders/${assigningOrder.orderId}/assign`,
        { deliveryPersonId: Number(deliveryPersonId) },
      );
      toast.success(
        "Entregador atribuído. O código de retirada foi enviado somente a ele.",
      );
      setAssigningOrder(null);
      setDeliveryPersonId("");
      await refreshOperation();
    } finally {
      setBusy(false);
    }
  }

  async function unassign(delivery: LiveDelivery) {
    if (!unitId) return;
    setBusy(true);
    try {
      await apiDelete(
        `/delivery/units/${unitId}/orders/${delivery.orderId}/assignment`,
      );
      toast.success(
        "Entregador removido do pedido. O código anterior foi invalidado.",
      );
      await refreshOperation();
    } finally {
      setBusy(false);
    }
  }

  async function verifyPickup() {
    if (!unitId || !verifyingOrder || pickupCode.length !== 6) return;
    setBusy(true);
    try {
      await apiPost(
        `/delivery/units/${unitId}/orders/${verifyingOrder.orderId}/verify-pickup`,
        { code: pickupCode },
      );
      toast.success("Código confirmado. Pedido liberado para entrega.");
      setVerifyingOrder(null);
      setPickupCode("");
      await refreshOperation();
    } finally {
      setBusy(false);
    }
  }

  async function approve(person: UnitDeliveryPerson) {
    if (!unitId || !person.deliveryPersonId) return;
    setBusy(true);
    try {
      await apiPatch(
        `/delivery/units/${unitId}/people/${person.deliveryPersonId}/approve`,
        {},
      );
      toast.success(`${person.user.name} foi aprovado para realizar entregas.`);
      await loadPeople(true);
    } finally {
      setBusy(false);
    }
  }

  if (accessLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        Carregando operação de entregas...
      </div>
    );
  }

  if (!unitId || !selectedMembership) {
    return (
      <div className="p-8 text-center text-slate-600">
        Selecione uma unidade para acompanhar as entregas.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-red-700">
              Operação logística
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Entregas ao vivo
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {snapshot?.unit.name} · acompanhe responsáveis, status e última
              posição.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                connected
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700",
              ].join(" ")}
            >
              <Radio className="h-3.5 w-3.5" />
              {connected ? "Tempo real conectado" : "Reconectando"}
            </span>
            <Button variant="outline" onClick={() => void loadSnapshot()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
          </div>
        </header>

        <div className="flex w-fit rounded-xl border bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab("operation")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === "operation" ? "bg-slate-950 text-white" : "text-slate-600"
            }`}
          >
            Operação
          </button>
          <button
            type="button"
            onClick={() => setTab("people")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === "people" ? "bg-slate-950 text-white" : "text-slate-600"
            }`}
          >
            Entregadores ({people.length})
          </button>
        </div>

        {tab === "operation" && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Aguardando entregador",
                  value: metrics.waiting,
                  icon: Clock3,
                },
                { label: "Indo buscar", value: metrics.pickup, icon: Bike },
                { label: "Em rota", value: metrics.onTheWay, icon: Truck },
                {
                  label: "Sem sinal ao vivo",
                  value: metrics.withoutSignal,
                  icon: CircleAlert,
                },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label} className="border-0 shadow-sm">
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <p className="text-sm text-slate-500">{label}</p>
                      <p className="mt-1 text-3xl font-bold text-slate-950">
                        {value}
                      </p>
                    </div>
                    <div className="rounded-xl bg-red-50 p-3 text-red-700">
                      <Icon className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>

            {snapshot && (
              <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="h-[560px] space-y-3 overflow-y-auto pr-1">
                  {deliveries.length === 0 && (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center p-10 text-center">
                        <PackageCheck className="mb-3 h-10 w-10 text-emerald-600" />
                        <p className="font-semibold text-slate-900">
                          Operação tranquila
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Não há pedidos aguardando coleta ou em rota.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  {deliveries.map((delivery) => {
                    const signal = signalFor(delivery, now);
                    const selected = delivery.orderId === selectedOrderId;
                    return (
                      <article
                        key={delivery.orderId}
                        className={[
                          "w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition",
                          selected
                            ? "border-red-500 ring-2 ring-red-100"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-md",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(delivery.orderId)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-950">
                                Pedido #{delivery.orderId}
                              </p>
                              <p className="mt-0.5 text-sm text-slate-500">
                                {delivery.client.name}
                              </p>
                            </div>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                              {DELIVERY_STATUS_LABELS[
                                delivery.deliveryStatus ?? ""
                              ] ?? "Aguardando"}
                            </span>
                          </div>
                          <div className="mt-4 space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-700">
                              <UserRound className="h-4 w-4 text-slate-400" />
                              {delivery.deliveryPerson?.name ??
                                "Entregador não definido"}
                            </div>
                            {delivery.deliveryPerson?.vehicle && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Truck className="h-4 w-4 text-slate-400" />
                                {delivery.deliveryPerson.vehicle.model} ·{" "}
                                {delivery.deliveryPerson.vehicle.plate}
                              </div>
                            )}
                            {delivery.destination && (
                              <div className="flex items-start gap-2 text-slate-600">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                <span className="line-clamp-2">
                                  {delivery.destination.label}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${signal.className}`}
                            >
                              {signal.label}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatLastSignal(delivery)}
                            </span>
                          </div>
                        </button>
                        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                          <Link
                            href={`/orders/${delivery.orderId}`}
                            className="text-xs font-semibold text-red-700 hover:underline"
                          >
                            Ver detalhes do pedido
                          </Link>
                          {canManage && !delivery.deliveryPerson && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setAssigningOrder(delivery);
                                setDeliveryPersonId("");
                              }}
                            >
                              Atribuir entregador
                            </Button>
                          )}
                          {canManage &&
                            delivery.deliveryStatus === "PICKUP" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => void unassign(delivery)}
                                >
                                  Trocar entregador
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setVerifyingOrder(delivery);
                                    setPickupCode("");
                                  }}
                                >
                                  <ShieldCheck className="mr-1.5 h-4 w-4" />{" "}
                                  Validar retirada
                                </Button>
                              </>
                            )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <DeliveriesMap
                  unit={snapshot.unit}
                  deliveries={deliveries}
                  selectedOrderId={selectedOrderId}
                  onSelect={setSelectedOrderId}
                />
              </section>
            )}
          </>
        )}

        {tab === "people" && (
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 border-b p-5">
                <UsersRound className="h-5 w-5 text-red-700" />
                <div>
                  <h2 className="font-bold text-slate-950">
                    Entregadores da unidade
                  </h2>
                  <p className="text-sm text-slate-500">
                    Aprove cadastros antes de atribuir pedidos.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-4">Entregador</th>
                      <th className="p-4">Perfil</th>
                      <th className="p-4">Veículo</th>
                      <th className="p-4">Operação</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((person) => (
                      <tr key={person.membershipId} className="border-t">
                        <td className="p-4">
                          <strong>{person.user.name}</strong>
                          <div className="text-slate-500">
                            {person.user.email}
                          </div>
                        </td>
                        <td className="p-4">
                          {person.profileStatus === "ACTIVE"
                            ? "Aprovado"
                            : person.profileStatus === "PENDING"
                              ? "Pendente"
                              : "Inativo"}
                        </td>
                        <td className="p-4">
                          {person.vehicle
                            ? `${person.vehicle.model} · ${person.vehicle.plate}`
                            : person.deliveryPersonId
                              ? person.profileStatus === "PENDING"
                                ? "Cadastro inicial"
                                : "Sem veículo ativo"
                              : "Não cadastrado"}
                        </td>
                        <td className="p-4">
                          {person.activeOrderId
                            ? `Pedido #${person.activeOrderId}`
                            : "Disponível"}
                        </td>
                        <td className="p-4 text-right">
                          {canManage &&
                            person.profileStatus === "PENDING" &&
                            person.deliveryPersonId && (
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => void approve(person)}
                              >
                                Aprovar
                              </Button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {people.length === 0 && (
                  <p className="p-8 text-center text-slate-500">
                    Nenhum entregador vinculado. Cadastre um em Equipe e
                    acessos.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={Boolean(assigningOrder)}
          onOpenChange={(open) => !open && setAssigningOrder(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Atribuir pedido #{assigningOrder?.orderId}
              </DialogTitle>
              <DialogDescription>
                O entregador receberá um código exclusivo para apresentar na
                retirada.
              </DialogDescription>
            </DialogHeader>
            <select
              aria-label="Entregador"
              value={deliveryPersonId}
              onChange={(event) => setDeliveryPersonId(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">Selecione um entregador disponível</option>
              {availablePeople.map((person) => (
                <option
                  key={person.deliveryPersonId}
                  value={person.deliveryPersonId ?? ""}
                >
                  {person.user.name}
                </option>
              ))}
            </select>
            {availablePeople.length === 0 && (
              <p className="text-sm text-amber-700">
                Não há entregadores aprovados e disponíveis.
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssigningOrder(null)}>
                Cancelar
              </Button>
              <Button
                disabled={busy || !deliveryPersonId}
                onClick={() => void assign()}
              >
                {busy ? "Atribuindo..." : "Atribuir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(verifyingOrder)}
          onOpenChange={(open) => !open && setVerifyingOrder(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Validar retirada do pedido #{verifyingOrder?.orderId}
              </DialogTitle>
              <DialogDescription>
                Digite o código de 6 dígitos apresentado pelo entregador. A
                unidade não visualiza o código esperado.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={pickupCode}
              onChange={(event) =>
                setPickupCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="text-center text-2xl tracking-[0.5em]"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setVerifyingOrder(null)}>
                Cancelar
              </Button>
              <Button
                disabled={busy || pickupCode.length !== 6}
                onClick={() => void verifyPickup()}
              >
                {busy ? "Validando..." : "Confirmar e liberar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
