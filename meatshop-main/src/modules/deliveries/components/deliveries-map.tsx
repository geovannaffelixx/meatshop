"use client";
import { useEffect, useRef, useState } from 'react';
import type { Map, Marker } from 'maplibre-gl';
import { mapStyle, validPoint } from '@/shared/components/maps/map-style';
import type { LiveDelivery, LiveDeliveriesSnapshot } from '../types';

export function DeliveriesMap({unit,deliveries,selectedOrderId,onSelect}:{
  unit:LiveDeliveriesSnapshot['unit'];deliveries:LiveDelivery[];selectedOrderId:number|null;onSelect:(id:number)=>void;
}) {
  const host=useRef<HTMLDivElement>(null);
  const map=useRef<Map|null>(null);
  const library=useRef<typeof import('maplibre-gl')|null>(null);
  const markers=useRef(new globalThis.Map<string,Marker>());
  const fitted=useRef(false);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const [follow,setFollow]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    fitted.current=false;
    const timeout=setTimeout(()=>{if(!cancelled)setError('O mapa demorou para carregar. Verifique a conexão e tente novamente.');},15000);
    void import('maplibre-gl').then(lib=>{
      if(cancelled||!host.current)return;
      setReady(false);
      library.current=lib;
      const instance=new lib.Map({container:host.current,style:mapStyle,
        center:validPoint(unit.latitude,unit.longitude)?[unit.longitude!,unit.latitude!]:[-51.9,-14.2],
        zoom:validPoint(unit.latitude,unit.longitude)?13:4});
      map.current=instance;
      instance.addControl(new lib.NavigationControl(),'top-right');
      instance.on('load',()=>{clearTimeout(timeout);if(!cancelled){setReady(true);setError('');}});
      instance.on('error',()=>{if(!cancelled)setError('Falha ao carregar o mapa. Verifique a conexão ou tente novamente.');});
      instance.on('dragstart',()=>setFollow(false));
    }).catch(()=>{if(!cancelled)setError('Mapa indisponível. Verifique o suporte a WebGL.');});
    const currentMarkers=markers.current;
    return ()=>{cancelled=true;clearTimeout(timeout);currentMarkers.forEach(m=>m.remove());currentMarkers.clear();map.current?.remove();map.current=null;};
  },[unit.id,unit.latitude,unit.longitude,retry]);

  useEffect(()=>{
    const instance=map.current, lib=library.current;
    if(!ready||!instance||!lib)return;
    const wanted=new Set<string>();
    const points:[number,number][]=[];
    function put(key:string,lat:number|null,lng:number|null,label:string,color:string,orderId?:number){
      if(!validPoint(lat,lng))return;
      wanted.add(key);points.push([lng!,lat!]);
      let marker=markers.current.get(key);
      if(!marker){
        const el=document.createElement('button');el.type='button';
        el.className='rounded-full border-2 border-white px-2 py-1 text-xs font-bold text-white shadow-lg';
        if(orderId)el.addEventListener('click',()=>onSelect(orderId));
        marker=new lib!.Marker({element:el}).setLngLat([lng!,lat!]).addTo(instance!);
        markers.current.set(key,marker);
      }
      marker.setLngLat([lng!,lat!]);
      const el=marker.getElement();el.textContent=label;el.title=label;el.style.backgroundColor=color;
    }
    put('unit',unit.latitude,unit.longitude,'Unidade','#b91c1c');
    for(const delivery of deliveries){
      if(delivery.destination)put('dest:'+delivery.orderId,delivery.destination.latitude,delivery.destination.longitude,
        'Destino #'+delivery.orderId,'#15803d',delivery.orderId);
      if(delivery.location)put('driver:'+delivery.orderId,delivery.location.latitude,delivery.location.longitude,
        'Entregador #'+delivery.orderId,selectedOrderId===delivery.orderId?'#2563eb':'#334155',delivery.orderId);
    }
    markers.current.forEach((marker,key)=>{if(!wanted.has(key)){marker.remove();markers.current.delete(key);}});
    if(!fitted.current&&points.length){
      const bounds=new lib.LngLatBounds(points[0],points[0]);points.forEach(point=>bounds.extend(point));
      instance.fitBounds(bounds,{padding:65,maxZoom:16,duration:300});fitted.current=true;
    }
    const selected=deliveries.find(d=>d.orderId===selectedOrderId);
    if(follow&&selected?.location)instance.easeTo({center:[selected.location.longitude,selected.location.latitude],duration:400});
  },[ready,unit,deliveries,onSelect,selectedOrderId,follow]);
  return <div className="relative h-[420px] overflow-hidden rounded-2xl border xl:h-[560px]">
    <div ref={host} className="h-full w-full" aria-label="Mapa com unidade, destinos e entregadores" />
    <button type="button" onClick={()=>setFollow(v=>!v)} className="absolute left-3 top-3 rounded bg-white p-2 text-sm shadow">
      {follow?'Parar de seguir':'Seguir entregador selecionado'}
    </button>
    {!ready&&!error&&<p className="absolute bottom-3 left-3 bg-white p-2">Carregando mapa…</p>}
    {error&&<div className="absolute bottom-3 left-3 right-3 rounded bg-white p-3 text-sm">{error}
      <button type="button" className="ml-3 underline" onClick={()=>{setReady(false);setError('');setRetry(v=>v+1);}}>Tentar novamente</button>
    </div>}
  </div>;
}
