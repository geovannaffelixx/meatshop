"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AddressPinPicker, type AddressPin } from '@/shared/components/maps/address-pin-picker';
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { Spinner } from "@/shared/components/ui/spinner";
import {
  API_URL,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  resolveAssetUrl,
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
  latitude?: number | null;
  longitude?: number | null;
  coordinate_source?: string;
  delivery_radius_km?: number;
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
  const { unitId, refresh } = usePanelAccess();
  const [unit, setUnit] = useState<UnitForm>(emptyUnit);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [cepResolved, setCepResolved] = useState(false);
  const [pin,setPin] = useState<AddressPin|null>(null);
  const [approximate,setApproximate] = useState<AddressPin|null>(null);
  const cepVersion = useRef(0);

  const load = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
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
    if (cep.length !== 8) {
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
        state: unit.state.toUpperCase(),
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
    setSaving(true);
    try {
      await apiPut(`/units/${unitId}/business-hours`, {
        days: days.map((day) =>
          day.is_open ? day : { weekday: day.weekday, is_open: false },
        ),
      });
      toast.success("Horários de funcionamento atualizados.");
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file?: File) {
    if (!file || !unitId) return;
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(`${API_URL}/units/${unitId}/logo`, {
        method: "POST",
        body,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Não foi possível enviar a imagem.");
      toast.success("Logo da unidade atualizada.");
      await Promise.all([load(), refresh()]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a imagem.",
      );
    }
  }

  if (loading)
    return <p className="p-6 text-gray-500">Carregando configurações...</p>;
  const field = (key: keyof UnitForm, label: string, disabled = false) => (
    <label className="text-sm font-medium text-gray-700">
      {label}
      <input
        disabled={disabled}
        value={unit[key] ?? ""}
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
    <div className="page-container max-w-6xl">
      <section className="rounded-xl border bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Configurações da unidade
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Informações públicas e operacionais do açougue selecionado.
        </p>
        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
            {unit.image_url ? (
              <Image
                src={resolveAssetUrl(unit.image_url)}
                alt="Logo da unidade"
                width={80}
                height={80}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-gray-400">
                {unit.name.charAt(0)}
              </span>
            )}
          </div>
          <label className="cursor-pointer rounded-md border px-4 py-2 text-sm font-semibold hover:bg-gray-50">
            Alterar logo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void uploadLogo(event.target.files?.[0])}
            />
          </label>
        </div>
        <form onSubmit={saveUnit} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            {field("name", "Nome do açougue")}
          </div>
          {field("cnpj", "CNPJ", true)}
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
            <button
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
            >
              {saving && <Spinner />}
              {saving ? "Salvando..." : "Salvar dados"}
            </button>
          </div>
        </form>
      </section>
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold">Horários de funcionamento</h2>
        <div className="mt-4 space-y-3">
          {days.map((day, index) => (
            <div
              key={day.weekday}
              className="grid items-center gap-3 rounded-md border p-3 sm:grid-cols-[180px_90px_1fr_1fr]"
            >
              <span className="font-medium">
                {weekdays.find(([value]) => value === day.weekday)?.[1]}
              </span>
              <label className="flex items-center gap-2 text-sm">
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
              <input
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
        <button
          type="button"
          onClick={() => void saveHours()}
          disabled={saving}
          className="mt-5 flex items-center gap-2 rounded-md bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
        >
          {saving && <Spinner />}
          {saving ? "Salvando..." : "Salvar horários"}
        </button>
      </section>
    </div>
    </div>
  );
}

export function ProfileScreen() {
  return <UnitSettings />;
}
