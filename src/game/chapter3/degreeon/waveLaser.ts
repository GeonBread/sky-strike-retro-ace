import type {Engine} from './engine';
import type {Pattern,Vec} from './core';
import {clamp,PLAYER_HIT_RADIUS} from './core';
import {splitTimePath} from './time';

export type WaveBeam={u:number;age:number;warn:number;life:number;lanes:number;axis?:'vertical'|'horizontal';parts?:{lo:number;hi:number;age:number}[]};
export type CorridorState={clock:number;fired:number;total:number;beams:WaveBeam[];rest:number;};
export const freshCorridor=():CorridorState=>({clock:0,fired:0,total:5,beams:[],rest:0});
export function waveBeamBounds(e:Engine,b:WaveBeam){
 return b.axis==='horizontal'?{x:0,y:(b.u-.5)*e.fieldH,w:e.fieldW,h:e.fieldH/b.lanes*.63}:{x:(b.u-.5)*e.fieldW,y:0,w:e.fieldW/b.lanes*.63,h:e.fieldH};
}
export function waveBeamPath(e:Engine,b:WaveBeam):[Vec,Vec]{const r=waveBeamBounds(e,b);return b.axis==='horizontal'?[{x:-e.fieldW/2,y:r.y},{x:e.fieldW/2,y:r.y}]:[{x:r.x,y:-e.fieldH/2},{x:r.x,y:e.fieldH/2}];}
function tickBeam(e:Engine,b:WaveBeam,dt:number){
 const [a,z]=waveBeamPath(e,b),horizontal=b.axis==='horizontal',span=horizontal?e.fieldW:e.fieldH,old=b.parts??[{lo:0,hi:1,age:b.age}];
 b.parts=splitTimePath([a,z],e.advanced.zones).map(s=>{
  const lo=((horizontal?s.a.x:s.a.y)+(horizontal?e.fieldW:e.fieldH)/2)/span,hi=((horizontal?s.b.x:s.b.y)+span/2)/span,mid=(lo+hi)/2;
  const prior=old.find(p=>mid>=p.lo-1e-7&&mid<=p.hi+1e-7)??old[0];
  return {lo,hi,age:prior.age+dt*s.scale};
 });b.age+=dt*e.localTime(waveBeamBounds(e,b));
}
export function waveBeamHits(e:Engine,b:WaveBeam,p:Vec){
 const r=waveBeamBounds(e,b),horizontal=b.axis==='horizontal';
 if(Math.abs(p.x-r.x)>r.w/2+PLAYER_HIT_RADIUS||Math.abs(p.y-r.y)>r.h/2+PLAYER_HIT_RADIUS)return false;
 const along=((horizontal?p.x:p.y)+(horizontal?e.fieldW:e.fieldH)/2)/(horizontal?e.fieldW:e.fieldH);
 return (b.parts??[{lo:0,hi:1,age:b.age}]).some(s=>along>=s.lo&&along<=s.hi&&s.age>=b.warn&&s.age<b.warn+b.life);
}
/** Flowing plasma edges stay inside the full-width advertised hit envelope. */
export function laserEdgeWidth(half:number,position:number,age:number){return half*(.84+.075*Math.sin(position*.035-age*15)+.035*Math.sin(position*.083+age*11));}
export function drawWaveBeam(e:Engine,c:CanvasRenderingContext2D,b:WaveBeam){
 const r=waveBeamBounds(e,b),horizontal=b.axis==='horizontal',length=horizontal?r.w:r.h,half=(horizontal?r.h:r.w)/2;
 c.save();c.translate(horizontal?-e.fieldW/2:r.x,horizontal?r.y:-e.fieldH/2);if(horizontal)c.rotate(-Math.PI/2);
 for(const part of b.parts??[{lo:0,hi:1,age:b.age}]){
  const age=part.age;if(age>=b.warn+b.life)continue;const lo=length*part.lo,hi=length*part.hi;
  c.save();c.beginPath();c.rect(-half-32,lo,half*2+64,hi-lo+.5);c.clip();
  if(age<b.warn){
   const k=clamp(age/b.warn,0,1);c.globalAlpha=.11+k*.15;c.fillStyle='#b076ff';c.fillRect(-half,lo,half*2,hi-lo);
   c.globalAlpha=.35+k*.4;c.strokeStyle='#cfb7ff';c.lineWidth=1.8;c.setLineDash([16,9]);
   for(const side of [-1,1]){c.beginPath();c.moveTo(side*half,lo);c.lineTo(side*half,hi);c.stroke();}c.setLineDash([]);
   c.fillStyle='#edd7ff';for(let y=lo+((age*65)%46);y<hi;y+=46)for(const side of [-1,1]){c.beginPath();c.moveTo(side*half,y);c.lineTo(side*(half-8),y+6);c.lineTo(side*half,y+12);c.fill();}
  }else{
   const t=age-b.warn,fade=Math.min(1,t/.055,(b.life-t)/.11),steps=Math.max(12,Math.ceil(length/16));c.globalAlpha=Math.max(.05,fade);
   const ribbon=(scale:number)=>{c.beginPath();for(let i=0;i<=steps;i++){const y=length*i/steps,w=laserEdgeWidth(half,y,age)*scale;i?c.lineTo(w,y):c.moveTo(w,y);}for(let i=steps;i>=0;i--){const y=length*i/steps;c.lineTo(-laserEdgeWidth(half,y,age)*scale,y);}c.closePath();};
   const aura=c.createLinearGradient(-half*1.45,0,half*1.45,0);aura.addColorStop(0,'#823fff00');aura.addColorStop(.3,'#983cff44');aura.addColorStop(.5,'#f08dff88');aura.addColorStop(.7,'#983cff44');aura.addColorStop(1,'#823fff00');
   c.fillStyle=aura;c.shadowColor='#c965ff';c.shadowBlur=26;ribbon(1.42);c.fill();c.shadowBlur=0;
   const shell=c.createLinearGradient(-half,0,half,0);shell.addColorStop(0,'#451488');shell.addColorStop(.13,'#a34af5');shell.addColorStop(.36,'#ffb7ff');shell.addColorStop(.5,'#fffde9');shell.addColorStop(.64,'#ffb7ff');shell.addColorStop(.87,'#a34af5');shell.addColorStop(1,'#451488');
   c.fillStyle=shell;ribbon(1);c.fill();c.strokeStyle='#f6c4ff';c.lineWidth=1.5;c.stroke();
   c.fillStyle='#fff5eb';c.shadowColor='#ffefff';c.shadowBlur=11;ribbon(.24);c.fill();c.shadowBlur=0;
   c.strokeStyle='#ffdfff';c.lineWidth=1.2;c.globalAlpha*=.55;
   for(const phase of [0,Math.PI]){c.beginPath();for(let i=0;i<=steps;i++){const y=length*i/steps,x=Math.sin(y*.04-age*24+phase)*half*.5;i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}
   c.globalAlpha=fade*.65;c.fillStyle='#fff0dd';for(let i=0;i<12;i++){const y=((i*length/12+age*510)%length);const x=Math.sin(i*2.3+age*2)*half*.58;c.beginPath();c.ellipse(x,y,1.8,5,0,0,Math.PI*2);c.fill();}
  }c.restore();
 }
 const active=(b.parts??[{age:b.age}]).some(p=>p.age>=b.warn&&p.age<b.warn+b.life);
 if(active){c.fillStyle='#ffebff';c.shadowColor='#d366ff';c.shadowBlur=18;for(const y of [10,length-10]){c.beginPath();c.ellipse(0,y,half*.66,7,0,0,Math.PI*2);c.fill();}}
 c.restore();
}
const gaps=[3,1,3,5,4,2,4,3];
function makeCorridor(axis:'vertical'|'horizontal'):Pattern{return{
 id:'corridor-'+axis,name:`파동 레이저 · ${axis==='vertical'?'세로':'가로'}`,english:axis==='vertical'?'VERTICAL PLASMA CORRIDOR':'HORIZONTAL PLASMA CORRIDOR',category:'normal',orientation:0,duration:Infinity,
 subtitle:`${axis==='vertical'?'세로':'가로'} 레이저만 5~8회 연속 발사됩니다. 전체 타격 범위 예고를 보고 피하세요.`,stages:[5,6,7,8].map(n=>`${axis==='vertical'?'세로':'가로'} 레이저 · ${n}회`),
 enter:e=>{e.corridor={...freshCorridor(),total:5+e.stage};},exit:e=>{e.corridor=freshCorridor();},
 update:(e,dt)=>{
  const s=e.corridor;s.clock+=dt*e.localTime(e.boss);
  for(const b of s.beams)tickBeam(e,b,dt);s.beams=s.beams.filter(b=>(b.parts??[{age:b.age}]).some(p=>p.age<b.warn+b.life));
  const period=e.stage===3?1.22:1.35;
  if(s.fired<s.total&&s.clock>=.2+s.fired*period){
   const gap=gaps[s.fired%gaps.length];
   for(let i=0;i<7;i++)if(i!==gap)s.beams.push({u:(i+.5)/7,lanes:7,axis,age:0,warn:e.stage===3?.74:.88,life:.42});
   s.fired++;e.log(`파동 회랑 · ${s.fired}/${s.total} · ${axis==='vertical'?'세로':'가로'}`);
  }
  for(const body of e.bodies())if(s.beams.some(b=>waveBeamHits(e,b,e.local(body))))e.hit('파동 레이저 회랑',body);
  if(s.fired===s.total&&!s.beams.length){s.rest+=dt;if(s.rest>=.8){if(e.pattern.category==='normal')e.finish();else e.corridor={...freshCorridor(),total:5+e.stage};}}
 },render:(e,c)=>{for(const b of e.corridor.beams)drawWaveBeam(e,c,b);}
};}
export const corridorPatterns:Pattern[]=[makeCorridor('vertical'),makeCorridor('horizontal')];
