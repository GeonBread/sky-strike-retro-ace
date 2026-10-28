import { Vec, clamp, distance } from './core';
export type TimeZone=Vec&{w:number;h:number;scale:number;color:string;clock:number};
export function makeTimeZones(w:number,h:number,full:boolean,previous:TimeZone[]=[]):TimeZone[]{
 const rows=full?2:1,colors=['#6495ff','#7bacfb','#7ee0d1','#d0b1ed','#e1a0ef','#ffa576'];
 return Array.from({length:3*rows},(_,i)=>({x:-w/2+(i%3+.5)*w/3,y:-h/2+(Math.floor(i/3)+.5)*h/rows,w:w/3,h:h/rows,scale:full?Number((.5+i*.3).toFixed(1)):[.5,1,2][i],color:colors[i*(full?1:2)],clock:previous[i]?.clock??0}));
}
export function zoneAt(zones:TimeZone[],p:Vec,direction:Vec={x:0,y:0}):TimeZone|undefined{
 if(!zones.length)return;const l=Math.min(...zones.map(z=>z.x-z.w/2)),r=Math.max(...zones.map(z=>z.x+z.w/2)),t=Math.min(...zones.map(z=>z.y-z.h/2)),b=Math.max(...zones.map(z=>z.y+z.h/2));
 const x=clamp(p.x+Math.sign(direction.x)*1e-7,l+1e-7,r-1e-7),y=clamp(p.y+Math.sign(direction.y)*1e-7,t+1e-7,b-1e-7);
 return zones.find(z=>x>=z.x-z.w/2&&x<z.x+z.w/2&&y>=z.y-z.h/2&&y<z.y+z.h/2);
}
export function scaleAt(zones:TimeZone[],p:Vec){return zoneAt(zones,p)?.scale??1;}
/** Integrate time separately on each side of a boundary, without multiplying velocity twice. */
export function timedMotion(zones:TimeZone[],p:Vec,v:Vec,realDt:number):number{
 let rest=realDt,elapsed=0;
 for(let n=0;rest>1e-10&&n<zones.length*3+4;n++){
  const z=zoneAt(zones,p,v),scale=z?.scale??1;let local=rest*scale;
  if(z)for(const axis of ['x','y'] as const){const velocity=v[axis];if(!velocity)continue;const half=(axis==='x'?z.w:z.h)/2,edge=z[axis]+Math.sign(velocity)*half,until=(edge-p[axis])/velocity;if(until>1e-9)local=Math.min(local,until);}
  p.x+=v.x*local;p.y+=v.y*local;elapsed+=local;rest=Math.max(0,rest-local/scale);
 }
 if(rest>1e-10){const local=rest*scaleAt(zones,p);p.x+=v.x*local;p.y+=v.y*local;elapsed+=local;}return elapsed;
}
export type TimedSegment={a:Vec;b:Vec;scale:number};
export function splitTimePath(path:Vec[],zones:TimeZone[]):TimedSegment[]{
 const parts:TimedSegment[]=[];
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,ts=[0,1];
  for(const z of zones){for(const x of [z.x-z.w/2,z.x+z.w/2])if(Math.abs(dx)>1e-9){const t=(x-a.x)/dx;if(t>1e-8&&t<1-1e-8)ts.push(t);}for(const y of [z.y-z.h/2,z.y+z.h/2])if(Math.abs(dy)>1e-9){const t=(y-a.y)/dy;if(t>1e-8&&t<1-1e-8)ts.push(t);}}
  const sorted=[...new Set(ts)].sort((a,b)=>a-b);for(let j=1;j<sorted.length;j++){const lo=sorted[j-1],hi=sorted[j];if(hi-lo<1e-9)continue;const p={x:a.x+dx*lo,y:a.y+dy*lo},q={x:a.x+dx*hi,y:a.y+dy*hi};parts.push({a:p,b:q,scale:scaleAt(zones,{x:(p.x+q.x)/2,y:(p.y+q.y)/2})});}
 }return parts;
}
export function pathTimeCost(path:Vec[],zones:TimeZone[]):number{return splitTimePath(path,zones).reduce((sum,p)=>sum+distance(p.a,p.b)/p.scale,0);}
export function pathDistanceForTime(path:Vec[],budget:number,zones:TimeZone[]):number{
 let traveled=0;for(const p of splitTimePath(path,zones)){const len=distance(p.a,p.b),cost=len/p.scale;if(budget<cost)return traveled+Math.max(0,budget)*p.scale;traveled+=len;budget-=cost;}return traveled;
}
export function timedRay(origin:Vec,angle:number,budget:number,zones:TimeZone[]):Vec{
 const max=Math.max(1,...zones.map(z=>z.scale)),end={x:origin.x+Math.cos(angle)*budget*max,y:origin.y+Math.sin(angle)*budget*max},r=pathDistanceForTime([origin,end],budget,zones);return {x:origin.x+Math.cos(angle)*r,y:origin.y+Math.sin(angle)*r};
}
