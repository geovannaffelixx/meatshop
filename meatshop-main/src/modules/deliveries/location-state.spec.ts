import {mergeSnapshot,newerPoint} from './location-state';
import type {DeliveryLocation,LiveDeliveriesSnapshot,LiveDelivery} from './types';
const point=(seconds:number,id=1):DeliveryLocation=>({latitude:-23,longitude:-46,recordedAt:new Date(seconds*1000).toISOString(),capturedAt:new Date(seconds*1000).toISOString(),pointId:id});
const snapshot=(location:DeliveryLocation|null,generated=20,courier=1,unit=1):LiveDeliveriesSnapshot=>({
 unit:{id:unit,name:'Unit',latitude:-23,longitude:-46},generatedAt:new Date(generated*1000).toISOString(),
 deliveries:[{orderId:1,deliveryPerson:{id:courier},location} as LiveDelivery]
});
describe('delivery reconciliation',()=>{
 it('does not replace a socket update with an older HTTP response',()=>{
  expect(mergeSnapshot(snapshot(point(30)),snapshot(point(10))).deliveries[0].location).toEqual(point(30));
 });
 it('clears a revoked location unless the event happened after snapshot generation',()=>{
  expect(mergeSnapshot(snapshot(point(10)),snapshot(null)).deliveries[0].location).toBeNull();
  expect(mergeSnapshot(snapshot(point(30)),snapshot(null)).deliveries[0].location).toEqual(point(30));
 });
 it('never carries a location across courier or unit changes',()=>{
  expect(mergeSnapshot(snapshot(point(30)),snapshot(null,20,2)).deliveries[0].location).toBeNull();
  expect(mergeSnapshot(snapshot(point(30)),snapshot(null,20,1,2)).deliveries[0].location).toBeNull();
 });
 it('discards invalid coordinates and orders ties by persisted point id',()=>{
  expect(newerPoint(point(10),{...point(20),latitude:NaN})).toEqual(point(10));
  expect(newerPoint(point(10),{...point(20),latitude:91})).toEqual(point(10));
  expect(newerPoint(point(10),point(10,2))).toEqual(point(10,2));
 });
});
