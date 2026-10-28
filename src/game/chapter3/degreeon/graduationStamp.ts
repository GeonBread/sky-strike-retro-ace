import type {Engine} from './engine';
import type {Pattern,Vec} from './core';
import {clamp,smooth,circleRect,segmentDistance,PLAYER_HIT_RADIUS,distance} from './core';
import {bombReaches} from './bomb';
export type InkTemplate={x:number;y:number;angle:number;length:number;ring:number;thickness:number;};
export type StampStroke=InkTemplate&{vx:number;vy:number;spin:number;delay:number;age:number;cleared:boolean;};
export type StampImprint={age:number;target:Vec;angle:number;w:number;h:number;strokes:StampStroke[]};
export type GraduationStampState={phase:'warn'|'press'|'ink'|'scatter'|'rest';age:number;ready:boolean;round:number;limit:number;target:Vec;angle:number;w:number;h:number;impacted:boolean;impactShake:number;strokes:StampStroke[];lingering:StampStroke[];released:number;quick:boolean;warnDuration:number;imprints:StampImprint[];};
export const freshGraduationStamp=():GraduationStampState=>({phase:'warn',age:0,ready:false,round:0,limit:3,target:{x:0,y:120},angle:0,w:390,h:146,impacted:false,impactShake:0,strokes:[],lingering:[],released:0,quick:false,warnDuration:1.1,imprints:[]});
const rotate=(p:Vec,a:number):Vec=>({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)});
/** Every visible Hangul stroke becomes that exact same independent projectile. */
export function graduationInk():InkTemplate[]{
 const out:InkTemplate[]=[];
 const line=(cx:number,a:number[],b:number[])=>{const ax=cx+a[0]*72,ay=a[1]*86,bx=cx+b[0]*72,by=b[1]*86;out.push({x:(ax+bx)/2,y:(ay+by)/2,angle:Math.atan2(by-ay,bx-ax),length:Math.hypot(bx-ax,by-ay),ring:0,thickness:9});};
 const poly=(cx:number,p:number[][])=>{for(let i=1;i<p.length;i++)line(cx,p[i-1],p[i]);};
 const rieul=(cx:number)=>poly(cx,[[-.28,.14],[.27,.14],[.27,.27],[-.27,.27],[-.27,.42],[.28,.42]]);
 // 졸: ㅈ + ㅗ + ㄹ.
 line(-129,[-.30,-.38],[.30,-.38]);line(-129,[.22,-.38],[-.29,-.13]);line(-129,[.01,-.26],[.30,-.13]);line(-129,[0,-.15],[0,.02]);line(-129,[-.31,.02],[.31,.02]);rieul(-129);
 // 업: ㅇ + ㅓ + ㅂ.
 out.push({x:-52-10,y:-21,angle:0,length:0,ring:12,thickness:9});line(-52,[.28,-.40],[.28,-.01]);line(-52,[.06,-.22],[.28,-.22]);line(-52,[-.28,.10],[-.28,.43]);line(-52,[.28,.10],[.28,.43]);line(-52,[-.28,.27],[.28,.27]);line(-52,[-.28,.43],[.28,.43]);
 // 불: ㅂ + ㅜ + ㄹ.
 line(52,[-.26,-.40],[-.26,-.12]);line(52,[.26,-.40],[.26,-.12]);line(52,[-.26,-.25],[.26,-.25]);line(52,[-.26,-.12],[.26,-.12]);line(52,[-.31,.02],[.31,.02]);line(52,[0,.02],[0,.14]);rieul(52);
 // 가: ㄱ + ㅏ.
 poly(129,[[-.32,-.29],[.02,-.29],[.02,.29]]);line(129,[.27,-.40],[.27,.40]);line(129,[.27,-.03],[.44,-.03]);
 return out;
}
export function stampFootprintHits(e:Engine,p:Vec){const s=e.graduationStamp,q=rotate({x:p.x-s.target.x,y:p.y-s.target.y},-s.angle);return circleRect(q,PLAYER_HIT_RADIUS,{x:0,y:0,w:s.w,h:s.h});}
export function stampStrokeHits(f:StampStroke,p:Vec){
 if(f.cleared||f.age<0||f.age>3.2)return false;
 if(f.ring)return Math.abs(distance(f,p)-f.ring)<f.thickness/2+PLAYER_HIT_RADIUS;
 const dx=Math.cos(f.angle)*f.length/2,dy=Math.sin(f.angle)*f.length/2;return segmentDistance(p,{x:f.x-dx,y:f.y-dy},{x:f.x+dx,y:f.y+dy})<f.thickness/2+PLAYER_HIT_RADIUS;
}
export function stampRapidAllowed(e:Engine){
 const v=e.gridSize(),full=e.fieldWarpEnabled?e.fieldWarp.mode==='hold'&&e.fieldWarp.current==='full':e.fullField;
 return full&&e.fieldW*e.fieldH>=v.w*v.h*.94&&e.graduationStamp.lingering.length+e.graduationStamp.imprints.reduce((n,m)=>n+m.strokes.length,0)<240;
}
function prepare(e:Engine){
 const s=e.graduationStamp;s.ready=true;s.age=0;s.phase='warn';s.quick=stampRapidAllowed(e);s.warnDuration=s.quick?.48-e.stage*.03:1.1-e.stage*.08;s.impacted=false;s.impactShake=0;s.released=0;s.w=390+e.stage*12;s.angle=[-.10,.12,0,-.16][s.round%4];
 const p=e.localPlayer(),margin=s.w/2+32,ym=s.h/2+42;s.target={x:clamp(p.x,-e.fieldW/2+margin,e.fieldW/2-margin),y:clamp(p.y,-e.fieldH/2+ym,e.fieldH/2-ym)};
 s.strokes=graduationInk().map((t,i)=>{const p=rotate(t,s.angle),a=i*2.399963+s.round*.53+e.stage*.12,speed=155+e.stage*24+i%4*18;return{...t,x:s.target.x+p.x,y:s.target.y+p.y,angle:t.angle+s.angle,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,spin:(i%2?1:-1)*(.6+i%4*.22),delay:i*.026,age:-i*.026,cleared:false};});
 e.log('졸업 불가 도장 · 착지 범위 예고');
}
function enter(e:Engine){e.graduationStamp=freshGraduationStamp();e.graduationStamp.limit=e.stage>=2?4:3;}
function update(e:Engine,dt:number){
 const s=e.graduationStamp;if(!s.ready)prepare(e);s.age+=dt*e.localTime(s.target);
 for(const f of s.lingering){const old=f.age;f.age+=dt*e.localTime(f);const move=Math.max(0,f.age)-Math.max(0,old);f.x+=f.vx*move;f.y+=f.vy*move;f.angle+=f.spin*move;if(!f.cleared)for(const b of e.bodies())if(stampStrokeHits(f,e.local(b)))e.hit('졸업 불가 글자 획',b);}
 s.lingering=s.lingering.filter(f=>!f.cleared&&f.age<3.2);s.impactShake=Math.max(0,s.impactShake-dt);
 for(const m of s.imprints){m.age+=dt*e.localTime(m.target);if(m.age>=.65){s.lingering.push(...m.strokes);}}s.imprints=s.imprints.filter(m=>m.age<.65);
 if(s.phase==='warn'){if(s.age>=s.warnDuration){s.phase='press';s.age=0;}}
 else if(s.phase==='press'){
  if(s.age>=.18&&!s.impacted){s.impacted=true;s.impactShake=.22;e.fx(s.target,'ring',s.w*.7,'#ff9b7e',.65);e.fx(s.target,'burst',115,'#ffbba0',.6);e.log('졸업 불가 · 날인');}
  if(s.age>=.18&&s.age<.32)for(const body of e.bodies())if(stampFootprintHits(e,e.local(body)))e.hit('졸업 불가 도장 내려찍기',body);
  if(s.age>=.32){if(e.emitting&&s.quick&&stampRapidAllowed(e)){s.imprints.push({age:0,target:{...s.target},angle:s.angle,w:s.w,h:s.h,strokes:s.strokes});s.round++;prepare(e);}else{s.phase='ink';s.age=0;}}
 }else if(s.phase==='ink'){if(s.age>=.65){s.phase='scatter';s.age=0;e.log('도장 글자 분리 · 획 탄막 방출');}}
 else if(s.phase==='scatter'){
  for(const f of s.strokes){const old=f.age;f.age+=dt*e.localTime(f);const move=Math.max(0,f.age)-Math.max(0,old);if(old<=0&&f.age>0)s.released++;if(f.cleared)continue;f.x+=f.vx*move;f.y+=f.vy*move;f.angle+=f.spin*move;
   if(f.age>=0)for(const body of e.bodies())if(stampStrokeHits(f,e.local(body)))e.hit('졸업 불가 글자 획',body);
  }
  if(s.age>3.2+Math.max(...s.strokes.map(f=>f.delay),0)){s.lingering.push(...s.strokes.filter(f=>f.age<3.2));s.strokes=[];s.phase='rest';s.age=0;s.round++;}
 }else if(e.emitting&&s.age>=.65){prepare(e);}
}
export function clearStampByBomb(e:Engine){
 if(e.combatPattern.id!=='graduation-stamp')return;
 for(const f of [...e.graduationStamp.strokes,...e.graduationStamp.lingering,...e.graduationStamp.imprints.flatMap(m=>m.strokes)])if(!f.cleared&&bombReaches(e,f,f.ring||f.length/2+f.thickness/2))f.cleared=true;
}
export function stampScreenShake(e:Engine):Vec{const s=e.graduationStamp;if(e.combatPattern.id!=='graduation-stamp'||e.phase!=='active'||s.impactShake<=0)return{x:0,y:0};const a=5*s.impactShake/.22;return{x:Math.sin(e.clock*103)*a,y:Math.cos(e.clock*131)*a*.7};}
function inkStroke(c:CanvasRenderingContext2D,f:InkTemplate,color:string,glow=0){
 c.save();c.translate(f.x,f.y);c.rotate(f.angle);c.strokeStyle=color;c.fillStyle=color;c.shadowColor=color;c.shadowBlur=glow;c.lineWidth=f.thickness;c.lineCap='square';
 if(f.ring){c.beginPath();c.arc(0,0,f.ring,0,Math.PI*2);c.stroke();}else c.fillRect(-f.length/2,-f.thickness/2,f.length,f.thickness);c.restore();
}
function plate(c:CanvasRenderingContext2D,w:number,h:number){c.beginPath();c.roundRect(-w/2,-h/2,w,h,10);}
function drawStampBody(e:Engine,c:CanvasRenderingContext2D,s=e.graduationStamp){
 if(s.phase!=='warn'&&s.phase!=='press'&&!(s.phase==='ink'&&s.age<.45))return;
 const rise=e.fieldH+220,offset=s.phase==='warn'?-rise:s.phase==='press'?-rise*(1-smooth(s.age/.18)):-rise*smooth(s.age/.45),alpha=s.phase==='ink'?1-smooth(s.age/.45):s.phase==='warn'?.25:1;
 c.save();c.translate(s.target.x,s.target.y+offset);c.rotate(s.angle);c.globalAlpha=alpha;c.shadowColor='#000';c.shadowBlur=25;c.strokeStyle='#100b10';c.lineWidth=6;
 const side=c.createLinearGradient(0,-s.h/2-24,0,s.h/2);side.addColorStop(0,'#c52d40');side.addColorStop(.6,'#651426');side.addColorStop(1,'#280a18');c.fillStyle=side;plate(c,s.w+22,s.h+22);c.fill();c.stroke();
 c.fillStyle='#e8b45c';plate(c,s.w+8,s.h+7);c.fill();c.stroke();c.fillStyle='#621024';plate(c,s.w-3,s.h-7);c.fill();
 c.strokeStyle='#ffb7a0';c.lineWidth=3;plate(c,s.w-24,s.h-24);c.stroke();
 for(const t of graduationInk())inkStroke(c,t,'#ffded0');
 // A broad wooden grip with a red lacquered collar, drawn in the game's heavy-outline style.
 c.fillStyle='#351221';c.strokeStyle='#100b10';c.lineWidth=6;c.beginPath();c.roundRect(-48,-s.h/2-66,96,67,13);c.fill();c.stroke();
 const grip=c.createLinearGradient(-82,0,82,0);grip.addColorStop(0,'#5e1725');grip.addColorStop(.5,'#e15b54');grip.addColorStop(1,'#6c1d2b');c.fillStyle=grip;c.beginPath();c.ellipse(0,-s.h/2-76,88,28,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='#f6bd77';c.lineWidth=3;c.beginPath();c.ellipse(0,-s.h/2-78,72,16,0,Math.PI,Math.PI*2);c.stroke();c.restore();
}
function render(e:Engine,c:CanvasRenderingContext2D){
 const s=e.graduationStamp;if(!s.ready||e.phase!=='active')return;
 if(s.phase==='warn'||s.phase==='press'){
  c.save();c.translate(s.target.x,s.target.y);c.rotate(s.angle);const k=s.phase==='warn'?clamp(s.age/s.warnDuration,0,1):1;
  c.fillStyle=`rgba(125,18,42,${.16+.19*k})`;plate(c,s.w,s.h);c.fill();c.strokeStyle='#ff9b8e';c.lineWidth=2;c.setLineDash([11,7]);c.stroke();c.setLineDash([]);c.strokeStyle='#ffc3a0';c.lineWidth=3;const corners=[[-1,-1],[-1,1],[1,-1],[1,1]];for(const [x,y] of corners){c.beginPath();c.moveTo(x*(s.w/2-25),y*s.h/2);c.lineTo(x*s.w/2,y*s.h/2);c.lineTo(x*s.w/2,y*(s.h/2-22));c.stroke();}
  c.globalAlpha=.18+.3*k;for(const t of graduationInk())inkStroke(c,t,'#ff9d9d');c.restore();
 }
 if(s.impacted){
  if(s.phase!=='scatter'){
   c.save();c.translate(s.target.x,s.target.y);c.rotate(s.angle);c.globalAlpha=s.phase==='rest'?1-smooth(s.age/.55):.75;c.strokeStyle='#b9485c';c.lineWidth=4;plate(c,s.w-18,s.h-18);c.stroke();c.restore();
  }
  for(const f of s.strokes){if(f.cleared||f.age>3.2)continue;c.save();c.globalAlpha=s.phase==='rest'?1-smooth(s.age/.55):s.phase==='scatter'?1-smooth((f.age-2.7)/.5):.95;inkStroke(c,f,s.phase==='scatter'?'#ffd4b0':'#ec6675',s.phase==='scatter'?13:3);
   if(s.phase==='ink'&&s.age>.45){const k=smooth((s.age-.45)/.55);c.globalAlpha=k*.7;c.strokeStyle='#ffe6be';c.lineWidth=2;const d=Math.hypot(f.vx,f.vy)||1;c.beginPath();c.moveTo(f.x+f.vx/d*12,f.y+f.vy/d*12);c.lineTo(f.x+f.vx/d*27,f.y+f.vy/d*27);c.stroke();}
   if(e.hitboxes&&s.phase==='scatter'&&f.age>=0){c.strokeStyle='#fff9';c.lineWidth=1;c.beginPath();c.arc(f.x,f.y,f.ring||f.length/2+f.thickness/2,0,Math.PI*2);c.stroke();}c.restore();
  }
 }
 for(const f of s.lingering){if(f.cleared)continue;c.save();c.globalAlpha=1-smooth((f.age-2.7)/.5);inkStroke(c,f,'#ffd4b0',13);c.restore();}
 for(const m of s.imprints){c.save();for(const f of m.strokes)if(!f.cleared)inkStroke(c,f,'#ec6675',3);c.restore();drawStampBody(e,c,{...s,...m,phase:'ink'});}
 drawStampBody(e,c);
}
export const graduationStampPattern:Pattern={id:'graduation-stamp',name:'졸업 도장',english:'GRADUATION DENIED',subtitle:'착지 범위를 피하세요. 기본 전장은 단발, 전체화면 전장은 날인 직후 다음 도장을 연속으로 찍습니다.',category:'normal',orientation:0,stages:['일반 날인','기울어진 도장','전체화면 연속 날인','전체화면 고속 날인'],duration:30,enter,update,render,exit:e=>{e.graduationStamp=freshGraduationStamp();}};
