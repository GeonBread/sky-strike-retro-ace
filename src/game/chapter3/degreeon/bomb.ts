import type { Engine } from './engine';
import { Vec, CANVAS_W, CANVAS_H, SMART_BOMB_INNER_SCALE, SMART_BOMB_EDGE_MARGIN, clamp, distance } from './core';
import { pathTimeCost, timedRay } from './time';
export type BombView=Vec&{w:number;h:number};
/** The actual visible rectangle in the same world coordinates as the wave. */
export function bombView(e:Engine):BombView{
 if(e.pattern.id==='exile'&&e.phase==='active'&&e.advanced.exile.detached){const x=e.advanced.exile,size=e.gridSize();return {x:x.camera.x,y:x.camera.y,w:size.w,h:size.h};}
 return {x:0,y:0,w:Math.max(CANVAS_W,e.fieldW),h:Math.max(CANVAS_H,e.fieldH)};
}
export function bombExitRadius(e:Engine):number{
 const v=bombView(e),p=e.smartBombWorldOrigin;let farthest=0;
 const zones=e.phase==='active'?e.advanced.zones:[];
 if(zones.length){for(let i=0;i<=24;i++){const f=i/24;for(const side of [-1,1])for(const q of [{x:v.x+side*v.w/2,y:v.y-v.h/2+v.h*f},{x:v.x-v.w/2+v.w*f,y:v.y+side*v.h/2}])farthest=Math.max(farthest,pathTimeCost([p,q],zones));}}
 else for(const x of [-1,1])for(const y of [-1,1])farthest=Math.max(farthest,distance(p,{x:v.x+x*v.w/2,y:v.y+y*v.h/2}));
 // Even the innermost visible ring and its glow must leave the farthest corner.
 return (farthest+SMART_BOMB_EDGE_MARGIN/Math.min(1,...zones.map(z=>z.scale)))/SMART_BOMB_INNER_SCALE;
}
export function bombReaches(e:Engine,q:Vec,r=0):boolean{const p=e.smartBombWorldOrigin,d=distance(p,q),k=d?Math.max(0,d-r)/d:0,end={x:p.x+(q.x-p.x)*k,y:p.y+(q.y-p.y)*k};return pathTimeCost([p,end],e.phase==='active'?e.advanced.zones:[])<=e.smartBombRadius;}
/** Shared field/fullscreen rendering. Radius never freezes or fades halfway across. */
export function drawBombEffects(e:Engine,c:CanvasRenderingContext2D){
 for(const p of e.bombParticles){const k=clamp(1-p.age/p.life,0,1);c.save();c.globalAlpha=k;c.fillStyle=p.color;c.shadowColor=p.color;c.shadowBlur=12;c.beginPath();c.arc(p.x,p.y,p.size*(.45+.55*k),0,Math.PI*2);c.fill();c.restore();}
 if(!e.smartBombActive)return;
 const v=bombView(e),p=e.smartBombWorldOrigin,r=e.smartBombRadius,k=clamp(1-r/e.smartBombLimit,0,1);
 if(e.phase==='active'&&e.advanced.zones.length){
  const path=(scale:number)=>{c.beginPath();for(let i=0;i<=128;i++){const q=timedRay(p,i*Math.PI*2/128,r*scale,e.advanced.zones);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);}c.closePath();};
  c.save();c.strokeStyle='#ffdb5430';c.lineWidth=45;c.shadowBlur=22;c.shadowColor='#ffdb54';path(1);c.stroke();c.strokeStyle='#ffec76cc';c.lineWidth=12;path(1);c.stroke();c.strokeStyle='#ffffdce0';c.lineWidth=5;path(SMART_BOMB_INNER_SCALE);c.stroke();c.restore();return;
 }
 c.save();const glow=c.createRadialGradient(p.x,p.y,Math.max(1,r*.62),p.x,p.y,Math.max(2,r*1.08));glow.addColorStop(0,'rgba(255,255,255,0)');glow.addColorStop(.72,`rgba(255,246,184,${.05+.03*k})`);glow.addColorStop(.9,`rgba(255,218,74,${.10+.05*k})`);glow.addColorStop(1,'rgba(255,205,71,0)');c.fillStyle=glow;c.fillRect(v.x-v.w/2,v.y-v.h/2,v.w,v.h);
 c.strokeStyle=`rgba(255,236,118,${.4+.4*k})`;c.shadowColor='#ffdc54';c.shadowBlur=24;c.lineWidth=10+8*k;c.beginPath();c.arc(p.x,p.y,Math.max(.1,r),0,Math.PI*2);c.stroke();
 c.strokeStyle=`rgba(255,255,220,${.5+.45*k})`;c.shadowBlur=10;c.lineWidth=4+4*k;c.beginPath();c.arc(p.x,p.y,Math.max(.1,r*SMART_BOMB_INNER_SCALE),0,Math.PI*2);c.stroke();c.restore();
}
