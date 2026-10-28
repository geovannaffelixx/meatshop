"use client";

import { maskCNPJ } from "@/shared/lib/input-masks";

import { validateRequiredText, validateCEP, validateUF } from "@/shared/lib/validators";

import { peekApiData } from "@/shared/lib/query-cache";

import { DataSkeleton } from "@/shared/components/data-skeleton";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/shared/components/page-header";
import { UnitImages } from "./unit-images";
import { UnitStatusToggle } from "./unit-status-toggle";
import { AddressPinPicker, type AddressPin } from '@/shared/components/maps/address-pin-picker';
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { Spinner } from "@/shared/components/ui/spinner";
import { Button } from "@/shared/components/ui/button";
import {
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";
import { CheckCircle2, Search } from "lucide-react";

type UnitForm = {
  name: string;
  cnpj: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  image_url?: string | null;
  cover_url?: string | null;
  gallery_urls?: string[];
  latitude?: number | null;
  longitude?: number | null;
  coordinate_source?: string;
  delivery_radius_km?: number;
  scheduling_slot_minutes?: number | null;
  scheduling_capacity?: number | null;
  is_active?: boolean;
};
type Day = {
  weekday: string;
  is_open: boolean;
  opening_time: string | null;
  closing_time: string | null;
};
type CepLookup = Pick<
  UnitForm,
  "zip_code" | "street" | "neighborhood" | "city" | "state"
> & {
  latitude: number;
  longitude: number;
};

const weekdays = [
  ["MONDAY", "Segunda-feira"],
  ["TUESDAY", "Terça-feira"],
  ["WEDNESDAY", "Quarta-feira"],
  ["THURSDAY", "Quinta-feira"],
  ["FRIDAY", "Sexta-feira"],
  ["SATURDAY", "Sábado"],
  ["SUNDAY", "Domingo"],
];

const emptyUnit: UnitForm = {
  name: "",
  cnpj: "",
  zip_code: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

function UnitSettings() {
  const { unitId, refresh, selectedMembership } = usePanelAccess();
  const cachedUnit = unitId ? peekApiData<UnitForm & { latitude?: number; longitude?: number; coordinate_source?: string }>(`/units/${unitId}/settings`) : undefined;
  const cachedHours = unitId ? peekApiData<Day[]>(`/units/${unitId}/business-hours`) : undefined;
  const cachedPoint = cachedUnit?.latitude != null && cachedUnit?.longitude != null ? { latitude: Number(cachedUnit.latitude), longitude: Number(cachedUnit.longitude) } : null;
  const [unit, setUnit] = useState<UnitForm>(() => ({ ...emptyUnit, ...cachedUnit }));
  const [days, setDays] = useState<Day[]>(() => cachedHours ?? []);
  const [loading, setLoading] = useState(!cachedUnit || !cachedHours);
  const [saving, setSaving] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [cepResolved, setCepResolved] = useState(false);
  const [pin,setPin] = useState<AddressPin|null>(cachedUnit?.coordinate_source === 'USER_PIN' ? cachedPoint : null);
  const [approximate,setApproximate] = useState<AddressPin|null>(cachedPoint);
  const cepVersion = useRef(0);

  const load = useCallback(async () => {
    if (!unitId) return;
    setLoading(!peekApiData(`/units/${unitId}/settings`) || !peekApiData(`/units/${unitId}/business-hours`));
    try {
      const [unitData, hours] = await Promise.all([
        apiGet(`/units/${unitId}/settings`),
        apiGet(`/units/${unitId}/business-hours`),
      ]);
      setUnit({ ...emptyUnit, ...unitData });
      const point = unitData.latitude != null && unitData.longitude != null ?
        {latitude:Number(unitData.latitude),longitude:Number(unitData.longitude)} : null;
      setApproximate(point);
      setPin(unitData.coordinate_source==='USER_PIN'?point:null);
      setDays(
        weekdays.map(
          ([weekday]) =>
            hours.find((day: Day) => day.weekday === weekday) ?? {
              weekday,
              is_open: false,
              opening_time: "08:00",
              closing_time: "18:00",
            },
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function lookupCep() {
    if (lookingUpCep) return;
    const cep = unit.zip_code.replace(/\D/g, "");
    if (!validateCEP(unit.zip_code)) {
      toast.warning("Informe um CEP válido com 8 dígitos.");
      return;
    }
    const version=++cepVersion.current;
    setLookingUpCep(true);
    setCepResolved(false);
    try {
      const address = (await apiPost("/geocoding/resolve", {
        zip_code: cep,
      })) as CepLookup;
      if(version!==cepVersion.current)return;
      setPin(null);
      setApproximate(address.latitude!=null&&address.longitude!=null?{latitude:Number(address.latitude),longitude:Number(address.longitude)}:null);
      setUnit((current) => ({
        ...current,
        zip_code: address.zip_code,
        street: address.street,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
      }));
      setCepResolved(true);
      toast.success("Endereço localizado. Confira o número antes de salvar.");
    } catch {
      return;
    } finally {
      setLookingUpCep(false);
    }
  }

  async function saveUnit(event: React.FormEvent) {
    event.preventDefault();
    if (!unitId) return;
    const validationError = !validateRequiredText(unit.name, 100, 3) ? 'Informe o nome da unidade.' : !validateCEP(unit.zip_code) ? 'Informe um CEP válido.' : !validateUF(unit.state) ? 'Informe uma UF válida.' : !validateRequiredText(unit.city, 80) ? 'Informe a cidade.' : null;
    if (validationError) { toast.warning(validationError); return; }
    setSaving(true);
    try {
      await apiPatch(`/units/${unitId}`, {
        name: unit.name,
        zip_code: unit.zip_code,
        street: unit.street || null,
        number: unit.number || null,
        complement: unit.complement || null,
        neighborhood: unit.neighborhood || null,
        city: unit.city,
        state: unit.state.trim().toUpperCase(),
        delivery_radius_km: Number(unit.delivery_radius_km ?? 25),
        ...(pin ?? {}),
      });
      toast.success("Dados da unidade atualizados.");
      await Promise.all([refresh(), load()]);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }

  async function saveHours() {
    if (!unitId) return;
    const invalidDay = days.find(
      (day) =>
        day.is_open &&
        (!day.opening_time ||
          !day.closing_time ||
          day.closing_time <= day.opening_time),
    );
    if (invalidDay) {
      toast.warning("Confira os horários: o fechamento deve ser posterior à abertura.");
      return;
    }
    const slotMinutes = unit.scheduling_slot_minutes;
    const schedulingCapacity = unit.scheduling_capacity;
    const schedulingEnabled = slotMinutes != null && schedulingCapacity != null;
    if (
      slotMinutes != null &&
      schedulingCapacity != null &&
      (!Number.isInteger(slotMinutes) ||
        slotMinutes < 5 ||
        slotMinutes > 240 ||
        !Number.isInteger(schedulingCapacity) ||
        schedulingCapacity < 1 ||
        schedulingCapacity > 1000)
    ) {
      toast.warning("Informe um intervalo entre 5 e 240 minutos e uma capacidade entre 1 e 1000 pedidos.");
      return;
    }
    setSaving(true);
    try {
      await apiPut(`/units/${unitId}/business-hours`, {
          days: days.map((day) =>
            day.is_open ? {
              weekday: day.weekday,
              is_open: true,
              opening_time: day.opening_time?.slice(0, 5),
              closing_time: day.closing_time?.slice(0, 5),
            } : { weekday: day.weekday, is_open: false },
          ),
          scheduling_slot_minutes: schedulingEnabled
            ? unit.scheduling_slot_minutes
            : null,
          scheduling_capacity: schedulingEnabled
            ? unit.scheduling_capacity
            : null,
      });
      toast.success("Horários e capacidade de agendamento atualizados.");
    } catch {
      toast.error("Não foi possível salvar os horários e o agendamento. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <DataSkeleton label="Carregando configurações..." />;
  const field = (key: keyof Pick<UnitForm, "name" | "cnpj" | "zip_code" | "street" | "number" | "complement" | "neighborhood" | "city" | "state">, label: string, disabled = false) => (
    <label className="text-sm font-medium text-gray-700">
      {label}
      <input
        disabled={disabled}
        value={key === "cnpj" ? maskCNPJ(unit[key] ?? "") : unit[key] ?? ""}
        onChange={(event) =>
          { if(['street','number','city','state','neighborhood'].includes(key))setPin(null);
            setUnit((current) => ({ ...current, [key]: event.target.value })); }
        }
        className="mt-1 w-full rounded-md border px-3 py-2 disabled:bg-gray-100"
      />
    </label>
  );

  return (
    <div className="page-surface">
    <div className="page-container max-w-5xl">
      <PageHeader eyebrow="Configurações" title="Unidade" description="Gerencie a apresentação do açougue, o endereço e a operação de entrega."
        actions={unitId ? <UnitStatusToggle unitId={unitId} isActive={unit.is_active ?? true} canManage={selectedMembership?.role === "OWNER"}
          onChanged={(isActive) => { setUnit((current) => ({ ...current, is_active: isActive })); void refresh(); }} /> : undefined} />
      {unitId && <UnitImages unitId={unitId} logo={unit.image_url} cover={unit.cover_url} gallery={unit.gallery_urls ?? []}
        onSaved={async () => {
          const updated = await apiGet(`/units/${unitId}/settings`);
          setUnit(current => ({ ...current, image_url: updated.image_url, cover_url: updated.cover_url, gallery_urls: updated.gallery_urls }));
          await refresh();
        }} />}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Dados da unidade</h2>
        <p className="mt-1 text-sm text-slate-500">Identificação pública do açougue.</p>
        <form onSubmit={saveUnit} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            {field("name", "Nome do açougue")}
          </div>
          <div className="md:col-span-2 max-w-md">{field("cnpj", "CNPJ", true)}</div>
          <div className="md:col-span-2 mt-4 border-t pt-6"><h3 className="font-semibold text-slate-900">Endereço da unidade</h3><p className="mt-1 text-sm text-slate-500">Busque pelo CEP e confira o endereço completo.</p></div>
          <label className="text-sm font-medium text-gray-700">
            CEP
            <div className="mt-1 flex gap-2">
              <input
                inputMode="numeric"
                value={unit.zip_code}
                onChange={(event) => {
                  const digits = event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 8);
                  const formatted =
                    digits.length > 5
                      ? `${digits.slice(0, 5)}-${digits.slice(5)}`
                      : digits;
                  ++cepVersion.current;
                  setPin(null);setApproximate(null);
                  setCepResolved(false);
                  setUnit((current) => ({ ...current, zip_code: formatted }));
                }}
                onBlur={() => {
                  if (
                    unit.zip_code.replace(/\D/g, "").length === 8 &&
                    !cepResolved
                  ) {
                    void lookupCep();
                  }
                }}
                className="w-full rounded-md border px-3 py-2"
                placeholder="00000-000"
              />
              <button
                type="button"
                disabled={
                  lookingUpCep || unit.zip_code.replace(/\D/g, "").length !== 8
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void lookupCep()}
                className="inline-flex min-w-28 items-center justify-center gap-2 rounded-md border px-3 py-2 font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                {lookingUpCep ? <Spinner /> : <Search className="h-4 w-4" />}
                {lookingUpCep ? "Buscando" : "Buscar"}
              </button>
            </div>
          </label>
          {field("street", "Logradouro")}
          {field("number", "Número")}
          {field("complement", "Complemento")}
          {field("neighborhood", "Bairro")}
          {field("city", "Cidade")}
          {field("state", "Estado (UF)")}
          <div className="md:col-span-2 mt-4 border-t pt-6"><h3 className="font-semibold text-slate-900">Área de entrega</h3><p className="mt-1 text-sm text-slate-500">Defina o alcance e confirme a entrada do açougue no mapa.</p></div>
          <label className="text-sm">Raio máximo de entrega (km, distância em linha reta)
            <input type="number" min="0.1" max="500" step="0.1" value={unit.delivery_radius_km??25}
              className="mt-1 w-full rounded border p-2"
              onChange={e=>setUnit(current=>({...current,delivery_radius_km:Number(e.target.value)}))} />
          </label>
          <div className="md:col-span-2 space-y-2">
            <AddressPinPicker initial={pin??approximate} onConfirm={setPin} />
            <p className="text-sm text-gray-600">{pin?'Entrada confirmada no mapa.':'Confirme a entrada da unidade para calcular a área de entrega com mais precisão.'}</p>
          </div>
          {cepResolved && (
            <div className="md:col-span-2 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Região do CEP encontrada. Confira o endereço e ajuste o ponto no mapa.
            </div>
          )}
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />}
              {saving ? "Salvando..." : "Salvar dados"}
            </Button>
          </div>
        </form>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold">Horários de funcionamento</h2>
        <div className="mt-4 rounded-md border bg-gray-50 p-4">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={
                unit.scheduling_slot_minutes != null &&
                unit.scheduling_capacity != null
              }
              onChange={(event) =>
                setUnit((current) => ({
                  ...current,
                  scheduling_slot_minutes: event.target.checked ? 30 : null,
                  scheduling_capacity: event.target.checked ? 5 : null,
                }))
              }
            />
            Oferecer agendamento de pedidos
          </label>
          <p className="mt-1 text-sm text-gray-600">
            Sem esta configuração, a unidade não aparece como disponível para agendamento.
          </p>
          {unit.scheduling_slot_minutes != null &&
            unit.scheduling_capacity != null && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">
                  Duração do intervalo (minutos)
                  <input
                    aria-label="Duração do intervalo de agendamento"
                    type="number"
                    min="5"
                    max="240"
                    step="1"
                    value={unit.scheduling_slot_minutes}
                    onChange={(event) =>
                      setUnit((current) => ({
                        ...current,
                        scheduling_slot_minutes: Number(event.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Pedidos por intervalo
                  <input
                    aria-label="Capacidade de pedidos por intervalo"
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={unit.scheduling_capacity}
                    onChange={(event) =>
                      setUnit((current) => ({
                        ...current,
                        scheduling_capacity: Number(event.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
              </div>
            )}
        </div>
        <div className="mt-4 space-y-3">
          {days.map((day, index) => (
            <div
              key={day.weekday}
              className="grid items-center gap-3 rounded-md border p-3 sm:grid-cols-[180px_90px_1fr_1fr]"
            >
              <span className="font-medium">
                {weekdays.find(([value]) => value === day.weekday)?.[1]}
              </span>
              <label htmlFor="field-profile-screen-17588" className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={day.is_open}
                  onChange={(event) =>
                    setDays((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, is_open: event.target.checked }
                          : item,
                      ),
                    )
                  }
                />
                Aberto
              </label>
              <input id="field-profile-screen-17588"
                aria-label="Abertura"
                type="time"
                disabled={!day.is_open}
                value={day.opening_time ?? "08:00"}
                onChange={(event) =>
                  setDays((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, opening_time: event.target.value }
                        : item,
                    ),
                  )
                }
                className="rounded border px-3 py-2 disabled:bg-gray-100"
              />
              <input
                aria-label="Fechamento"
                type="time"
                disabled={!day.is_open}
                value={day.closing_time ?? "18:00"}
                onChange={(event) =>
                  setDays((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, closing_time: event.target.value }
                        : item,
                    ),
                  )
                }
                className="rounded border px-3 py-2 disabled:bg-gray-100"
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => void saveHours()}
          disabled={saving}
          className="mt-5 h-auto whitespace-normal text-left"
        >
          {saving && <Spinner />}
          {saving ? "Salvando..." : "Salvar horários e agendamento"}
        </Button>
      </section>
    </div>
    </div>
  );
}

export function ProfileScreen() {
  return <UnitSettings />;
}
