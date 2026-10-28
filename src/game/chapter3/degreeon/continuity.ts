import type {Engine} from './engine';
import {phaseOneScore,phaseTwoScore} from './encounter';
import {clamp,smooth,BASE_FIELD_H} from './core';
import type {Vec} from './core';

type Bridge={age:number;duration:number;from:{w:number;h:number;angle:number};to:{w:number;h:number;angle:number};playerFrom:Vec;playerTo:Vec|null};
export type Continuity={closing:boolean;age:number;settledAge:number;bridge:Bridge|null;cutAge:number;cutFrom:Vec[]|null};
export const freshContinuity=():Continuity=>({closing:false,age:0,settledAge:0,bridge:null,cutAge:0,cutFrom:null});
export const supportFade=(e:Engine)=>e.encounter.enabled&&e.continuity.closing?1-smooth(e.continuity.age/.7):1;
export function nextEncounterId(e:Engine){const score=e.encounter.phase===1?phaseOneScore:phaseTwoScore;return score[e.encounter.trainingOnly||e.encounter.learning.step<e.encounter.learning.stages.length-1?e.encounter.cue:(e.encounter.cue+1)%score.length].id;}
const exclusive=new Set(['exile','pause-storm','menu-deception','menu-deception-mobs','flight','rhythm']);
export const playerFireAllowed=(e:Engine)=>!e.encounter.enabled||!(e.continuity.closing&&exclusive.has(nextEncounterId(e))||e.continuity.bridge&&exclusive.has(e.pattern.id));
export function requestHandoff(e:Engine){if(!e.continuity.closing){e.continuity.closing=true;e.continuity.age=0;e.log('마지막 공격 마무리 · 발사된 탄과 동작 유지');}}
/** A deadline closes the emitter. It never cancels an advertised attack. */
export function attackSettled(e:Engine){
 switch(e.pattern.id){
  case 'mirror':return e.lasers.length===0;
  case 'lightning':return !e.advanced.lightSecond&&e.advanced.bolts.length===0;
  case 'corridor-vertical':case 'corridor-horizontal':return e.corridor.fired===e.corridor.total&&e.corridor.beams.length===0;
  case 'tail-shed':return e.extraNormal.chains.every(c=>c.detached&&c.released===c.tails.length);
  case 'graduation-stamp':return e.graduationStamp.phase==='rest'&&!e.graduationStamp.lingering.length&&!e.graduationStamp.imprints.length;
  case 'link':return !e.hazards.some(h=>h.group!==undefined);
  case 'hp-sword':return e.advanced.sword.state==='home'&&e.advanced.sword.time>=.9;
  case 'split8':return e.tileState==='recover'||e.tileState==='idle';
  case 'tile-stream':return !e.tileStream.batches.length;
  case 'path-fold':return e.pathFold.phase==='rest'&&e.pathFold.age>=.5;
  case 'outside-hands':return !e.unseen.hands.hands.length;
  case 'exile':return e.advanced.exile.state==='done';
  case 'pause-storm':return e.pauseStorm.phase==='done';
  case 'menu-deception':return e.menuDeception.phase==='drain'&&!e.menuDeception.projectiles.length;
  case 'menu-deception-mobs':return e.menuDeception.spawned===20&&e.menuDeception.spawns.every(s=>s.done)&&(e.menuDeception.wave?.count??0)===0&&(e.menuDeception.wave?.bulletCount??0)===0;
  case 'fluid':return e.fluidFill<.005;
  case 'flight':case 'rhythm':return !e.hazards.length;
  case 'graduation-gate':return e.unseen.gate.phase==='expose'&&e.unseen.gate.phaseAge>=3.4||e.unseen.gate.phase==='locks'&&e.unseen.gate.age>=29;
  default:return !e.volley.events.length;
 }
}
function rayPoint(poly:Vec[],a:number):Vec{const d={x:Math.cos(a),y:Math.sin(a)},origin={x:poly.reduce((n,p)=>n+p.x,0)/poly.length,y:poly.reduce((n,p)=>n+p.y,0)/poly.length};let length=Infinity;
 for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],x=q.x-p.x,y=q.y-p.y,den=d.x*y-d.y*x;if(Math.abs(den)<1e-8)continue;const px=p.x-origin.x,py=p.y-origin.y,t=(px*y-py*x)/den,u=(px*d.y-py*d.x)/den;if(t>=0&&u>=0&&u<=1)length=Math.min(length,t);}
 return{x:origin.x+d.x*(Number.isFinite(length)?length:0),y:origin.y+d.y*(Number.isFinite(length)?length:0)};
}
export function tickHandoff(e:Engine,dt:number){
 const f=e.continuity;if(!e.encounter.enabled||!f.closing||e.phase!=='active')return;f.age+=dt;
 for(const z of e.advanced.zones)z.scale=1+(z.scale-1)*Math.exp(-7*dt);
 // Rejoin a cut arena before the next rule takes ownership of its boundary.
 if(e.cutEnabled&&!e.cutTelegraph&&e.cutPolygon.length>=3){
  if(!f.cutFrom)f.cutFrom=Array.from({length:64},(_,i)=>rayPoint(e.cutPolygon,i*Math.PI*2/64));
  f.cutAge+=dt;const k=smooth(f.cutAge/1.1),rect=[{x:-e.fieldW/2,y:-e.fieldH/2},{x:e.fieldW/2,y:-e.fieldH/2},{x:e.fieldW/2,y:e.fieldH/2},{x:-e.fieldW/2,y:e.fieldH/2}];
  e.cutPolygon=f.cutFrom.map((p,i)=>{const q=rayPoint(rect,i*Math.PI*2/64);return{x:p.x+(q.x-p.x)*k,y:p.y+(q.y-p.y)*k};});
 }
 if(!attackSettled(e)){f.settledAge=0;return;}f.settledAge+=dt;
 if(['inspection','graduation-gate','split8','path-fold','outside-hands'].includes(e.pattern.id)&&f.settledAge<.5)return;
 if(e.rotation>0||e.fieldWarpEnabled&&e.fieldWarp.mode!=='hold'||e.cutTelegraph||e.cutEnabled&&f.cutAge<1.1||e.recycle.bank.length)return;
 if(['portals','magnet','time'].some(id=>e.selectedSupports.has(id))&&f.age<.7)return;
 // These modes take control of the avatar/canvas. Let all previous physical
 // objects leave first, so none can disappear behind an exclusive scene.
 if((exclusive.has(nextEncounterId(e))||e.pendingBombard)&&(e.hazards.length||e.advanced.walls.length||e.enemies.length||exclusive.has(nextEncounterId(e))&&e.shots.length))return;
 if(e.pattern.id==='pause-storm'||e.pattern.id.startsWith('menu-deception')){e.completeNativeReturn();return;}
 if(e.pendingBombard)e.startBombard();else e.advance();
}
export function beginBridge(e:Engine,from:Bridge['from'],to:Bridge['to'],playerFrom:Vec){
 let da=to.angle-from.angle;while(da>Math.PI)da-=Math.PI*2;while(da< -Math.PI)da+=Math.PI*2;to.angle=from.angle+da;
 const lane=e.pattern.id==='rhythm'?{x:0,y:to.h/2-100}:e.pattern.id==='flight'?{x:0,y:to.h/6}:e.pattern.id==='pause-storm'?{x:0,y:0}:null;
 const changed=Math.abs(from.w-to.w)+Math.abs(from.h-to.h)>1||Math.abs(da)>.01||lane!==null;
 e.angle=e.fromAngle=e.targetAngle=from.angle;e.rotation=0;e.rotationLive=false;e.fieldW=from.w;e.fieldH=from.h;e.player=e.screen(playerFrom);
 if(changed){e.continuity.bridge={age:0,duration:1.2,from,to,playerFrom:{...playerFrom},playerTo:lane};e.phase='intro';e.phaseTime=0;}
 else{e.continuity.bridge=null;e.phase='active';e.phaseTime=0;}
}
export function tickBridge(e:Engine,dt:number){
 const b=e.continuity.bridge;if(!b)return;const p=e.localPlayer();b.age+=dt;const k=smooth(b.age/b.duration);
 e.fieldW=b.from.w+(b.to.w-b.from.w)*k;e.fieldH=b.from.h+(b.to.h-b.from.h)*k;e.angle=b.from.angle+(b.to.angle-b.from.angle)*k;
 if(b.playerTo){p.x=b.playerFrom.x+(b.playerTo.x-b.playerFrom.x)*k;p.y=b.playerFrom.y+(b.playerTo.y-b.playerFrom.y)*k;}
 else{p.x=clamp(p.x,-e.fieldW/2+15,e.fieldW/2-15);p.y=clamp(p.y,-e.fieldH/2+15,e.fieldH/2-15);}
 e.player=e.screen(p);e.orientation=(Math.round(e.angle/(Math.PI/2))%4+4)%4;
 if(b.age>=b.duration){e.continuity.bridge=null;e.targetAngle=e.fromAngle=e.angle;e.phase='active';e.phaseTime=0;}
}
export function bossTarget(e:Engine){return{x:Math.sin(e.bossAnimClock*.65)*65,y:e.pattern.id==='fluid'?-230:['split8','tile-stream','pause-storm'].includes(e.pattern.id)?-e.fieldH/2+140:e.fieldWarpEnabled?-e.fieldH/2+Math.min(145,e.fieldH*.24):-BASE_FIELD_H/2+180};}
export function tickBossPresence(e:Engine,dt:number){
 const hidden=e.pattern.id==='outside-hands'&&!e.continuity.closing||e.pattern.id==='graduation-gate'&&e.unseen.gate.phase!=='expose'&&!e.continuity.closing;
 e.bossVisibility+=(Number(!hidden)-e.bossVisibility)*(1-Math.exp(-5*dt));
 const size=(e.pattern.id==='split8'?138:268)*(e.bossForm===2?1.12:1);e.bossVisualSize+=(size-e.bossVisualSize)*(1-Math.exp(-5*dt));
}
