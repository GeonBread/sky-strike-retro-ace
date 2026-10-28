import type {Engine} from './engine';
import type {Entity,Pattern,Vec} from './core';
import {clamp,distance,smooth,pointInPolygon,polygonCentroid} from './core';
import {bombReaches} from './bomb';
export type RecycleEdge='left'|'right'|'top'|'bottom';
export type RecycleCrystal={edge:RecycleEdge;u:number;age:number;warnAge:number;vx:number;vy:number;kind:Entity['kind'];visual:Entity['visual'];r:number;w:number;h:number;color:string;};
export type RecycleState={phase:'collect'|'warn'|'rest';age:number;bank:RecycleCrystal[];collected:number;returned:number;waves:number;};
export const RECYCLE_COLLECT_TIME=5.2,RECYCLE_WARN_TIME=1.05;
export const freshRecycle=():RecycleState=>({phase:'collect',age:0,bank:[],collected:0,returned:0,waves:0});
export function recycleAnchor(e:Engine,b:RecycleCrystal,launch=false):Vec{
 const inset=launch?-16:18;
 const p=b.edge==='left'||b.edge==='right'?{x:(b.edge==='left'?-1:1)*(e.fieldW/2-inset),y:clamp(b.u*e.fieldH/2,-e.fieldH/2+114,e.fieldH/2-40)}:{x:clamp(b.u*e.fieldW/2,-e.fieldW/2+28,e.fieldW/2-28),y:b.edge==='top'?-e.fieldH/2+(launch?-16:106):e.fieldH/2-inset};
 if(e.cutEnabled&&e.cutPolygon.length>=3&&!pointInPolygon(p,e.cutPolygon)){
  const center=polygonCentroid(e.cutPolygon),near=e.cutPolygon.map((a,i)=>e.nearestPoint(p,a,e.cutPolygon[(i+1)%e.cutPolygon.length])).sort((a,b)=>distance(a,p)-distance(b,p))[0],d=distance(center,near)||1,inset=launch?-12:18;
  return{x:near.x+(center.x-near.x)/d*inset,y:near.y+(center.y-near.y)/d*inset};
 }
 return p;
}
function exitEdge(e:Engine,h:Entity):RecycleEdge|null{
 const rx=h.kind==='orb'||h.kind==='petal'?Math.max(h.r,h.kind==='petal'?17:0):h.w/2,ry=h.kind==='orb'||h.kind==='petal'?Math.max(h.r,h.kind==='petal'?17:0):h.h/2;
 if(h.x+rx< -e.fieldW/2&&h.vx<0)return'left';if(h.x-rx>e.fieldW/2&&h.vx>0)return'right';if(h.y+ry< -e.fieldH/2&&h.vy<0)return'top';if(h.y-ry>e.fieldH/2&&h.vy>0)return'bottom';return null;
}
/** Observe real, launched bullets as they fully leave. Returned bullets never enter this bank again. */
export function collectRecycledBullets(e:Engine){
 if(!e.recycleEnabled||!e.emitting||e.phase!=='active')return;const s=e.recycle,captured=new Set<number>();
 for(const h of e.hazards){
  if(h.recycled||h.edgeSeen||h.age<h.warn||h.age>=h.warn+h.life||h.group!==undefined||['seed','bomb','note'].includes(h.kind)||h.kind==='rect'&&(h.w>100||h.h>100)||h.motion?.kind==='edge-burst'&&h.motion.stage===1)continue;
  const edge=exitEdge(e,h);if(!edge)continue;h.edgeSeen=true;
  if(s.phase!=='collect'||s.bank.length>=36+e.stage*6)continue;
  const speed=Math.hypot(h.vx,h.vy);if(speed<1)continue;
  s.bank.push({edge,u:clamp((edge==='left'||edge==='right'?h.y/e.fieldH:h.x/e.fieldW)*2,-.92,.92),age:0,warnAge:0,vx:-h.vx,vy:-h.vy,kind:h.kind,visual:h.visual,r:h.r,w:h.w,h:h.h,color:h.color});captured.add(h.id);s.collected++;
 }
 if(captured.size){e.hazards=e.hazards.filter(h=>!captured.has(h.id));e.links=e.links.filter(l=>!captured.has(l.a.id)&&!captured.has(l.b.id));}
}
export function updateRecycle(e:Engine,dt:number){
 if(!e.recycleEnabled||e.phase!=='active')return;const s=e.recycle;s.age+=dt*e.localTime(e.boss);
 for(const b of s.bank){const elapsed=dt*e.localTime(recycleAnchor(e,b));b.age+=elapsed;if(s.phase==='warn')b.warnAge+=elapsed;}
 if(s.phase==='collect'&&(s.age>=RECYCLE_COLLECT_TIME||!e.emitting)){
  if(s.bank.length){s.phase='warn';s.age=0;e.log(`회피탄 회수 · ${s.bank.length}개 · 테두리 역발사 예고`);}else s.age=0;
 }else if(s.phase==='warn'&&s.bank.every(b=>b.warnAge>=RECYCLE_WARN_TIME)){
  for(const b of s.bank){const p=recycleAnchor(e,b,true),speed=clamp(Math.hypot(b.vx,b.vy),140,300+e.stage*25),d=Math.hypot(b.vx,b.vy)||1;
   e.add({...p,kind:b.kind,visual:b.visual??(b.kind==='orb'?'shard':undefined),r:b.r,w:b.w,h:b.h,vx:b.vx/d*speed,vy:b.vy/d*speed,warn:0,life:Math.hypot(e.fieldW,e.fieldH)/speed+2,color:b.color,recycled:true,tag:'재활용된 회피탄'});s.returned++;e.fx(recycleAnchor(e,b),'ring',25,'#ffc075',.3);
  }
  s.waves++;s.bank=[];s.phase='rest';s.age=0;e.log('회수된 탄 일제 역발사 · 돌아온 탄은 재회수하지 않습니다.');
 }else if(s.phase==='rest'&&s.age>=1.15){s.phase='collect';s.age=0;}
}
export function clearRecycleByBomb(e:Engine){
 if(!e.recycleEnabled)return;e.recycle.bank=e.recycle.bank.filter(b=>!bombReaches(e,recycleAnchor(e,b),12));
 if(e.recycle.phase==='warn'&&!e.recycle.bank.length){e.recycle.phase='rest';e.recycle.age=0;}
}
export function drawRecycle(e:Engine,c:CanvasRenderingContext2D){
 if(!e.recycleEnabled||e.phase!=='active')return;const s=e.recycle;
 for(const [i,b] of s.bank.entries()){
  const p=recycleAnchor(e,b),k=s.phase==='warn'?clamp(b.warnAge/RECYCLE_WARN_TIME,0,1):0,n=Math.hypot(b.vx,b.vy)||1,dx=b.vx/n,dy=b.vy/n;
  c.save();c.translate(p.x+Math.sin(b.age*53+i)*2.5*k,p.y+Math.cos(b.age*61+i)*2.5*k);c.rotate(Math.PI/4);const radius=7+Math.min(4,b.r*.2);c.fillStyle=s.phase==='warn'?'#ffd08a':'#a876dc';c.strokeStyle=s.phase==='warn'?'#fff3d7':'#edc4ff';c.shadowColor=s.phase==='warn'?'#ffb755':'#b471ed';c.shadowBlur=12+8*k;c.lineWidth=2;c.fillRect(-radius,-radius,radius*2,radius*2);c.strokeRect(-radius,-radius,radius*2,radius*2);c.fillStyle='#fff5';c.fillRect(-radius+2,-radius+2,radius-1,radius-1);c.restore();
  if(k){c.save();c.translate(p.x,p.y);c.strokeStyle='#ffe8bc';c.lineWidth=3;c.globalAlpha=.35+.6*k;c.beginPath();c.moveTo(dx*17,dy*17);c.lineTo(dx*(24+13*k),dy*(24+13*k));c.stroke();c.beginPath();c.moveTo(dx*36,dy*36);c.lineTo(dx*27-dy*6,dy*27+dx*6);c.moveTo(dx*36,dy*36);c.lineTo(dx*27+dy*6,dy*27-dx*6);c.stroke();c.restore();}
 }
}
export const recyclePattern:Pattern={id:'recycle',name:'회피한 탄 재활용',english:'DODGED BULLET RECLAIM',subtitle:'밖으로 나간 실제 적 탄이 벽에 모입니다. 주황색 결정과 방향 예고 후 한 번 되돌아옵니다.',category:'support',orientation:0,stages:['회피탄 수집','테두리 역발사','48개 회수','54개 역탄막'],duration:30,enter:()=>{},update:()=>{},render:()=>{},exit:()=>{}};
