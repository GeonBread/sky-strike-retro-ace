import {emitNativeShots,nativeFireInterval,nativeCanFire,moveNativeShot,drawNativeShot,shotDamage,isNativeBeam} from './nativeWeapon';
import type {Shot} from './core';
import { drawBombEffects } from './bomb';
import type { Engine } from './engine';
import { clamp, smooth, distance, segmentDistance, Vec } from './core';
export type Exile={state:'grab'|'throw'|'drift'|'explore'|'enter'|'return'|'done';age:number;detached:boolean;viewW:number;viewH:number;camera:Vec;world:Vec;velocity:Vec;initialVelocity:Vec;flightStart:Vec;breakAt:Vec;travel:number;portal:Vec;w:number;h:number;spawn:number;from:Vec;entryFrom:Vec;enemies:(Vec&{hp:number;age:number;vx:number;vy:number})[];shots:Shot[];fire:number;heading:number;returned:boolean;bombOrigin:Vec|null};
export function freshExile():Exile{return {state:'grab',age:0,detached:false,viewW:1600,viewH:960,camera:{x:0,y:0},world:{x:0,y:0},velocity:{x:0,y:0},initialVelocity:{x:0,y:0},flightStart:{x:0,y:0},breakAt:{x:0,y:0},travel:0,portal:{x:0,y:0},w:0,h:0,spawn:0,from:{x:0,y:0},entryFrom:{x:0,y:0},enemies:[],shots:[],fire:0,heading:0,returned:false,bombOrigin:null};}
export function exileOutside(e:Engine){return e.pattern.id==='exile'&&e.phase==='active'&&e.advanced.exile.detached;}
export function enterExile(e:Engine){const size=e.gridSize(),x=e.advanced.exile;x.viewW=size.w;x.viewH=size.h;x.w=size.w*1.75;x.h=size.h*1.6;x.from=e.localPlayer();x.portal={x:x.w*.29,y:-x.h*.28};e.cooldown=5;}
export function seedExileEnemies(e:Engine){
 const x=e.advanced.exile,landing={x:x.flightStart.x+x.initialVelocity.x*1.85/3,y:x.flightStart.y+x.initialVelocity.y*1.85/3};
 const spacing=Math.max(145-e.stage*5,Math.sqrt(x.w*x.h/300)),cols=Math.ceil(x.w/spacing),rows=Math.ceil(x.h/spacing);x.enemies=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const p={x:-x.w/2+(col+.5+(e.random()-.5)*.45)*x.w/cols,y:-x.h/2+(row+.5+(e.random()-.5)*.45)*x.h/rows};
  if(distance(p,landing)<175||distance(p,x.portal)<100)continue;
  x.enemies.push({...p,hp:2,age:1,vx:0,vy:0});
 }
 x.enemies=x.enemies.slice(0,360);x.spawn=.65;
}
function setState(e:Engine,state:Exile['state']){
 const x=e.advanced.exile;x.state=state;x.age=0;
 if(state==='explore'&&!x.enemies.length)seedExileEnemies(e);
}
export function updateExile(e:Engine,dt:number){
 const x=e.advanced.exile;x.age+=dt;e.cooldown=Math.max(e.cooldown,x.state==='explore'?0:.3);
 if(x.state==='grab'){
  const k=smooth(x.age/1.1);e.player=e.screen({x:x.from.x*(1-k)+e.boss.x*k,y:x.from.y*(1-k)+(e.boss.y+75)*k});
  if(x.age>=1.45){x.from=e.localPlayer();e.fx(e.boss,'burst',100,'#d48dff',.55);setState(e,'throw');}
 }else if(x.state==='throw'){
  const speed=1150,contact=(x.from.x+e.fieldW/2)/speed,t=Math.min(x.age,contact);
  e.player=e.screen({x:x.from.x-speed*t,y:x.from.y+220*t});
  if(x.age>=contact){
   // The same world position becomes the fullscreen avatar position at the breach.
   x.world=e.localPlayer();x.breakAt={...x.world};x.flightStart={...x.world};x.camera={x:0,y:0};x.initialVelocity={x:-speed,y:220};x.velocity={...x.initialVelocity};x.detached=true;
   // Leave enough void past the exit even in a portrait browser.
   x.w=Math.max(x.w,(Math.abs(x.world.x)+speed*1.85/3+100)*2);x.heading=Math.atan2(x.initialVelocity.y,x.initialVelocity.x)+Math.PI/2;seedExileEnemies(e);e.shake=.18;setState(e,'drift');
  }
 }else if(x.state==='drift'){
  const duration=1.85,k=clamp(x.age/duration,0,1),integral=duration*(k-k*k+k*k*k/3),v=(1-k)**2;
  x.velocity={x:x.initialVelocity.x*v,y:x.initialVelocity.y*v};x.world={x:x.flightStart.x+x.initialVelocity.x*integral,y:x.flightStart.y+x.initialVelocity.y*integral};
  x.travel=distance(x.world,x.flightStart);e.playerFacing=x.heading+Math.sin(k*Math.PI)*-.65;
  if(k>=1){x.velocity={x:0,y:0};setState(e,'explore');e.log('전체 화면 바깥 공간 · 방향키 유영 · SPACE 사격 · 포탈 탐색');}
 }else if(x.state==='explore'){
  x.spawn-=dt;if(x.spawn<=0){x.spawn=.18-e.stage*.02;const side=Math.floor(e.random()*4),pos=e.random()-.5;
   const rx=x.viewW*.58,ry=x.viewH*.58,p=side===0?{x:x.world.x+pos*x.viewW,y:x.world.y-ry}:side===1?{x:x.world.x+rx,y:x.world.y+pos*x.viewH}:side===2?{x:x.world.x+pos*x.viewW,y:x.world.y+ry}:{x:x.world.x-rx,y:x.world.y+pos*x.viewH};p.x=clamp(p.x,-x.w/2+30,x.w/2-30);p.y=clamp(p.y,-x.h/2+30,x.h/2-30);x.enemies.push({...p,vx:0,vy:0,hp:2,age:0});}
  for(const m of x.enemies){m.age+=dt;const d=distance(m,x.world)||1,sp=19+e.stage*4;m.vx=(x.world.x-m.x)/d*sp;m.vy=(x.world.y-m.y)/d*sp;m.x+=m.vx*dt;m.y+=m.vy*dt;if(d<28)e.hit('화면 밖 오염 군집');}
  x.fire-=dt;if((e.keys.has(' ')||e.autoFire)&&x.fire<=0&&nativeCanFire(e)){x.fire=nativeFireInterval(e);x.shots.push(...emitNativeShots(e,x.world,x.heading));}
  for(const s of x.shots){moveNativeShot(e,s,dt);const prev={x:s.x,y:s.y};s.age+=dt;s.x+=(s.vx??0)*dt;s.y+=s.vy*dt;const beam=isNativeBeam(s);const m=beam?[...x.enemies].filter(m=>m.hp>0).sort((a,b)=>distance(a,x.world)-distance(b,x.world))[0]:x.enemies.find(m=>m.hp>0&&segmentDistance(m,prev,s)<24);if(m&&(!beam||e.clock>=(s.beamNextHit??0))){m.hp-=shotDamage(s);if(beam)s.beamNextHit=e.clock+.12;else s.age=10;}}
  x.shots=x.shots.filter(s=>s.age<3);x.enemies=x.enemies.filter(m=>m.hp>0&&m.age<150).slice(-360);
  if(distance(x.world,x.portal)<58){x.entryFrom={...x.world};setState(e,'enter');e.log('복귀 포탈 진입');}
 }else if(x.state==='enter'){
  const k=smooth(x.age/.9);x.world={x:x.entryFrom.x+(x.portal.x-x.entryFrom.x)*k,y:x.entryFrom.y+(x.portal.y-x.entryFrom.y)*k};
  if(x.age>.95){setState(e,'return');x.detached=false;e.player=e.point(.5,.76);x.enemies=[];x.shots=[];}
 }else if(x.state==='return'&&x.age>1.25){x.returned=true;setState(e,'done');e.finish();}
 if(x.detached){
  const size=e.gridSize();x.viewW=size.w;x.viewH=size.h;const target={x:clamp(x.world.x+x.viewW*.18,-x.w/2+x.viewW/2,x.w/2-x.viewW/2),y:clamp(x.world.y,-x.h/2+x.viewH/2,x.h/2-x.viewH/2)},k=1-Math.exp(-5*dt);
  x.camera.x+=(target.x-x.camera.x)*k;x.camera.y+=(target.y-x.camera.y)*k;e.player=e.screen(x.world);
 }
}
export function moveExile(e:Engine,dt:number,dx:number,dy:number){
 const x=e.advanced.exile;if(x.state!=='explore')return;
 if(dx||dy){const target=Math.atan2(dy,dx)+Math.PI/2,delta=Math.atan2(Math.sin(target-x.heading),Math.cos(target-x.heading));x.heading+=clamp(delta,-4.8*dt,4.8*dt);x.velocity.x+=(Math.sin(x.heading)*330-x.velocity.x)*(1-Math.exp(-6*dt));x.velocity.y+=(-Math.cos(x.heading)*330-x.velocity.y)*(1-Math.exp(-6*dt));}
 else{x.velocity.x*=Math.exp(-3*dt);x.velocity.y*=Math.exp(-3*dt);}
 x.world.x=clamp(x.world.x+x.velocity.x*dt,-x.w/2+25,x.w/2-25);x.world.y=clamp(x.world.y+x.velocity.y*dt,-x.h/2+25,x.h/2-25);e.playerFacing=x.heading;
}
/** Position of the original screen in the whole-browser view, always receding right. */
export function exileProjection(x:Exile){return {x:x.viewW/2-x.camera.x+x.travel*.7,y:x.viewH/2-x.camera.y-x.travel*.12,scale:1/(1+(x.travel/220)**1.8)};}
export function exileOverlay(e:Engine,c:CanvasRenderingContext2D):boolean{
 if(e.pattern.id!=='exile'||e.phase!=='active')return false;const x=e.advanced.exile;
 if(x.state==='grab'){const a=e.screen(e.boss),b=e.player;c.save();c.strokeStyle='#c188ff';c.lineWidth=10;c.shadowColor='#bc79ff';c.shadowBlur=18;c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(a.x+140,b.y,b.x,b.y);c.stroke();c.strokeStyle='#efcaff';c.lineWidth=3;c.beginPath();c.ellipse(b.x,b.y,50,62,0,0,Math.PI*2);c.stroke();c.restore();}
 if(x.state==='throw'){const p=e.player;c.save();for(let i=0;i<18;i++){c.strokeStyle=i%3?'#b98be6':'#f0d3ff';c.globalAlpha=.2+i*.01;c.lineWidth=2+i%3;c.beginPath();c.moveTo(p.x+35+i*12,p.y-95+i*10);c.lineTo(p.x+220+i*12,p.y-125+i*10);c.stroke();}c.restore();}
 return false;
}
export function drawExile(e:Engine,c:CanvasRenderingContext2D,drawPlayer:(p:Vec)=>void,drawArena:()=>void){
 const x=e.advanced.exile,w=x.viewW,h=x.viewH,panel=exileProjection(x);c.save();c.fillStyle='#080718';c.fillRect(0,0,w,h);
 const speed=Math.hypot(x.velocity.x,x.velocity.y),streak=x.state==='drift'?speed*.075:3;
 for(let i=0;i<180;i++){const px=((i*137.79-x.camera.x*.28)%w+w)%w,py=((i*87.73-x.camera.y*.28)%h+h)%h;c.strokeStyle=i%2?'#9465d066':'#dba8ef44';c.lineWidth=1+i%2;c.beginPath();c.moveTo(px,py);c.lineTo(px+streak,py-streak*.16);c.stroke();}
 // The intact arena keeps its original artwork and HUD while moving off to the right.
 c.save();c.translate(panel.x,panel.y);c.scale(panel.scale,panel.scale);drawArena();c.restore();
 c.save();c.translate(w/2-x.camera.x,h/2-x.camera.y);
  for(const m of x.enemies){c.save();c.translate(m.x,m.y);c.rotate(m.age*.3);c.globalAlpha=smooth(m.age/.7);c.shadowColor='#be6dee';c.shadowBlur=12;c.fillStyle=m.hp<2?'#e7a9fd':'#7d3eaa';c.strokeStyle='#d09be9';c.lineWidth=2;c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?15:27;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.stroke();c.restore();}
 if(x.state==='drift'){
  const k=clamp(x.age/1.85,0,1);c.save();c.translate(x.breakAt.x,x.breakAt.y);
  for(let i=0;i<30;i++){const a=i*2.399,r=25+k*(70+i*5);c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r);c.rotate(a+k*3);c.globalAlpha=(1-k)*.85;c.fillStyle=i%3?'#603c9e':'#d6b9ff';c.beginPath();c.moveTo(-9,-18);c.lineTo(14,-4);c.lineTo(4,20);c.closePath();c.fill();c.restore();}c.restore();
  c.save();c.globalAlpha=(1-k)*.55;c.strokeStyle='#e3baff';c.lineWidth=4;c.beginPath();c.moveTo(x.world.x+45,x.world.y-8);c.lineTo(x.world.x+45+streak*3,x.world.y-8-streak*.5);c.stroke();c.restore();
 }else{
  c.strokeStyle='#6d4a9144';c.lineWidth=3;c.strokeRect(-x.w/2,-x.h/2,x.w,x.h);c.strokeStyle='#6b478418';c.lineWidth=1;
  for(let xx=-x.w/2;xx<x.w/2;xx+=140){c.beginPath();c.moveTo(xx,-x.h/2);c.lineTo(xx,x.h/2);c.stroke();}
  for(let yy=-x.h/2;yy<x.h/2;yy+=140){c.beginPath();c.moveTo(-x.w/2,yy);c.lineTo(x.w/2,yy);c.stroke();}

  for(const s of x.shots)drawNativeShot(e,c,s);
  c.save();c.translate(x.portal.x,x.portal.y);c.shadowColor='#76ffe0';c.shadowBlur=30;c.strokeStyle='#8affde';c.lineWidth=6;c.beginPath();c.ellipse(0,0,54,78,0,0,Math.PI*2);c.stroke();c.lineWidth=2;
  for(let j=0;j<3;j++){c.save();c.rotate(e.clock*(j%2?1:-1)+j);c.beginPath();c.ellipse(0,0,38+j*7,64+j*7,0,0,Math.PI*2);c.stroke();c.restore();}c.fillStyle='#8fffe629';c.fill();c.restore();
 }
 drawBombEffects(e,c);
 if(e.dead<=0&&!e.gameOver){c.save();if(x.state==='enter'){const k=clamp(x.age/.9,0,1);c.translate(x.world.x,x.world.y);c.rotate(k*9);c.scale(1-k,1-k);drawPlayer({x:0,y:0});}else drawPlayer(x.world);c.restore();}c.restore();
 if(x.state==='explore'||x.state==='enter'){
  const dest={x:w/2+x.portal.x-x.camera.x,y:h/2+x.portal.y-x.camera.y},avatar={x:w/2+x.world.x-x.camera.x,y:h/2+x.world.y-x.camera.y},ang=Math.atan2(dest.y-avatar.y,dest.x-avatar.x),cl={x:clamp(dest.x,64,w-64),y:clamp(dest.y,170,h-80)};
  c.save();c.translate(cl.x,cl.y);c.rotate(ang);c.fillStyle='#a2ffe1';c.shadowColor='#6effd8';c.shadowBlur=15;c.beginPath();c.moveTo(23,0);c.lineTo(-10,-12);c.lineTo(-10,12);c.closePath();c.fill();c.restore();c.fillStyle='#c5ffec';c.textAlign='center';c.font='bold 18px "Noto Sans KR"';c.fillText('복귀 포탈',cl.x,cl.y+37);
  c.save();c.translate(30,115);c.fillStyle='#070b18cc';c.fillRect(0,0,170,110);c.strokeStyle='#8b64ac';c.strokeRect(0,0,170,110);c.fillStyle='#b78cef';for(const m of x.enemies)c.fillRect((m.x/x.w+.5)*170,(m.y/x.h+.5)*110,2,2);c.fillStyle='#7cffdc';c.beginPath();c.arc((x.portal.x/x.w+.5)*170,(x.portal.y/x.h+.5)*110,5,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();c.arc((x.world.x/x.w+.5)*170,(x.world.y/x.h+.5)*110,3,0,Math.PI*2);c.fill();c.restore();
 }c.restore();
}
