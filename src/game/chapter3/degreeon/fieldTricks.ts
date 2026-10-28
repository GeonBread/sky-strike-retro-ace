import type {Engine} from './engine';
import {supportFade} from './continuity';
import type {Pattern,Vec,Entity,Shot} from './core';
import {clamp,distance,segmentDistance,pointInPolygon,polygonCentroid} from './core';
export type PortalPair={a:Vec;b:Vec;color:string};
export type FieldTricks={portalAge:number;portalRound:number;teleports:number;magnetAge:number;magnetRound:number};
export const freshFieldTricks=():FieldTricks=>({portalAge:0,portalRound:0,teleports:0,magnetAge:0,magnetRound:0});
const enabled=(e:Engine,id:string)=>e.phase==='active'&&supportFade(e)>.01&&(e.pattern.id===id||e.pattern.category!=='special'&&e.selectedSupports.has(id));
export const PORTAL_WARN=1.15,PORTAL_CYCLE=7.2,MAGNET_WARN=1.05,MAGNET_CYCLE=6.8,PORTAL_RADIUS=31;
function playable(e:Engine,p:Vec):Vec{
 if(!e.cutEnabled||e.cutPolygon.length<3||pointInPolygon(p,e.cutPolygon))return p;
 const center=polygonCentroid(e.cutPolygon),q=e.cutPolygon.map((v,i)=>e.nearestPoint(p,v,e.cutPolygon[(i+1)%e.cutPolygon.length])).sort((a,b)=>distance(a,p)-distance(b,p))[0],d=distance(q,center)||1;
 return{x:q.x+(center.x-q.x)/d*60,y:q.y+(center.y-q.y)/d*60};
}
export function portalPairs(e:Engine):PortalPair[]{
 const k=e.fieldTricks.portalRound%3,positions=k===0?[[-.31,-.12],[.30,.26]]:k===1?[[.24,-.24],[-.26,.26]]:[[-.25,.04],[.25,.04]];
 const p=positions.map(([x,y])=>playable(e,{x:x*e.fieldW,y:y*e.fieldH}));return distance(p[0],p[1])>120?[{a:p[0],b:p[1],color:'#82ffe0'}]:[];
}
export function magnetBand(e:Engine){const s=e.fieldTricks,vertical=s.magnetRound%2===1;return{vertical,center:Math.sin(s.magnetRound*1.7)*.12*(vertical?e.fieldW:e.fieldH),width:Math.min(150,(vertical?e.fieldW:e.fieldH)*.23),sign:s.magnetRound%4<2?1:-1};}
export function updateFieldTricks(e:Engine,dt:number){
 if(enabled(e,'portals')&&e.emitting){const s=e.fieldTricks;s.portalAge+=dt*e.localTime(e.boss);if(s.portalAge>=PORTAL_CYCLE){s.portalAge-=PORTAL_CYCLE;s.portalRound++;e.log('오염 포탈 위치 변경 · 1.15초 예고');}}
 if(enabled(e,'magnet')&&e.emitting){const s=e.fieldTricks;s.magnetAge+=dt*e.localTime(e.boss);if(s.magnetAge>=MAGNET_CYCLE){s.magnetAge-=MAGNET_CYCLE;s.magnetRound++;e.log('자력띠 방향 변경 · 화살표 예고');}}
}
type Projectile=(Entity|Shot)&{portalCooldown?:number};
/** Force applies within the strip. Speed is conserved and the exit tangent is retained. */
export function bendInMagnet(e:Engine,p:Projectile,dt:number){
 if(!enabled(e,'magnet')||e.fieldTricks.magnetAge<MAGNET_WARN)return;
 const b=magnetBand(e),v=b.vertical?p.x:p.y;if(Math.abs(v-b.center)>b.width/2)return;
 const vx=p.vx??0,vy=p.vy,speed=Math.hypot(vx,vy);if(speed<2)return;
 const force=(210+e.stage*22)*b.sign*supportFade(e),tx=vx+(b.vertical?0:force*dt),ty=vy+(b.vertical?force*dt:0),n=Math.hypot(tx,ty)||1;p.vx=tx/n*speed;p.vy=ty/n*speed;
}
/** Swept entry handles fast bullets. Transport never traces a collision line between portals. */
export function teleportProjectile(e:Engine,p:Projectile,prev:Vec,dt:number):boolean{
 p.portalCooldown=Math.max(0,(p.portalCooldown??0)-dt);
 if(!enabled(e,'portals')||e.fieldTricks.portalAge<PORTAL_WARN||p.portalCooldown>0)return false;
 if('kind'in p&&(['seed','note','bomb'].includes(p.kind)||p.group!==undefined||p.kind==='rect'&&(p.w>100||p.h>100)))return false;
 const speed=Math.hypot(p.vx??0,p.vy);if(speed<1)return false;
 for(const pair of portalPairs(e))for(const [from,to] of [[pair.a,pair.b],[pair.b,pair.a]]){
  if(segmentDistance(from,prev,p)>PORTAL_RADIUS)continue;
  const n={x:(p.vx??0)/speed,y:p.vy/speed};p.x=to.x+n.x*(PORTAL_RADIUS+18);p.y=to.y+n.y*(PORTAL_RADIUS+18);p.portalCooldown=.32;
  if('trail'in p)p.trail=[];e.fieldTricks.teleports++;e.fx(from,'ring',40,pair.color,.24);e.fx(to,'ring',46,pair.color,.28);return true;
 }return false;
}
export function drawFieldTricks(e:Engine,c:CanvasRenderingContext2D){
 if(enabled(e,'magnet')){const b=magnetBand(e),warning=e.fieldTricks.magnetAge<MAGNET_WARN;c.save();if(b.vertical){c.translate(b.center,0);c.rotate(Math.PI/2);}else c.translate(0,b.center);
  const length=b.vertical?e.fieldH:e.fieldW;c.fillStyle=warning?'#ffd7790b':'#dd89ff15';c.strokeStyle=warning?'#ffd779aa':'#dd89ff88';c.lineWidth=2;c.setLineDash(warning?[9,8]:[]);c.fillRect(-length/2,-b.width/2,length,b.width);c.strokeRect(-length/2,-b.width/2,length,b.width);c.setLineDash([]);c.strokeStyle=warning?'#ffe6a8':'#e5afff';c.lineWidth=3;
  for(let x=-length/2+30;x<length/2;x+=90){const dx=x+(warning?0:(e.clock*32%90)*b.sign);c.beginPath();c.moveTo(dx-b.sign*10,-8);c.lineTo(dx,0);c.lineTo(dx-b.sign*10,8);c.stroke();}c.restore();
 }
 if(enabled(e,'portals'))for(const pair of portalPairs(e))for(const p of [pair.a,pair.b]){const warning=e.fieldTricks.portalAge<PORTAL_WARN;c.save();c.translate(p.x,p.y);c.rotate(e.clock*(warning?.6:1.8));c.shadowColor=pair.color;c.shadowBlur=warning?0:20;c.fillStyle='#061e23bb';c.strokeStyle=pair.color;c.lineWidth=3;c.setLineDash(warning?[5,6]:[]);c.beginPath();c.arc(0,0,PORTAL_RADIUS,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);
  for(let i=0;i<3;i++){c.rotate(Math.PI*2/3);c.beginPath();c.arc(0,0,PORTAL_RADIUS-8,.1,1.5);c.stroke();c.fillStyle='#effff8';c.beginPath();c.moveTo(PORTAL_RADIUS+5,0);c.lineTo(PORTAL_RADIUS-4,-5);c.lineTo(PORTAL_RADIUS-4,5);c.fill();}c.restore();
 }
}
const support=(id:string,name:string,english:string,subtitle:string):Pattern=>({id,name,english,subtitle,category:'support',orientation:0,stages:['규칙 학습','위치 변경','복합 탄막','고속 대응'],duration:30,enter:()=>{},update:()=>{},render:()=>{},exit:()=>{}});
export const fieldTrickPatterns=[support('portals','한 쌍의 오염 포탈','CORRUPTED PORTALS','같은 색 포탈로 적 탄과 아군 탄이 이동합니다. 이동 방향과 속도는 그대로 유지됩니다.'),support('magnet','오염 자력띠','MAGNETIC CORRUPTION','화살표 예고 뒤 탄이 띠 안에서만 휘어집니다. 아군 탄도 영향을 받습니다.')];
