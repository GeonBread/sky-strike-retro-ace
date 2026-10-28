import {drawNativeShot} from './nativeWeapon';
import type {Engine} from './engine';
import type {Pattern,Vec} from './core';
import {BASE_FIELD_W,BASE_FIELD_H,CANVAS_CX,CANVAS_CY,PLAYER_MOVE_SPEED,PLAYER_HIT_RADIUS,clamp,smooth,circleRect} from './core';
import {menuArt,menuLayout,menuBackgroundPath,drawMenuBackground,drawUiImage} from './originalUi';
import {createChapter3WaveRuntime} from './originalChapter3';
import {drawBombEffects,bombReaches} from './bomb';
import {sampleMenuCinematic,MENU_SLIDE_START,MENU_LAND_TIME,ARENA_BREACH_TIME,ARENA_BREACH_Y,arenaExitX} from './menuCinematic';
export const MENU_ATTACK_START=5.4,MENU_RETURN_DURATION=2.2;
export type MenuPhase='throw'|'reveal'|'shake'|'scatter'|'attack'|'drain'|'return';
export type MenuProjectile=Vec&{id:number;art:number;vx:number;vy:number;w:number;h:number;age:number;warn:number;life:number;cleared:boolean;};
type Spawn=Vec&{age:number;duration:number;done:boolean};
export type MenuDeceptionState={age:number;phase:MenuPhase;variant:1|2;background:string;heading:number;throwFrom:Vec;returnFrom:Vec;returnW:number;returnH:number;returnAge:number;attackDuration:number;shotTimer:number;serial:number;projectiles:MenuProjectile[];spawned:number;spawnTimer:number;spawns:Spawn[];spawnLog:{type:string;name:string;x:number;y:number}[];wave:ReturnType<typeof createChapter3WaveRuntime>|null;};
export const freshMenuDeception=():MenuDeceptionState=>({age:0,phase:'throw',variant:1,background:'',heading:0,throwFrom:{x:0,y:404},returnFrom:{x:0,y:0},returnW:BASE_FIELD_W,returnH:BASE_FIELD_H,returnAge:0,attackDuration:8,shotTimer:0,serial:0,projectiles:[],spawned:0,spawnTimer:0,spawns:[],spawnLog:[],wave:null});
export const isMenuDeception=(e:Engine)=>e.pattern.id==='menu-deception'||e.pattern.id==='menu-deception-mobs';
export const menuInputLocked=(e:Engine)=>isMenuDeception(e)&&(e.menuDeception.phase==='throw'||e.menuDeception.phase==='reveal'||e.menuDeception.phase==='return');
export function syncMenuField(e:Engine){
 if(!isMenuDeception(e))return;const s=e.menuDeception,v=e.gridSize();
 const k=s.phase==='return'?1-smooth((s.returnAge-.5)/1.6):smooth((s.age-.55)/.5);
 e.fieldW=BASE_FIELD_W+(v.w-BASE_FIELD_W)*k;e.fieldH=BASE_FIELD_H+(v.h-BASE_FIELD_H)*k;
 if(s.wave)s.wave.resize(v.w,v.h);
}
export function menuCinematic(e:Engine,t=e.menuDeception.age){const v=e.gridSize();return sampleMenuCinematic(v.w,v.h,t,e.menuDeception.throwFrom,e.boss);}
export function moveMenuPlayer(e:Engine,dt:number,dx:number,dy:number){
 const s=e.menuDeception;
 if(s.phase==='return'){const k=smooth((s.returnAge-.45)/1.65);e.player=e.screen({x:s.returnFrom.x*(1-k),y:s.returnFrom.y*(1-k)+404*k});return;}
 if(menuInputLocked(e)){const frame=menuCinematic(e);e.player=e.screen(frame.player);if(e.menuDeception.age>.65&&e.menuDeception.age<MENU_LAND_TIME-.2){const prev=menuCinematic(e,Math.max(0,e.menuDeception.age-.02)).player;e.menuDeception.heading=Math.atan2(frame.player.y-prev.y,frame.player.x-prev.x)+Math.PI/2;}else e.menuDeception.heading=0;return;}
 const p=e.localPlayer(),mag=Math.hypot(dx,dy);if(mag){p.x+=dx/mag*PLAYER_MOVE_SPEED*dt;p.y+=dy/mag*PLAYER_MOVE_SPEED*dt;s.heading=Math.atan2(dy,dx)+Math.PI/2;}
 p.x=clamp(p.x,-e.fieldW/2+16,e.fieldW/2-16);p.y=clamp(p.y,-e.fieldH/2+16,e.fieldH/2-16);e.player=e.screen(p);
}
export function enterMenuDeception(e:Engine,variant:1|2){
 const s=freshMenuDeception();s.variant=variant;s.background=menuBackgroundPath();s.attackDuration=variant===1?7+e.stage:14;s.throwFrom=e.localPlayer();
 if(variant===2&&typeof document!=='undefined')s.wave=createChapter3WaveRuntime(document.createElement('canvas'),tag=>e.hit(tag),()=>e.random());
 e.menuDeception=s;e.angle=e.targetAngle=e.fromAngle=0;e.orientation=0;e.rotation=0;e.playerFacing=0;e.phase='active';e.phaseTime=0;e.keys.clear();e.clearAttack();
 const v=e.gridSize();s.wave?.start(v.w,v.h);e.log('디그리온이 호반우를 전장 밖으로 던집니다.');
}
export function beginMenuReturn(e:Engine){
 const s=e.menuDeception;if(s.phase==='return')return;s.phase='return';s.returnAge=0;s.returnFrom=e.localPlayer();s.returnW=e.fieldW;s.returnH=e.fieldH;
 e.phase='outro';e.phaseTime=0;e.shots=[];e.hazards=[];s.wave?.clear();e.cooldown=Math.max(e.cooldown,2.2);e.log('패턴 종료 · 메인 화면이 걷히고 원래 전장으로 복귀합니다.');
}
export function updateMenuReturn(e:Engine,dt:number){const s=e.menuDeception;s.returnAge+=dt;syncMenuField(e);moveMenuPlayer(e,0,0,0);}
export function spawnMenuProjectile(e:Engine){
 const s=e.menuDeception,art=Math.floor(e.random()*menuArt.length),a=menuArt[art],side=Math.floor(e.random()*4),horizontal=side<2;
 const size=art===4?145:art===5?96:a.w*.74,w=size,h=w*a.ratio,margin=50,sp=650+e.stage*65;
 const x=horizontal?(side===0?-1:1)*(e.fieldW/2+w/2+8):(e.random()-.5)*Math.max(1,e.fieldW-w-margin);
 const y=horizontal?(e.random()-.5)*Math.max(1,e.fieldH-h-margin):(side===2?-1:1)*(e.fieldH/2+h/2+8);
 s.projectiles.push({id:++s.serial,art,x,y,w,h,vx:horizontal?(side===0?sp:-sp):0,vy:horizontal?0:side===2?sp:-sp,age:0,warn:.45,life:Math.hypot(e.fieldW,e.fieldH)/sp+2,cleared:false});
}
export function menuProjectileHits(h:MenuProjectile,p:Vec){return h.age>=h.warn&&!h.cleared&&circleRect(p,PLAYER_HIT_RADIUS,{...h,w:h.w*.88,h:h.h*.83});}
export function menuProjectileExited(e:Engine,h:MenuProjectile){
 if(h.age<h.warn)return false;
 return h.vx>0?h.x-h.w/2>e.fieldW/2+8:h.vx<0?h.x+h.w/2< -e.fieldW/2-8:h.vy>0?h.y-h.h/2>e.fieldH/2+8:h.y+h.h/2< -e.fieldH/2-8;
}
export function clearMenuByBomb(e:Engine){
 if(!isMenuDeception(e)||!['attack','drain'].includes(e.menuDeception.phase))return;
 for(const h of e.menuDeception.projectiles)if(h.age>=h.warn&&bombReaches(e,h,Math.hypot(h.w,h.h)/2))h.cleared=true;
 e.menuDeception.wave?.bomb(e.smartBombWorldOrigin,e.smartBombRadius);
}
function update(e:Engine,dt:number){
 const s=e.menuDeception;if(s.phase==='return')return;s.age+=dt;s.phase=s.age<2.5?'throw':s.age<3.25?'reveal':s.age<4.45?'shake':s.age<MENU_ATTACK_START?'scatter':'attack';syncMenuField(e);
 if(s.phase!=='attack')return;
 const elapsed=s.age-MENU_ATTACK_START;
 if(s.variant===1){
  if(elapsed>=s.attackDuration)s.phase='drain';
  s.shotTimer-=dt;while(s.shotTimer<=0&&elapsed<s.attackDuration){spawnMenuProjectile(e);s.shotTimer+=.34-e.stage*.025;}
  for(const h of s.projectiles){const old=h.age;h.age+=dt;const travel=Math.max(0,h.age-h.warn)-Math.max(0,old-h.warn);h.x+=h.vx*travel;h.y+=h.vy*travel;if(menuProjectileHits(h,e.localPlayer()))e.hit('메인 화면 버튼·로고 돌진');}
  s.projectiles=s.projectiles.filter(h=>!h.cleared&&!menuProjectileExited(e,h));
  if(elapsed>=s.attackDuration&&s.projectiles.length===0)e.finish();
 }else{
  s.spawnTimer-=dt;if(s.spawned<20&&s.spawnTimer<=0){
   let p:Vec={x:0,y:0};for(let tries=0;tries<30;tries++){p={x:(e.random()-.5)*(e.fieldW-140),y:(e.random()-.5)*(e.fieldH-180)};if(Math.hypot(p.x-e.localPlayer().x,p.y-e.localPlayer().y)>180)break;}
   s.spawns.push({...p,age:0,duration:.65,done:false});s.spawned++;s.spawnTimer=.22+e.random()*.1;
  }
  for(const p of s.spawns){p.age+=dt;if(!p.done&&p.age>=p.duration){p.done=true;const item=s.wave?.spawn({x:p.x+e.fieldW/2,y:p.y+e.fieldH/2});if(item)s.spawnLog.push(item);}}
  s.spawns=s.spawns.filter(p=>p.age<p.duration+.35);
  const p=e.localPlayer();s.wave?.step(dt,{x:p.x+e.fieldW/2,y:p.y+e.fieldH/2,r:PLAYER_HIT_RADIUS,dead:e.dead>0||e.gameOver});s.wave?.hitShots(e.shots);
  const cleared=(s.wave?.count??0)===0&&(s.wave?.bulletCount??0)===0;
  if(s.spawned===20&&s.spawns.every(p=>p.done)&&(cleared||!e.encounter.enabled&&elapsed>=s.attackDuration))e.finish();
 }
}
/** Remove a jagged section from a real panel edge; the player crosses this opening. */
function clipPanel(c:CanvasRenderingContext2D,w:number,h:number,side:-1|1,y:number,depth:number){
 c.beginPath();c.rect(-w/2,-h/2,w,h);
 if(depth>0){const x=side*w/2;c.moveTo(x,y-74);c.lineTo(x-side*depth*.45,y-62);c.lineTo(x-side*depth*.3,y-44);c.lineTo(x-side*depth,y-27);c.lineTo(x-side*depth*.72,y+2);c.lineTo(x-side*depth*.95,y+28);c.lineTo(x-side*depth*.38,y+46);c.lineTo(x-side*depth*.52,y+62);c.lineTo(x,y+78);c.closePath();}
 c.clip('evenodd');
}
function drawBrokenEdge(c:CanvasRenderingContext2D,x:number,y:number,side:-1|1,alpha=1){
 c.save();c.globalAlpha*=alpha;c.strokeStyle='#e9c9ff';c.shadowColor='#ba79ed';c.shadowBlur=12;c.lineWidth=3;
 for(const sign of [-1,1]){c.beginPath();c.moveTo(x,y+sign*76);c.lineTo(x-side*19,y+sign*64);c.lineTo(x-side*10,y+sign*46);c.lineTo(x-side*35,y+sign*28);c.stroke();c.lineWidth=1.4;c.beginPath();c.moveTo(x-side*19,y+sign*64);c.lineTo(x-side*48,y+sign*86);c.lineTo(x-side*65,y+sign*82);c.stroke();c.lineWidth=3;}
 c.restore();
}
function drawShatter(c:CanvasRenderingContext2D,p:Vec,age:number,menu=false){
 if(age<0||age>1)return;const fade=1-smooth(age),color=menu?'#ffd9a1':'#d9aeff';c.save();c.globalAlpha*=fade;c.strokeStyle=color;c.shadowColor=color;c.shadowBlur=12;c.lineWidth=3;
 c.beginPath();c.ellipse(p.x,p.y,8+56*age,36+75*age,0,0,Math.PI*2);c.stroke();
 for(let i=0;i<28;i++){const a=i*2.399,sp=180+(i%6)*76,x=p.x-Math.abs(Math.cos(a))*sp*age,y=p.y+Math.sin(a)*sp*.65*age+140*age*age;
  c.save();c.translate(x,y);c.rotate(a+age*(i%2?7:-9));c.fillStyle=i%3?menu?'#c7aa74':'#69517d':color;c.strokeStyle=color;c.lineWidth=.8;const size=4+i%5;c.beginPath();c.moveTo(-size,-size*.6);c.lineTo(size*.8,-size*.8);c.lineTo(size,size*.45);c.lineTo(-size*.5,size);c.closePath();c.fill();c.stroke();c.restore();}
 c.restore();
}
export function drawMenuScene(e:Engine,c:CanvasRenderingContext2D,player:(p:Vec)=>void,arena:()=>void){
 const s=e.menuDeception,v=e.gridSize(),returning=s.phase==='return',ra=s.returnAge;
 c.save();c.translate(e.canvas.width/2,e.canvas.height/2);
 const frame=menuCinematic(e),entry=frame.menuBreach,arenaX=returning?arenaExitX(v.w)*(1-smooth((ra-.55)/1.4)):frame.arena.x;
 const menuX=returning?-v.w*1.2*smooth((ra-.15)/1.5):frame.menu.x;
 const impactAge=Math.min(Math.abs(s.age-ARENA_BREACH_TIME),Math.abs(s.age-entry.time));
 if(!returning&&s.age>ARENA_BREACH_TIME&&impactAge<.16){const amp=5*(1-impactAge/.16);c.translate(Math.sin(s.age*97)*amp,Math.cos(s.age*111)*amp*.65);}
 // Each scene is a rigid, full-size plane. Only its horizontal position changes.
 const menuVisible=returning||frame.menu.visible;
 if(menuVisible){
  c.save();c.translate(menuX,0);const gap=!returning&&s.age>=entry.time?26*(1-smooth((s.age-entry.time-.2)/.7)):0;
  clipPanel(c,v.w,v.h,1,entry.y,gap);drawMenuBackground(c,v.w,v.h,s.background);
  if(!returning&&!['attack','drain'].includes(s.phase))for(const [i,a] of menuLayout(v.w,v.h).entries()){
   let x=a.x,y=a.y;const shake=s.phase==='shake'?smooth((s.age-3.25)/1.2):0;x+=Math.sin(s.age*57+i*4)*9*shake;y+=Math.cos(s.age*71+i)*6*shake;
   if(s.phase==='scatter'){const k=Math.pow(clamp((s.age-4.45)/.95,0,1),2);if(i%2)x+=(i%4<2?-1:1)*(v.w+a.w)*k;else y+=(i%4<2?-1:1)*(v.h+a.h)*k;}
   c.save();c.shadowColor='#00133466';c.shadowBlur=12;drawUiImage(c,a.path,x,y,a.w,a.h);c.restore();
  }
  c.restore();
  if(!returning&&s.age<MENU_LAND_TIME){const alpha=1-smooth((s.age-entry.time-.2)/.75);c.save();c.globalAlpha=alpha;c.translate(menuX,0);clipPanel(c,v.w,v.h,1,entry.y,gap);c.strokeStyle='#ffdeb5';c.shadowColor='#ffc47b';c.shadowBlur=16;c.lineWidth=5;c.strokeRect(-v.w/2,-v.h/2,v.w,v.h);c.restore();if(gap>0)drawBrokenEdge(c,menuX+v.w/2,entry.y,1,alpha);}
 }
 if(arenaX<(v.w+BASE_FIELD_W)/2+10){
  c.save();c.translate(arenaX,0);clipPanel(c,BASE_FIELD_W,BASE_FIELD_H,-1,ARENA_BREACH_Y,!returning&&s.age>=ARENA_BREACH_TIME?30:0);arena();c.restore();
  if(!returning&&s.age>=ARENA_BREACH_TIME)drawBrokenEdge(c,arenaX-BASE_FIELD_W/2,ARENA_BREACH_Y,-1);
 }
 if(!returning){drawShatter(c,frame.arenaBreach,s.age-ARENA_BREACH_TIME);drawShatter(c,entry,s.age-entry.time,true);}
 c.save();
 for(const h of s.projectiles){c.save();if(returning)c.globalAlpha*=1-smooth(ra/.5);if(h.age<h.warn){
   const horizontal=!!h.vx,sign=Math.sign(h.vx||h.vy);c.strokeStyle='#ff583d';c.fillStyle='#ffddbf';c.lineWidth=3;c.setLineDash([10,8]);c.globalAlpha*=.35+.5*h.age/h.warn;c.beginPath();if(horizontal){c.moveTo(-e.fieldW/2,h.y);c.lineTo(e.fieldW/2,h.y);}else{c.moveTo(h.x,-e.fieldH/2);c.lineTo(h.x,e.fieldH/2);}c.stroke();c.setLineDash([]);
   const x=horizontal?-sign*(e.fieldW/2-20):h.x,y=horizontal?h.y:-sign*(e.fieldH/2-20);c.translate(x,y);c.rotate(horizontal?sign>0?0:Math.PI:sign>0?Math.PI/2:-Math.PI/2);c.beginPath();c.moveTo(15,0);c.lineTo(-10,-12);c.lineTo(-10,12);c.closePath();c.fill();
  }else{const a=menuArt[h.art];c.shadowColor='#00132c';c.shadowBlur=12;drawUiImage(c,a.path,h.x,h.y,h.w,h.h);}c.restore();}
 if(s.wave&&s.phase==='attack'){const cv=s.wave.render();c.drawImage(cv,-v.w/2,-v.h/2,v.w,v.h);}
 for(const p of s.spawns){if(p.done)continue;const k=p.age/p.duration;c.save();c.globalAlpha=.25+k*.6;c.strokeStyle='#f9b866';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,12+46*(1-k),0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(p.x-17,p.y);c.lineTo(p.x+17,p.y);c.moveTo(p.x,p.y-17);c.lineTo(p.x,p.y+17);c.stroke();c.restore();}
 c.restore();
 if(menuInputLocked(e)&&s.phase!=='return'&&s.age>.65&&s.age<MENU_LAND_TIME){const p=e.localPlayer(),k=1-smooth((s.age-2.5)/.75);c.save();c.strokeStyle='#e4b8ff';c.lineWidth=2;c.globalAlpha=.7*k;for(let i=0;i<14;i++){const y=p.y+(i-7)*14;c.beginPath();c.moveTo(p.x+40+(i%3)*15,y);c.lineTo(p.x+180+(i%5)*45,y);c.stroke();}c.restore();}
 for(const shot of e.shots)drawNativeShot(e,c,shot);
 drawBombEffects(e,c);
 c.save();c.translate(-CANVAS_CX,-CANVAS_CY);if(e.dead<=0&&!e.gameOver)player(e.player);c.restore();c.restore();
}
export const menuDeceptionPatterns:Pattern[]=([1,2] as const).map(variant=>({
 id:variant===1?'menu-deception':'menu-deception-mobs',name:variant===1?'메인 화면 사기':'메인 화면 사기 2 · CH3 미리보기',english:variant===1?'FALSE MAIN MENU':'FALSE MENU / ORIGINAL WAVE',category:'special',orientation:0,duration:Infinity,
 subtitle:variant===1?'메인 화면의 버튼과 로고가 수평·수직으로 돌진합니다.':'원본 챕터 3 일반 몬스터 20마리. 챕터 1·2는 원본 웨이브 소스 추가 후 연결합니다.',
 stages:variant===1?['7초 버튼·로고 돌진','8초 사방 교차','9초 연속 돌진','10초 메뉴 폭주']:['원본 일반 몬스터 20마리','무작위 출현','원본 웨이브 동작','사방 조향 전투'],
 enter:e=>enterMenuDeception(e,variant),update,render:()=>{},exit:e=>{e.menuDeception.wave?.clear();e.menuDeception=freshMenuDeception();e.playerFacing=0;}
}));
