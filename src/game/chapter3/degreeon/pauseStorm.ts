import type {Engine} from './engine';
import type {Pattern,Vec} from './core';
import {BASE_FIELD_W,BASE_FIELD_H,CANVAS_CX,CANVAS_CY,PLAYER_MOVE_SPEED,PLAYER_HIT_RADIUS,clamp,smooth,circleRect} from './core';
import {drawPauseWindow,PAUSE_WINDOW_W,PAUSE_WINDOW_H} from './pauseWindow';
import {bombReaches} from './bomb';
export const STORM_CONTROL_TIME=3.6,STORM_WARN_TIME=.8;
export function pauseLogicalScale(e:Engine){return typeof window==='undefined'?1:Math.min(560,window.innerWidth*.92)/560/e.displayScale;}
export const stormFlightSpeed=(stage:number)=>800+stage*45;
type WindowMode='stack'|'idle'|'warn'|'fly'|'stuck'|'cleared';
type Edge='left'|'right'|'top'|'bottom';
export type StormWindow=Vec&{id:number;corner:number;layer:number;state:WindowMode;w:number;h:number;scale:number;age:number;vx:number;vy:number;angle:number;spin:number;trail:(Vec&{angle:number})[];from:Vec;aim:Vec;edge:Edge|null;along:number};
export type ImpactShard=Vec&{vx:number;vy:number;angle:number;spin:number;age:number;life:number;size:number;color:string};
export type PauseStormState={age:number;phase:'fake'|'multiply'|'scatter'|'attack'|'done'|'return';returnAge:number;returnW:number;returnH:number;returnPlayer:Vec;returnBoss:Vec;total:number;windows:StormWindow[];order:number[];cursor:number;nextWarning:number;heading:number;rest:number;impactShake:number;impacts:number;shards:ImpactShard[];};
export const freshPauseStorm=():PauseStormState=>({age:0,phase:'fake',returnAge:0,returnW:BASE_FIELD_W,returnH:BASE_FIELD_H,returnPlayer:{x:0,y:0},returnBoss:{x:0,y:-300},total:12,windows:[],order:[],cursor:0,nextWarning:0,heading:0,rest:0,impactShake:0,impacts:0,shards:[]});
export function stormAnchor(e:Engine,w:StormWindow):Vec{
 // Divide all four edges into separate slots; vertical slots clear the top/bottom rows.
 const total=e.pauseStorm.total,margin=16,gap=18;
 const horizontal=clamp(Math.round(total*e.fieldW/(2*(e.fieldW+e.fieldH))),2,Math.min(total/2-2,Math.floor((e.fieldW-2*margin)/(w.w+24)))),vertical=total/2-horizontal;
 const side=w.id<horizontal?0:w.id<horizontal+vertical?1:w.id<2*horizontal+vertical?2:3;
 const index=w.id-(side===0?0:side===1?horizontal:side===2?horizontal+vertical:2*horizontal+vertical);
 w.corner=side;w.layer=index;
 if(side===0||side===2){const x=-e.fieldW/2+margin+(index+.5)*(e.fieldW-2*margin)/horizontal;
  return{x:side===0?x:-x,y:(side===0?-1:1)*(e.fieldH/2-margin-w.h/2)};
 }
 const height=e.fieldH-2*(margin+w.h+gap),y=-height/2+(index+.5)*height/vertical;
 return{x:(side===1?1:-1)*(e.fieldW/2-margin-w.w/2),y:side===1?y:-y};
}
/** A brief decaying jolt of the entire physical canvas, including HUD and windows. */
export function stormScreenShake(e:Engine):Vec{
 if(e.pattern.id!=='pause-storm'||e.phase!=='active')return{x:0,y:0};
 const s=e.pauseStorm,a=4.5*clamp(s.impactShake/.18,0,1);
 if(!a)return{x:0,y:0};
 return{x:Math.sin(s.age*93+s.impacts*2.1)*a,y:Math.cos(s.age*117+s.impacts)*a*.75};
}
export function stormWindowHits(w:StormWindow,p:Vec){
 const dx=p.x-w.x,dy=p.y-w.y,c=Math.cos(w.angle),s=Math.sin(w.angle);
 return circleRect({x:dx*c+dy*s,y:-dx*s+dy*c},PLAYER_HIT_RADIUS,{x:0,y:0,w:w.w,h:w.h});
}
function stuckPosition(e:Engine,w:StormWindow):Vec{
 return w.edge==='left'||w.edge==='right'?{x:(w.edge==='left'?-1:1)*(e.fieldW/2-w.w*.22),y:w.along*e.fieldH/2}:{x:w.along*e.fieldW/2,y:(w.edge==='top'?-1:1)*(e.fieldH/2-w.h*.22)};
}
export function syncPauseStormField(e:Engine){
 if(e.pattern.id!=='pause-storm'||e.phase!=='active'&&e.phase!=='outro')return;const s=e.pauseStorm;
 if(s.phase==='return'){const k=smooth((s.returnAge-.82)/1.32);e.fieldW=s.returnW+(BASE_FIELD_W-s.returnW)*k;e.fieldH=s.returnH+(BASE_FIELD_H-s.returnH)*k;return;}
 const v=e.gridSize(),k=smooth((s.age-1.1)/1.2);
 e.fieldW=BASE_FIELD_W+(v.w-BASE_FIELD_W)*k;e.fieldH=BASE_FIELD_H+(v.h-BASE_FIELD_H)*k;if(!e.encounter.enabled)e.boss.y=-e.fieldH/2+145;
 for(const w of s.windows){if(w.state==='idle'||w.state==='warn')Object.assign(w,stormAnchor(e,w));else if(w.state==='stuck')Object.assign(w,stuckPosition(e,w));}
}
export function movePauseStorm(e:Engine,dt:number,dx:number,dy:number){
 const s=e.pauseStorm;
 if(s.phase==='return')return;
 if(s.phase!=='attack'){e.player=e.screen({x:0,y:0});return;}
 const p=e.localPlayer(),mag=Math.hypot(dx,dy);
 if(mag){const speed=PLAYER_MOVE_SPEED/mag;p.x+=dx*speed*dt;p.y+=dy*speed*dt;s.heading=Math.atan2(dy,dx)+Math.PI/2;}
 p.x=clamp(p.x,-e.fieldW/2+16,e.fieldW/2-16);p.y=clamp(p.y,-e.fieldH/2+16,e.fieldH/2-16);e.player=e.screen(p);
}
function enter(e:Engine){
 const total=12+e.stage*2,s=freshPauseStorm();s.total=total;
 const scale=.34,speed=PAUSE_WINDOW_W*scale;
 s.windows=Array.from({length:total},(_,id):StormWindow=>({id,corner:id%4,layer:Math.floor(id/4),x:0,y:0,w:speed,h:PAUSE_WINDOW_H*scale,scale:1,state:'stack',age:0,vx:0,vy:0,angle:0,spin:0,trail:[],from:{x:(e.random()-.5)*300,y:(e.random()-.5)*180},aim:{x:0,y:0},edge:null,along:0}));
 s.order=Array.from({length:total},(_,i)=>i);for(let i=total-1;i>0;i--){const j=Math.floor(e.random()*(i+1));[s.order[i],s.order[j]]=[s.order[j],s.order[i]];}
 e.pauseStorm=s;e.phase='active';e.phaseTime=0;e.angle=e.targetAngle=e.fromAngle=0;e.orientation=0;e.rotation=0;e.player=e.screen({x:0,y:0});e.playerFacing=0;e.cooldown=0;e.keys.clear();e.shots=[];
}
function embed(e:Engine,w:StormWindow,edge:Edge){
 w.edge=edge;w.state='stuck';w.age=0;w.vx=w.vy=w.spin=0;w.trail=[];w.along=clamp((edge==='left'||edge==='right'?w.y/(e.fieldH/2):w.x/(e.fieldW/2)),-.99,.99);Object.assign(w,stuckPosition(e,w));
 const s=e.pauseStorm;s.impactShake=.18;s.impacts++;e.shake=Math.max(e.shake,.12);
 const nx=edge==='left'?1:edge==='right'?-1:0,ny=edge==='top'?1:edge==='bottom'?-1:0;
 const x=nx?(-nx)*(e.fieldW/2-4):w.x,y=ny?(-ny)*(e.fieldH/2-4):w.y;
 for(let i=0;i<18;i++){const speed=220+e.random()*300,side=(e.random()-.5)*550;
  s.shards.push({x:x-ny*(e.random()-.5)*30,y:y+nx*(e.random()-.5)*30,vx:nx*speed-ny*side,vy:ny*speed+nx*side,angle:e.random()*Math.PI*2,spin:(e.random()-.5)*24,age:0,life:.45+e.random()*.35,size:3+e.random()*5,color:['#efcbff','#fa708b','#40374b'][i%3]});
 }
 s.shards=s.shards.slice(-216);
 e.fx({x,y},'ring',28,'#e4bbf5',.22);
}
function update(e:Engine,dt:number){
 const s=e.pauseStorm;s.age+=dt;s.impactShake=Math.max(0,s.impactShake-dt);
 for(const p of s.shards){p.age+=dt;p.vy+=380*dt;const drag=Math.exp(-1.8*dt);p.vx*=drag;p.vy*=drag;p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;}
 s.shards=s.shards.filter(p=>p.age<p.life);syncPauseStormField(e);
 s.phase=s.age<1.1?'fake':s.age<2.3?'multiply':s.age<STORM_CONTROL_TIME?'scatter':'attack';
 if(s.phase!=='attack'){
  e.player=e.screen({x:0,y:0});e.playerFacing=0;if(!e.encounter.enabled)e.playerAnimClock=e.bossAnimClock=0;
  for(const w of s.windows){
   const k=smooth((s.age-1.1)/1.2),travel=smooth((s.age-2.3)/(STORM_CONTROL_TIME-2.3)),a=stormAnchor(e,w);
   const full=pauseLogicalScale(e);w.scale=full-(full-.34)*k;w.x=w.from.x*k+(a.x-w.from.x)*travel;w.y=w.from.y*k+(a.y-w.from.y)*travel;
  }return;
 }
 for(const w of s.windows)if(w.state==='stack'){w.state='idle';w.scale=.34;Object.assign(w,stormAnchor(e,w));}
 const elapsed=s.age-STORM_CONTROL_TIME,period=.64-e.stage*.035;
 if(s.cursor<s.total&&elapsed>=s.nextWarning){
  const w=s.windows[s.order[s.cursor++]];w.state='warn';w.age=0;const target=e.localPlayer(),d=Math.hypot(target.x-w.x,target.y-w.y)||1;
  w.aim={x:(target.x-w.x)/d,y:(target.y-w.y)/d};s.nextWarning+=period;
  e.log(`ESC 창 · 발사 예고 ${s.cursor}/${s.total}`);
 }
 for(const w of s.windows){
  if(w.state==='warn'){
   w.age+=dt;if(w.age>=STORM_WARN_TIME){w.state='fly';w.age=0;const speed=stormFlightSpeed(e.stage)*.7;w.vx=w.aim.x*speed;w.vy=w.aim.y*speed;w.spin=(w.id%2?1:-1)*(1.2+(w.id%3)*.3);}
  }else if(w.state==='fly'){
   w.trail.push({x:w.x,y:w.y,angle:w.angle});if(w.trail.length>5)w.trail.shift();w.age+=dt;w.angle+=w.spin*dt;
   const speed=stormFlightSpeed(e.stage)*(.7+.3*smooth(w.age/.18)),mag=Math.hypot(w.vx,w.vy);if(mag){w.vx=w.vx/mag*speed;w.vy=w.vy/mag*speed;}
   // Stop on the first wall hit, even during a long frame, without sliding along it.
   const tx=w.vx>0?(e.fieldW/2-w.w*.22-w.x)/w.vx:w.vx<0?(-e.fieldW/2+w.w*.22-w.x)/w.vx:Infinity;
   const ty=w.vy>0?(e.fieldH/2-w.h*.22-w.y)/w.vy:w.vy<0?(-e.fieldH/2+w.h*.22-w.y)/w.vy:Infinity;
   const travel=Math.max(0,Math.min(dt,tx,ty));w.x+=w.vx*travel;w.y+=w.vy*travel;
   if(travel<dt+1e-8&&(tx<=dt||ty<=dt))embed(e,w,tx<ty?w.vx>0?'right':'left':w.vy>0?'bottom':'top');
  }else if(w.state==='stuck'||w.state==='cleared')w.age+=dt;
  if((w.state==='fly'||w.state==='stuck')&&stormWindowHits(w,e.localPlayer()))e.hit('ESC 알림창 충돌');
 }
 if(s.cursor===s.total&&s.windows.every(w=>w.state==='stuck'||w.state==='cleared')){s.rest+=dt;if(s.rest>=1.2){s.phase='done';e.finish();}}
}
export function clearStormByBomb(e:Engine){
 if(e.pattern.id!=='pause-storm'||e.pauseStorm.phase!=='attack')return;
 for(const w of e.pauseStorm.windows){if(w.state!=='fly'&&w.state!=='stuck')continue;const p=e.smartBombWorldOrigin,nearest={x:clamp(p.x,w.x-w.w/2,w.x+w.w/2),y:clamp(p.y,w.y-w.h/2,w.y+w.h/2)};
  if(bombReaches(e,nearest,0)){w.state='cleared';w.age=0;e.fx(w,'burst',40,'#ffe7ae',.3);}
 }
}
function drawWindow(e:Engine,c:CanvasRenderingContext2D,w:StormWindow){
 if(w.state==='cleared'&&w.age>.25)return;
 if(w.state==='fly')for(const [i,alpha] of [[0,.07],[2,.14]]){const p=w.trail[i];if(!p)continue;c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.globalAlpha*=alpha;c.scale(w.scale,w.scale);drawPauseWindow(c);c.restore();}
 c.save();const shake=w.state==='warn'?smooth(w.age/STORM_WARN_TIME):0;
 const recoil=w.state==='warn'?12*smooth((w.age-(STORM_WARN_TIME-.18))/.18):0;
 c.translate(w.x+Math.sin(w.age*82+w.id)*11*shake-w.aim.x*recoil,w.y+Math.sin(w.age*69+w.id)*7*shake-w.aim.y*recoil);c.rotate(w.angle+Math.sin(w.age*75)*.022*shake);
 if(w.state==='cleared')c.globalAlpha*=1-w.age/.25;
 if(w.state==='warn'||w.state==='fly'){c.shadowColor='#dc9dff';c.shadowBlur=w.state==='warn'?12:20;c.strokeStyle='#dca1ff';c.lineWidth=2;c.strokeRect(-w.w/2-2,-w.h/2-2,w.w+4,w.h+4);}
 if(w.state==='stuck'){
  c.strokeStyle='#c198d7';c.lineWidth=1.5;for(const side of [-1,1]){c.beginPath();c.moveTo(side*w.w*.47,-w.h*.45);c.lineTo(side*(w.w*.52+8),-w.h*.6);c.lineTo(side*(w.w*.52+17),-w.h*.58);c.moveTo(side*w.w*.47,w.h*.45);c.lineTo(side*(w.w*.52+8),w.h*.64);c.stroke();}
  c.translate(-w.aim.x*Math.sin(w.age*38)*5*Math.exp(-w.age*8),-w.aim.y*Math.sin(w.age*38)*5*Math.exp(-w.age*8));
 }
 c.scale(w.scale,w.scale);drawPauseWindow(c);c.restore();
}
/** Draw after the boss HUD so the fake menu has the same stacking as real ESC. */
export function drawPauseStormOverlay(e:Engine,c:CanvasRenderingContext2D){
 if(e.pattern.id!=='pause-storm'||e.phase!=='active'&&e.phase!=='outro')return;const s=e.pauseStorm;
 c.save();c.translate(CANVAS_CX,CANVAS_CY);c.beginPath();c.rect(-e.fieldW/2,-e.fieldH/2,e.fieldW,e.fieldH);c.clip();
 if(s.phase==='fake'){
  c.fillStyle='rgba(0,0,0,.78)';c.fillRect(-e.fieldW/2,-e.fieldH/2,e.fieldW,e.fieldH);const scale=pauseLogicalScale(e);c.scale(scale,scale);drawPauseWindow(c);
 }else{
  const curtain=s.phase==='multiply'?.78*(1-smooth((s.age-1.1)/1.2)):0;
  if(curtain){c.fillStyle=`rgba(0,0,0,${curtain})`;c.fillRect(-e.fieldW/2,-e.fieldH/2,e.fieldW,e.fieldH);}
  for(const w of s.windows){if(s.phase==='return'){const k=smooth((s.returnAge-w.id*.18/s.total)/.6);if(k>=1)continue;c.save();c.globalAlpha*=1-k;c.translate(-w.aim.x*k*20,-w.aim.y*k*20);const scale=w.scale;w.scale=scale*(1-.28*k);drawWindow(e,c,w);w.scale=scale;c.restore();continue;}if(s.phase==='multiply'&&s.age<1.1+w.id*.045)continue;drawWindow(e,c,w);}
  for(const p of s.shards){c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.globalAlpha=1-p.age/p.life;c.fillStyle=p.color;c.strokeStyle='#f9eaff';c.lineWidth=.7;c.shadowColor=p.color;c.shadowBlur=5;
   c.beginPath();c.moveTo(-p.size*.7,-p.size*.4);c.lineTo(p.size*.9,-p.size*.3);c.lineTo(p.size*.45,p.size*.7);c.lineTo(-p.size*.6,p.size*.3);c.closePath();c.fill();c.stroke();c.restore();
  }
 }
 c.restore();
}
export const pauseStormPattern:Pattern={id:'pause-storm',name:'ESC 창 폭주',english:'PAUSE WINDOW STORM',category:'special',orientation:0,duration:Infinity,
 subtitle:'일시정지 창이 전장 둘레를 감쌉니다. 흔들림 예고 후 빠르게 돌진하고 충돌 시 파편이 튑니다.',stages:['12개 알림창','14개 연속 돌진','16개 사방 공격','18개 고속 폭주'],enter,update,render:()=>{},exit:e=>{e.pauseStorm=freshPauseStorm();e.playerFacing=0;}};

export function beginStormReturn(e:Engine){
 const s=e.pauseStorm;if(s.phase==='return')return;s.phase='return';s.returnAge=0;s.returnW=e.fieldW;s.returnH=e.fieldH;s.returnPlayer=e.localPlayer();s.returnBoss={...e.boss};s.impactShake=0;e.phase='outro';e.phaseTime=0;e.shots=[];e.hazards=[];e.cooldown=Math.max(2.2,e.cooldown);e.log('패턴 종료 · ESC 창을 닫고 전장을 복구합니다.');
}
export function updateStormReturn(e:Engine,dt:number){
 const s=e.pauseStorm;s.returnAge+=dt;syncPauseStormField(e);const k=smooth((s.returnAge-.65)/1.45);e.player=e.screen({x:s.returnPlayer.x*(1-k),y:s.returnPlayer.y*(1-k)+404*k});e.boss={x:s.returnBoss.x*(1-k),y:s.returnBoss.y*(1-k)-300*k};e.playerFacing*=Math.exp(-8*dt);
 for(const p of s.shards){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;}s.shards=s.shards.filter(p=>p.age<p.life);
 if(s.returnAge>=2.18){s.windows=[];s.shards=[];}
}
