"use client";
import { useEffect, useRef, useState } from 'react';
import type { Map, Marker } from 'maplibre-gl';
import { mapStyle, validPoint } from './map-style';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
export type AddressPin = {latitude:number;longitude:number};

export function AddressPinPicker({initial,onConfirm}: {initial?:AddressPin|null;onConfirm:(point:AddressPin)=>void}) {
  const [open,setOpen]=useState(false);
  return <>
    <button type="button" className="rounded-md border px-4 py-2 font-semibold" onClick={()=>setOpen(true)}>Marcar entrada no mapa</button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>Confirme o endereço no mapa</DialogTitle>
      <DialogDescription>O CEP indica uma região aproximada. Clique na entrada correta da casa ou do estabelecimento.</DialogDescription></DialogHeader>
      {open && <PinMap initial={initial} onConfirm={point=>{onConfirm(point);setOpen(false);}} />}
    </DialogContent></Dialog>
  </>;
}
function PinMap({initial,onConfirm}:{initial?:AddressPin|null;onConfirm:(point:AddressPin)=>void}) {
  const host=useRef<HTMLDivElement>(null);
  const map=useRef<Map|null>(null);
  const marker=useRef<Marker|null>(null);
  const [point,setPoint]=useState<AddressPin|null>(initial&&validPoint(initial.latitude,initial.longitude)?initial:null);
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    const timeout=setTimeout(()=>{if(!cancelled)setError('O mapa demorou para carregar. Feche e tente novamente.');},15000);
    void import('maplibre-gl').then(lib=>{
      if(cancelled||!host.current)return;
      const hasInitial=initial&&validPoint(initial.latitude,initial.longitude);
      const instance=new lib.Map({container:host.current,style:mapStyle,
        center:hasInitial?[initial.longitude,initial.latitude]:[-51.9,-14.2],zoom:hasInitial?17:4});
      map.current=instance;
      marker.current=new lib.Marker({color:'#dc2626'});
      marker.current.getElement().style.pointerEvents='none';
      if(hasInitial) marker.current.setLngLat([initial.longitude,initial.latitude]).addTo(instance);
      instance.addControl(new lib.NavigationControl());
      instance.on('load',()=>{clearTimeout(timeout);if(!cancelled){setReady(true);instance.resize();}});
      instance.on('error',()=>{if(!cancelled)setError('Não foi possível carregar parte do mapa. Verifique a conexão.');});
      instance.on('click',event=>{
        const next={latitude:event.lngLat.lat,longitude:event.lngLat.lng};
        marker.current?.setLngLat(event.lngLat).addTo(instance);
        setPoint(next);
      });
    }).catch(()=>setError('Mapa indisponível neste navegador.'));
    return ()=>{cancelled=true;clearTimeout(timeout);marker.current?.remove();map.current?.remove();map.current=null;};
  },[initial]);
  function locate(){
    if(!navigator.geolocation){setError('Localização indisponível. Escolha o ponto manualmente.');return;}
    navigator.geolocation.getCurrentPosition(position=>{
      const next={latitude:position.coords.latitude,longitude:position.coords.longitude};
      setPoint(next); map.current?.flyTo({center:[next.longitude,next.latitude],zoom:18});
      if(map.current)marker.current?.setLngLat([next.longitude,next.latitude]).addTo(map.current);
      setError(`Precisão do GPS: ${Math.round(position.coords.accuracy)} m. Confira a entrada antes de confirmar.`);
    },()=>setError('Sem acesso ao GPS. Você pode marcar o ponto manualmente.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }
  return <>
    <div ref={host} className="h-80 w-full rounded-lg" aria-label="Escolha o ponto do endereço" />
    {!ready&&!error&&<p role="status">Carregando mapa…</p>}
    {error&&<p role="status" className="text-sm">{error}</p>}
    <div className="flex justify-between gap-3">
      <button type="button" onClick={locate} disabled={!ready} className="rounded border px-3 py-2">Usar minha localização</button>
      <button type="button" disabled={!point||!ready} onClick={()=>point&&onConfirm(point)}
        className="rounded bg-red-700 px-3 py-2 text-white disabled:opacity-50">Confirmar ponto</button>
    </div>
  </>;
}
