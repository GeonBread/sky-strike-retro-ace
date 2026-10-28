import type { Engine } from './engine';
import { clamp, smooth, distance, Vec, PLAYER_HIT_RADIUS } from './core';
import { drawHpBar, HP_BAR_WIDTH, HP_BAR_HEIGHT } from './hpBar';
export type SwordPose=Vec&{angle:number};
export type Sword={a:Vec;b:Vec;angle:number;age:number;cycle:number;anchor:Vec;pose:SwordPose;from:SwordPose;state:'spawn'|'travel'|'warn'|'attack'|'recover'|'home';time:number;kind:number;preview:SwordPose[];trail:(SwordPose&{age:number})[]};
export function freshSword():Sword{
 const pose={x:0,y:-418,angle:0};return {a:{x:-283,y:-418},b:{x:283,y:-418},angle:0,age:0,cycle:-1,anchor:{x:0,y:0},pose,from:{...pose},state:'spawn',time:0,kind:0,preview:[],trail:[]};
}
/** Six continuous paths. The warning and collision both sample these same poses. */
export function swordPose(s:Sword,k:number):SwordPose{
 const p=s.anchor,u=smooth(clamp(k,0,1));
 switch(s.kind){
  case 0:return {x:p.x-205+410*u,y:p.y-125+240*u,angle:-.5+.85*u};
  case 1:return {x:p.x+Math.sin(u*Math.PI)*65,y:p.y-250+500*u,angle:-1.3-.48*u};
  case 2:{const a=-2.35+3.3*u;return {x:p.x+Math.cos(a)*110,y:p.y+Math.sin(a)*110,angle:a+.5};}
  case 3:return {x:p.x-170+340*u,y:p.y-200+400*u,angle:Math.PI/4};
  case 4:{const a=-Math.PI/2+Math.PI*2*u;return {x:p.x+Math.cos(a)*65,y:p.y+Math.sin(a)*65,angle:a};}
  default:return {x:p.x-210+420*u,y:p.y+Math.sin(u*Math.PI*2)*110,angle:Math.sin(u*Math.PI*2)*.6-.15};
 }
}
export function swordContains(p:Vec,pose:SwordPose,r=PLAYER_HIT_RADIUS):boolean{
 const dx=p.x-pose.x,dy=p.y-pose.y,c=Math.cos(pose.angle),s=Math.sin(pose.angle),x=dx*c+dy*s,y=-dx*s+dy*c;
 // Includes the black 5-pixel frame, independent of the remaining HP fill.
 return Math.abs(x)<=HP_BAR_WIDTH/2+2.5+r&&Math.abs(y)<=HP_BAR_HEIGHT/2+2.5+r;
}
export function swordCorners(p:SwordPose,margin=0):Vec[]{
 const w=HP_BAR_WIDTH/2+2.5+margin,h=HP_BAR_HEIGHT/2+2.5+margin,c=Math.cos(p.angle),s=Math.sin(p.angle);
 return [[-w,-h],[w,-h],[w,h],[-w,h]].map(([x,y])=>({x:p.x+x*c-y*s,y:p.y+x*s+y*c}));
}
function prepare(e:Engine){
 const s=e.advanced.sword;s.cycle++;s.kind=s.cycle%6;s.from={...s.pose};const p=e.localPlayer();
 s.anchor={x:clamp(p.x,-e.fieldW*.18,e.fieldW*.18),y:clamp(p.y,-e.fieldH/2+260,e.fieldH/2-240)};
 s.preview=Array.from({length:361},(_,i)=>swordPose(s,i/360));s.state='travel';s.time=0;
 e.log(`HP바 검술 · ${['횡베기','종베기','원호 베기','대각 찌르기','회전 베기','S자 연속 베기'][s.kind]} · 전체 범위 예고`);
}
export function updateSword(e:Engine,dt:number){
 const s=e.advanced.sword;s.age+=dt;s.time+=dt;const previous={...s.pose};
 for(const t of s.trail)t.age+=dt;s.trail=s.trail.filter(t=>t.age<.24);
 if(s.state==='spawn'){
  s.pose={x:0,y:-e.fieldH/2+62+115*smooth(s.time/1.1),angle:-.12*smooth(s.time/1.1)};
  if(s.time>=1.1)prepare(e);
 }else if(s.state==='travel'){
  const to=swordPose(s,0),u=smooth(s.time/.9);let da=to.angle-s.from.angle;while(da>Math.PI)da-=Math.PI*2;while(da< -Math.PI)da+=Math.PI*2;
  s.pose={x:s.from.x+(to.x-s.from.x)*u,y:s.from.y+(to.y-s.from.y)*u,angle:s.from.angle+da*u};
  if(s.time>=.9){s.pose=to;s.state='warn';s.time=0;}
 }else if(s.state==='warn'){
  if(s.time>=.85-e.stage*.06){s.state='attack';s.time=0;}
 }else if(s.state==='attack'){
  const duration=s.kind===4?1:.72-e.stage*.045,k=clamp(s.time/duration,0,1);s.pose=swordPose(s,k);
  // Swept poses cover the actual movement even at a low frame rate.
  const delta=Math.abs(s.pose.angle-previous.angle),count=Math.max(1,Math.ceil((distance(s.pose,previous)+delta*285)/3));
  for(const body of e.bodies())for(let i=0;i<=count;i++){const u=i/count,pose={x:previous.x+(s.pose.x-previous.x)*u,y:previous.y+(s.pose.y-previous.y)*u,angle:previous.angle+(s.pose.angle-previous.angle)*u};if(swordContains(e.local(body),pose)){e.hit('디그리온 HP 검술',body);break;}}
  s.trail.push({...s.pose,age:0});e.shake=Math.max(e.shake,.025);
  if(k>=1){s.state='recover';s.time=0;}
 }else if(s.state==='home'){
  const k=smooth(s.time/.9);let da=-s.from.angle;while(da>Math.PI)da-=Math.PI*2;while(da< -Math.PI)da+=Math.PI*2;
  s.pose={x:s.from.x*(1-k),y:s.from.y+(-418-s.from.y)*k,angle:s.from.angle+da*k};
 }else if(s.time>=.28){if(e.emitting)prepare(e);else{s.state='home';s.from={...s.pose};s.time=0;}}

 s.angle=s.pose.angle;s.a={x:s.pose.x-Math.cos(s.angle)*283,y:s.pose.y-Math.sin(s.angle)*283};s.b={x:s.pose.x+Math.cos(s.angle)*283,y:s.pose.y+Math.sin(s.angle)*283};
}
export function drawSword(e:Engine,c:CanvasRenderingContext2D){
 const s=e.advanced.sword;
 if(s.state==='travel'||s.state==='warn'){
  c.save();c.fillStyle=s.state==='warn'?'#d894ff48':'#d894ff2b';c.beginPath();
  // One compound fill covers every occupied rectangle, without overlap darkening.
  for(const pose of s.preview){const pts=swordCorners(pose,PLAYER_HIT_RADIUS+3);c.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.closePath();}c.fill();
  c.strokeStyle='#e5b6ff';c.lineWidth=1.8;c.globalAlpha=.6;c.setLineDash([8,6]);
  for(const pose of [s.preview[0],s.preview.at(-1)!]){const pts=swordCorners(pose,PLAYER_HIT_RADIUS+3);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();}
  c.setLineDash([]);c.strokeStyle='#efc7ff88';c.lineWidth=2;c.beginPath();s.preview.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.restore();
 }
 c.save();for(const t of s.trail){c.globalAlpha=(1-t.age/.24)*.22;c.fillStyle='#ddacff';const pts=swordCorners(t);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();}c.restore();
 c.save();c.translate(s.pose.x,s.pose.y);c.rotate(s.pose.angle);drawHpBar(c,e.bossHp/e.bossHpMax,e.encounter.enabled?e.encounter.phase-1:e.stage);c.restore();
}
