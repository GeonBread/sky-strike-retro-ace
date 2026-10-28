import {supportFade} from './continuity';
import {updateFieldTricks,drawFieldTricks} from './fieldTricks';
import {updateRecycle,drawRecycle} from './bulletRecycle';
import {updateSpaceCut,drawSpaceCut} from './spaceCut';
import type { Engine, Entity, Pattern, Vec, Laser } from './engine';
import { clamp, smooth, distance, segmentDistance, circleRect, CANVAS_CX, CANVAS_CY, CANVAS_W, CANVAS_H, PLAYER_HIT_RADIUS } from './core';
import { freshSword, updateSword, drawSword } from './sword';
import { freshExile, enterExile, updateExile } from './exile';
import { makeTimeZones, scaleAt, splitTimePath, pathDistanceForTime, TimeZone } from './time';
export { moveExile, exileOverlay } from './exile';
export type Category='normal'|'special'|'support';
export const categoryNames:Record<Category,string>={normal:'일반 공격',special:'특수 공격',support:'보조 공격'};
export const supportOptions=[{id:'portals',name:'한 쌍의 오염 포탈'},{id:'magnet',name:'오염 자력띠'},{id:'recycle',name:'회피한 탄 재활용'},{id:'cut',name:'공간 절단'},{id:'wall',name:'세로 → 가로 전환'},{id:'rotation',name:'전장 다중 회전'},{id:'shape',name:'전장 크기 변형'},{id:'miss',name:'미스탄 누적 폭격'},{id:'erosion',name:'파괴 가능한 오염벽'},{id:'time',name:'공간별 시간 흐름'},{id:'clones',name:'3분신 공동 생존'}];
export type Zone=TimeZone;
export type ErosionWall={y:number;vy:number;cols:number;rows:number;cellW:number;cellH:number;cells:number[];age:number};
export type Bolt={a:Vec;b:Vec;target:Vec;points:Vec[];branches:Vec[][];age:number;warn:number;life:number;fired:boolean;parts?:{a:Vec;b:Vec;age:number}[]};
export type { Sword } from './sword';
import type { Exile } from './exile';
export type { Exile } from './exile';
export type AdvancedState={zones:Zone[];walls:ErosionWall[];wallTimer:number;bolts:Bolt[];lightTimer:number;lightCount:number;lightTotal:number;lightSecond:boolean;lightTarget:Vec;lightAngle:number;sword:import('./sword').Sword;exile:Exile;rotationCount:number;destroyedSeeds:number;flowersFired:number};
export function freshAdvanced():AdvancedState{return {zones:[],walls:[],wallTimer:1,bolts:[],lightTimer:.4,lightCount:0,lightTotal:5,lightSecond:false,lightTarget:{x:0,y:0},lightAngle:0,sword:freshSword(),exile:freshExile(),rotationCount:0,destroyedSeeds:0,flowersFired:0};}
export function supports(e:Engine):Set<string>{return e.pattern.category==='support'?new Set([...e.selectedSupports,e.pattern.id]):e.pattern.category==='normal'?e.selectedSupports:new Set();}
export function configureZones(e:Engine){
 e.advanced.zones=supports(e).has('time')?makeTimeZones(e.fieldW,e.fieldH,e.timeFieldFull,e.advanced.zones):[];
}
export function timeScale(e:Engine,p:Vec){return e.phase==='active'?scaleAt(e.advanced.zones,p):1;}
export function updateSupports(e:Engine,dt:number){
 updateFieldTricks(e,dt);updateRecycle(e,dt);updateSpaceCut(e,dt);const ids=supports(e);
 if(e.emitting&&ids.has('rotation')){const n=Math.floor(e.t/5);if(n>e.advanced.rotationCount){e.advanced.rotationCount=n;e.rotateTo((e.orientation+1)%4,true);}}
 if(e.emitting&&ids.has('erosion')){e.advanced.wallTimer-=dt*timeScale(e,e.boss);if(e.advanced.wallTimer<=0){e.advanced.wallTimer=7.8-e.stage*.45;const cols=Math.ceil(e.fieldW/28),rows=4;e.advanced.walls.push({y:-e.fieldH/2-65,vy:48+e.stage*6,cols,rows,cellW:e.fieldW/cols,cellH:28,cells:Array(cols*rows).fill(1),age:0});e.log('오염벽 진입 · 사격으로 통로를 파세요');}}
 for(const wall of e.advanced.walls){const p={x:0,y:wall.y};wall.age+=e.motionTime(p,dt,0,wall.vy);wall.y=p.y;}
 const p=e.localPlayer();if(e.advanced.walls.some(w=>wallHit(e,w,p,WALL_BODY_RADIUS))){e.hit('침식 오염벽');e.player=e.screen(pushOutWalls(e,p));}
 e.advanced.walls=e.advanced.walls.filter(w=>w.y-w.rows*w.cellH/2<e.fieldH/2+80);
}
function wallCell(e:Engine,w:ErosionWall,i:number){return{x:-e.fieldW/2+(i%w.cols+.5)*w.cellW,y:w.y+(Math.floor(i/w.cols)+.5-w.rows/2)*w.cellH,w:w.cellW,h:w.cellH};}
export function wallHit(e:Engine,w:ErosionWall,p:Vec,r:number){
 if(Math.abs(p.y-w.y)>w.rows*w.cellH/2+r)return false;
 const c0=Math.max(0,Math.floor((p.x-r+e.fieldW/2)/w.cellW)),c1=Math.min(w.cols-1,Math.floor((p.x+r+e.fieldW/2)/w.cellW));
 const r0=Math.max(0,Math.floor((p.y-r-w.y)/w.cellH+w.rows/2)),r1=Math.min(w.rows-1,Math.floor((p.y+r-w.y)/w.cellH+w.rows/2));
 for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++){const i=row*w.cols+col;if(w.cells[i]>.08&&circleRect(p,r,wallCell(e,w,i)))return true;}return false;
}
export const WALL_BODY_RADIUS=18;
const obstructed=(e:Engine,p:Vec)=>e.advanced.walls.some(w=>wallHit(e,w,p,WALL_BODY_RADIUS));
/** Resolve a moving wall by the nearest clear position, including its entire thickness. */
function pushOutWalls(e:Engine,p:Vec):Vec{
 const candidates:Vec[]=[];
 for(const w of e.advanced.walls)for(let i=0;i<w.cells.length;i++){if(w.cells[i]<=.08)continue;const r=wallCell(e,w,i),m=WALL_BODY_RADIUS+.1;
  candidates.push({x:p.x,y:r.y-r.h/2-m},{x:p.x,y:r.y+r.h/2+m},{x:r.x-r.w/2-m,y:p.y},{x:r.x+r.w/2+m,y:p.y});}
 return candidates.sort((a,b)=>distance(p,a)-distance(p,b)).find(v=>!obstructed(e,v))??p;
}
/** Small swept steps prevent tunnelling; separate axes retain sliding along the wall. */
export function constrainWalls(e:Engine,before:Vec,desired:Vec):Vec{
 if(!e.advanced.walls.length)return desired;let p={...before};const n=Math.max(1,Math.ceil(distance(before,desired)/6)),dx=(desired.x-before.x)/n,dy=(desired.y-before.y)/n;
 for(let i=0;i<n;i++){const next={x:p.x+dx,y:p.y+dy};if(!obstructed(e,next)){p=next;continue;}const x={x:p.x+dx,y:p.y},y={x:p.x,y:p.y+dy};if(!obstructed(e,x))p=x;if(!obstructed(e,{x:p.x,y:y.y}))p.y=y.y;}
 return p;
}
export function attackDestructibles(e:Engine,s:Vec,prev:Vec):boolean{
 for(const h of e.hazards){if(h.kind!=='seed'||h.fired||h.age<h.warn||h.age>=h.warn+3)continue;if(h.x>=Math.min(prev.x,s.x)-h.r-6&&h.x<=Math.max(prev.x,s.x)+h.r+6&&h.y>=Math.min(prev.y,s.y)-h.r-6&&h.y<=Math.max(prev.y,s.y)+h.r+6&&segmentDistance(h,prev,s)<h.r+6){h.hp=(h.hp??2)-1;e.fx(h,'ring',20,'#8effdf',.2);if(h.hp<=0){h.life=0;h.age=100;h.fired=true;e.advanced.destroyedSeeds++;e.fx(h,'burst',48,'#a1ffe9',.55);}return true;}}
 for(const w of e.advanced.walls){const radius=Math.hypot(w.cellW,w.cellH)/2+4;if(Math.min(s.y,prev.y)-radius>w.y+w.rows*w.cellH/2||Math.max(s.y,prev.y)+radius<w.y-w.rows*w.cellH/2)continue;
  const c0=Math.max(0,Math.floor((Math.min(s.x,prev.x)-radius+e.fieldW/2)/w.cellW)),c1=Math.min(w.cols-1,Math.floor((Math.max(s.x,prev.x)+radius+e.fieldW/2)/w.cellW));let target:{hp:number;p:Vec}|undefined,nearest=Infinity;
  for(let row=0;row<w.rows;row++)for(let col=c0;col<=c1;col++){const i=row*w.cols+col;if(w.cells[i]<=.08)continue;const p=wallCell(e,w,i),d=distance(p,prev);if(d<nearest&&segmentDistance(p,prev,s)<radius){target={hp:w.cells[i],p};nearest=d;}}
if(!target)continue;const impact=target.p;
  for(let i=0;i<w.cells.length;i++){const p=wallCell(e,w,i),d=distance(p,impact);if(d<58)w.cells[i]=Math.max(0,w.cells[i]-.78*(1-d/65));}e.fx(impact,'burst',34,'#c78fff',.28);return true;}
 return false;
}
export function updateSeed(e:Engine,h:Entity,dt:number){
 if(h.life<=0)return;const growthAge=h.age-h.warn;h.r=9+21*smooth(growthAge/3);if(growthAge>=3){h.fired=true;const n=h.petals??6;h.petalTimer=(h.petalTimer??0)-dt;if(h.petalTimer<=0&&(h.petalIndex??0)<n){const i=h.petalIndex??0,a=(h.rotation??0)+i*Math.PI*2/n,sp=155+e.stage*20;e.add({kind:'petal',x:h.x+Math.cos(a)*30,y:h.y+Math.sin(a)*30,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:11,warn:0,life:8,color:'#df9aff',tag:'오염 꽃잎'});h.petalIndex=i+1;h.petalTimer=.11;e.advanced.flowersFired++;e.fx(h,'ring',38,'#d08aff',.22);}if((h.petalIndex??0)>=n)h.life=0;}
}
function edgeLine(e:Engine,p:Vec,a:number):[Vec,Vec]{const d={x:Math.cos(a),y:Math.sin(a)},ts:number[]=[];for(const x of [-e.fieldW/2,e.fieldW/2])if(Math.abs(d.x)>1e-8){const t=(x-p.x)/d.x;if(Math.abs(p.y+t*d.y)<=e.fieldH/2+.01)ts.push(t);}for(const y of [-e.fieldH/2,e.fieldH/2])if(Math.abs(d.y)>1e-8){const t=(y-p.y)/d.y;if(Math.abs(p.x+t*d.x)<=e.fieldW/2+.01)ts.push(t);}return [{x:p.x+d.x*Math.min(...ts),y:p.y+d.y*Math.min(...ts)},{x:p.x+d.x*Math.max(...ts),y:p.y+d.y*Math.max(...ts)}];}
function spawnBolt(e:Engine,p:Vec,a:number){const [start,end]=edgeLine(e,p,a),len=distance(start,end),n=Math.ceil(len/24),dx=(end.x-start.x)/len,dy=(end.y-start.y)/len,points:Vec[]=[];for(let i=0;i<=n;i++){const k=i/n,j=i===0||i===n?0:(e.random()-.5)*18;points.push({x:start.x+(end.x-start.x)*k-dy*j,y:start.y+(end.y-start.y)*k+dx*j});}const branches:Vec[][]=[];for(let i=3;i<points.length-3;i+=7){const root=points[i];for(const side of [-1,1]){const reach=42+e.random()*45;branches.push([root,{x:root.x-dy*side*reach*.55+dx*13,y:root.y+dx*side*reach*.55+dy*13},{x:root.x-dy*side*reach+dx*26,y:root.y+dx*side*reach+dy*26}]);}}e.advanced.bolts.push({a:start,b:end,target:{...p},points,branches,parts:splitTimePath(points,e.advanced.zones).map(p=>({a:p.a,b:p.b,age:0})),age:0,warn:.58,life:.18,fired:false});}
export function updateLightning(e:Engine,dt:number){const s=e.advanced;s.lightTimer-=dt*timeScale(e,e.boss);if(s.lightTimer<=0&&(e.emitting||s.lightSecond)){if(!s.lightSecond){if(s.lightCount>=s.lightTotal){s.lightCount=0;s.lightTotal=5+e.stage;}if(s.lightCount===0)e.log(`오염 낙뢰 · ${s.lightTotal}쌍 연속 공격`);s.lightTarget=e.localPlayer();s.lightAngle=[0,Math.PI/2,Math.PI/4,-Math.PI/4][s.lightCount%4]+(e.random()-.5)*.18;spawnBolt(e,s.lightTarget,s.lightAngle-.09);s.lightSecond=true;s.lightTimer=.16;}else{spawnBolt(e,s.lightTarget,s.lightAngle+.09);s.lightSecond=false;s.lightCount++;s.lightTimer=.68-e.stage*.045;}}
 for(const b of s.bolts){b.age+=dt*timeScale(e,b.target);const parts=b.parts??b.points.slice(1).map((v,i)=>({a:b.points[i],b:v,age:b.age}));
  for(const part of parts){if(b.parts)part.age+=dt*timeScale(e,{x:(part.a.x+part.b.x)/2,y:(part.a.y+part.b.y)/2});if(part.age>=b.warn&&part.age<b.warn+b.life){if(!b.fired){b.fired=true;e.shake=Math.max(e.shake,.06);}for(const p of e.bodies())if(segmentDistance(e.local(p),part.a,part.b)<10)e.hit('오염 낙뢰',p);}}
 }
 s.bolts=s.bolts.filter(b=>b.parts?b.parts.some(p=>p.age<b.warn+b.life):b.age<b.warn+b.life);
}

export function laserSegments(path:Vec[],age:number,zones:Zone[]=[],timing?:{head:number;tail:number}):[Vec,Vec][]{const head=pathDistanceForTime(path,Math.max(0,timing?.head??age-2.4)*5200,zones),tail=pathDistanceForTime(path,Math.max(0,timing?.tail??age-3.65)*5200,zones);const result:[Vec,Vec][]=[];let offset=0;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],len=distance(a,b),lo=clamp((tail-offset)/len,0,1),hi=clamp((head-offset)/len,0,1);if(hi>lo)result.push([{x:a.x+(b.x-a.x)*lo,y:a.y+(b.y-a.y)*lo},{x:a.x+(b.x-a.x)*hi,y:a.y+(b.y-a.y)*hi}]);offset+=len;}return result;}
export function activeLaserSegments(e:Engine,l:Laser,path:Vec[]){return laserSegments(path,l.age,e.advanced.zones,l.headTime===undefined?undefined:{head:l.headTime,tail:l.tailTime??0});}
const simple=(id:string,name:string,english:string,subtitle:string,category:Category,update:Pattern['update'],render:Pattern['render']=()=>{},enter:Pattern['enter']=()=>{},duration=30):Pattern=>({id,name,english,subtitle,category,orientation:0,stages:['패턴 학습','연속 공격','복합 공격','숙련 공격'],duration,update,render,enter,exit:()=>{}});
export const advancedPatterns:Pattern[]=[
 simple('flowers','오염 꽃 개화','CORRUPTION BLOOM','씨앗을 사격으로 제거하세요. 3초 뒤 6~8개 꽃잎이 순서대로 발사됩니다.','normal',e=>{if(!e.emitting||e.beat>0)return;e.beat=.55-e.stage*.07;const p={x:(e.random()-.5)*(e.fieldW-130),y:-e.fieldH/2+110+e.random()*(e.fieldH-220)};e.add({...e.boss,seedFrom:{...e.boss},seedTarget:p,kind:'seed',r:9,warn:.25,life:4,hp:2,petals:6+Math.floor(e.random()*3),rotation:e.random()*Math.PI*2,petalIndex:0,petalTimer:0,color:'#b77eff',tag:'오염 꽃 씨앗'});e.fx(p,'ring',23,'#d1a4ff',.35);}),
 simple('lightning','오염 낙뢰','CORRUPTION THUNDER','현재 위치를 관통하는 두 낙뢰의 예고선을 피하세요. 5~8쌍이 연속됩니다.','normal',updateLightning,()=>{},e=>{e.advanced.lightTotal=5+e.stage;}),
 simple('hp-sword','보스 HP 검술','HEALTH BAR BLADE','HP바 자체가 움직입니다. 전체 타격 영역 예고를 보고 여섯 종류의 검술을 피하세요.','special',updateSword),
 simple('exile','게임 화면 밖 추방','BEYOND THE SCREEN','화면을 뚫고 날아간 뒤 방향키로 유영하며 포탈을 찾으세요. SPACE로 사격합니다.','special',updateExile,()=>{},enterExile,Infinity),
 simple('erosion','파괴 가능한 오염벽','EROSION WALL','사격 위치가 점점 파입니다. 통과할 통로를 직접 만드세요.','support',()=>{}),
 simple('time','공간별 시간 흐름','LOCAL TIME FIELDS','각 사각형의 시간 배율이 이동·탄환·성장·이펙트에 동일하게 적용됩니다.','support',()=>{}),
 simple('shape','전장 크기 변형','MORPHING ARENA','예고된 테두리를 보고 길쭉·납작·전체화면·가로 확장·초소형 전장에 대응하세요.','support',()=>{},()=>{},()=>{},34)
];
export function drawAdvanced(e:Engine,c:CanvasRenderingContext2D){
 c.save();c.globalAlpha*=supportFade(e);drawFieldTricks(e,c);c.restore();drawSpaceCut(e,c);drawRecycle(e,c);
 c.save();c.globalAlpha*=supportFade(e);
 for(const z of e.advanced.zones){c.save();c.fillStyle=z.color+'12';c.fillRect(z.x-z.w/2,z.y-z.h/2,z.w,z.h);c.strokeStyle=z.color+'88';c.lineWidth=2;c.strokeRect(z.x-z.w/2,z.y-z.h/2,z.w,z.h);c.fillStyle='#080b17c9';c.fillRect(z.x-z.w/2+14,z.y-z.h/2+126,82,36);c.fillStyle=z.color;c.font='bold 22px "Noto Sans KR"';c.textAlign='left';c.fillText(z.scale.toFixed(1)+'×',z.x-z.w/2+28,z.y-z.h/2+152);const a=z.clock;for(let i=0;i<5;i++){const y=z.y-z.h/2+150+((i*151+a*35)%(Math.max(1,z.h-180)));c.globalAlpha=.18;c.beginPath();c.arc(z.x-35,y,5,0,Math.PI*2);c.fill();}c.restore();}
 c.restore();
 for(const wall of e.advanced.walls)drawCachedWall(e,c,wall);

 for(const b of e.advanced.bolts){const parts=b.parts??b.points.slice(1).map((p,i)=>({a:b.points[i],b:p,age:b.age}));
  const draw=(points:Vec[],age:number,branch=false)=>{if(age>=b.warn+b.life)return;const active=age>=b.warn,k=clamp(age/b.warn,0,1);if(branch&&!active)return;c.save();c.strokeStyle=active?'#c77bff':'#cb8fff';c.globalAlpha=active?clamp(1-(age-b.warn)/b.life,.15,1):.2+k*.5;c.lineWidth=branch?2:active?18:3;if(!active)c.setLineDash([12,10]);c.shadowColor='#b355ff';c.shadowBlur=active?25:0;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();if(active&&!branch){c.lineWidth=4;c.strokeStyle='#fff0ff';c.stroke();}c.restore();};
  for(const part of parts)draw([part.a,part.b],part.age);
  for(const branch of b.branches){const part=parts.reduce((near,p)=>segmentDistance(branch[0],p.a,p.b)<segmentDistance(branch[0],near.a,near.b)?p:near,parts[0]);if(part)draw(branch,part.age,true);}
 }
 if(e.pattern.id==='hp-sword'&&e.phase==='active')drawSword(e,c);
}
function drawSeedRaw(c:CanvasRenderingContext2D,h:Entity){if(h.age<h.warn){c.save();c.fillStyle='#d09dff';c.shadowColor='#bc76ff';c.shadowBlur=0;c.beginPath();c.arc(h.x,h.y,7,0,Math.PI*2);c.fill();if(h.seedFrom){c.strokeStyle='#a678ec66';c.lineWidth=3;c.beginPath();c.moveTo(h.x,h.y);c.lineTo(h.x+(h.seedFrom.x-h.x)*.25,h.y+(h.seedFrom.y-h.y)*.25);c.stroke();}c.restore();return;}const growth=smooth((h.age-h.warn)/3),n=h.petals??6;c.save();c.translate(h.x,h.y);c.shadowColor='#c47fff';c.shadowBlur=0;for(let i=h.petalIndex??0;i<n;i++){const a=(h.rotation??0)+i*Math.PI*2/n;c.save();c.rotate(a);c.fillStyle=i%2?'#c393f1':'#8050b3';c.strokeStyle='#edcaff';c.lineWidth=1.4;c.beginPath();c.ellipse(13*growth+6,0,6+17*growth,4+8*growth,0,0,Math.PI*2);c.fill();c.stroke();c.restore();}c.fillStyle='#4e1a77';c.strokeStyle='#f7ccff';c.lineWidth=2;c.beginPath();c.arc(0,0,7+7*growth,0,Math.PI*2);c.fill();c.stroke();if(!h.fired){c.strokeStyle='#a4ffdc';c.lineWidth=2;c.beginPath();c.arc(0,0,40,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp((h.age-h.warn)/3,0,1));c.stroke();}c.restore();}

export function drawSeed(c:CanvasRenderingContext2D,h:Entity){drawSeedRaw(c,h);}

const wallArt=new WeakMap<ErosionWall,{key:string;fills:Path2D[];outline:Path2D}>();
function drawCachedWall(e:Engine,c:CanvasRenderingContext2D,w:ErosionWall){
 const key=e.fieldW+':'+w.cellW+':'+w.cellH+':'+w.cols+':'+w.cells.join(',');let art=wallArt.get(w);
 if(!art||art.key!==key){const fills=[new Path2D(),new Path2D(),new Path2D()],outline=new Path2D();
  for(let i=0;i<w.cells.length;i++){const hp=w.cells[i];if(hp<=.08)continue;const x=-e.fieldW/2+(i%w.cols)*w.cellW,y=(Math.floor(i/w.cols)-w.rows/2)*w.cellH,r=(1-hp)*Math.min(w.cellW,w.cellH)*.42,p=new Path2D();
   p.moveTo(x+r,y+1);p.lineTo(x+w.cellW-r,y+1);p.lineTo(x+w.cellW-1,y+r);p.lineTo(x+w.cellW-1,y+w.cellH-r);p.lineTo(x+w.cellW-r,y+w.cellH-1);p.lineTo(x+r,y+w.cellH-1);p.lineTo(x+1,y+w.cellH-r);p.lineTo(x+1,y+r);p.closePath();fills[hp>.8?0:hp>.4?1:2].addPath(p);outline.addPath(p);
  }art={key,fills,outline};wallArt.set(w,art);
 }
 c.save();c.translate(0,w.y);c.shadowBlur=0;for(let i=0;i<3;i++){c.fillStyle=['#482369dd','#754098dd','#be82db88'][i];c.fill(art.fills[i]);}c.strokeStyle='#d098ed88';c.lineWidth=1.2;c.stroke(art.outline);c.restore();
}
