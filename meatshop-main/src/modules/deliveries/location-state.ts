import type { DeliveryLocation, LiveDeliveriesSnapshot } from './types';
export function pointTime(point:DeliveryLocation):number {
  return Date.parse(point.capturedAt ?? point.recordedAt);
}
export function newerPoint(current:DeliveryLocation|null,incoming:DeliveryLocation|null):DeliveryLocation|null {
  if(!incoming)return current;
  if(!Number.isFinite(incoming.latitude)||!Number.isFinite(incoming.longitude)||
    Math.abs(incoming.latitude)>90||Math.abs(incoming.longitude)>180||!Number.isFinite(pointTime(incoming)))return current;
  if(!current)return incoming;
  return pointTime(incoming)>pointTime(current) ||
    (pointTime(incoming)===pointTime(current)&&(incoming.pointId??0)>(current.pointId??0)) ? incoming:current;
}
export function mergeSnapshot(current:LiveDeliveriesSnapshot|null,incoming:LiveDeliveriesSnapshot):LiveDeliveriesSnapshot {
  if(!current||current.unit.id!==incoming.unit.id)return incoming;
  const old=new Map(current.deliveries.map(d=>[d.orderId,d]));
  return {...incoming,deliveries:incoming.deliveries.map(delivery=>{
    const previous=old.get(delivery.orderId);
    if(!previous||previous.deliveryPerson?.id!==delivery.deliveryPerson?.id)return delivery;
    if(!delivery.location){
      // Preserve only events recorded after this snapshot was generated.
      const newer=previous.location&&Date.parse(previous.location.recordedAt)>Date.parse(incoming.generatedAt);
      return {...delivery,location:newer?previous.location:null};
    }
    return {...delivery,location:newerPoint(previous.location,delivery.location)};
  })};
}
