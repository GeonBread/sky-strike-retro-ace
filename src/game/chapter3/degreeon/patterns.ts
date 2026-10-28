import {tileStreamPattern} from './tileStream';
import {fieldTrickPatterns} from './fieldTricks';
import {extraNormalPatterns} from './extraNormals';
import {unseenPatterns} from './unseenSpecials';
import {graduationStampPattern} from './graduationStamp';
import {pathFoldPattern} from './pathFold';
import {recyclePattern} from './bulletRecycle';
import {spaceCutPattern} from './spaceCut';
import {menuDeceptionPatterns} from './menuDeception';
import { normalBulletPatterns } from './normalBullets';
import { finalStandPattern } from './finalStand';
import { corridorPatterns } from './waveLaser';
import { pauseStormPattern } from './pauseStorm';
import { advancedPatterns, laserSegments, activeLaserSegments } from './advanced';
import {pathTimeCost} from './time';
import {background} from './resources';
import type { Engine, Pattern, Entity, Vec } from './engine';
import { reflectedPath, segmentDistance, distance, clamp, clipPolygon, polygonCentroid, polygonArea, pointInPolygon, dot, smooth, CANVAS_W, CANVAS_H, linkEndpoints } from './core';
const purple='#b795ff', pink='#ec89d8', mint='#7ef0dc';
const noop=()=>{};
const make=(id:string,name:string,english:string,subtitle:string,orientation:number,stages:string[],duration:number,update:Pattern['update'],render:Pattern['render']=noop,enter:Pattern['enter']=noop):Pattern=>({id,name,english,subtitle,category: ['wall','rotation','miss','clones'].includes(id)?'support':['rhythm','flight','cut','split8','fluid'].includes(id)?'special':'normal',orientation,stages,duration,update,render,enter,exit:noop});
function aim(e:Engine,p:Vec,target:Vec,speed=140,warn=1.1){const a=Math.atan2(target.y-p.y,target.x-p.x);e.add({...p,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,warn,r:8,tag:'디그리온 조준탄'});}
function rocket(e:Engine,side:number,position:number){
  const vertical=side%2===0;const p=side===0?{x:position,y:-e.fieldH/2-38}:side===2?{x:position,y:e.fieldH/2+38}:side===1?{x:e.fieldW/2+38,y:position}:{x:-e.fieldW/2-38,y:position};
  const speed=360+e.stage*35;const size=32+e.random()*8;
  e.add({...p,kind:'rocket',vx:side===1?-speed:side===3?speed:0,vy:side===0?speed:side===2?-speed:0,w:vertical?size:84,h:vertical?84:size,warn:1.25,life:5,color:e.random()>.5?purple:'#d68bea',tag:'외곽 오염 로켓'});
}
export { linkEndpoints } from './core';
const rectPoly=(e:Engine):Vec[]=>[{x:-e.fieldW/2,y:-e.fieldH/2},{x:e.fieldW/2,y:-e.fieldH/2},{x:e.fieldW/2,y:e.fieldH/2},{x:-e.fieldW/2,y:e.fieldH/2}];
function tileCenter(e:Engine,index:number):Vec{
 return {x:-e.fieldW/2+(index%e.tileCols+.5)*e.fieldW/e.tileCols,
 y:-e.fieldH/2+(Math.floor(index/e.tileCols)+.5)*e.fieldH/e.tileRows};
}
function startTileWave(e:Engine){
 const total=e.tileCols*e.tileRows,ratio=[.2,.35,.5,.65,.78][e.tileRound%5];
 const count=Math.min(total-1,Math.max(1,Math.round(total*ratio))),current=Math.max(0,e.tileIndex(e.localPlayer()));
 // Keep a neighboring refuge reachable; randomize other unsafe cells each round.
 const neighbors=[current-1,current+1,current-e.tileCols,current+e.tileCols].filter(i=>i>=0&&i<total&&Math.abs(i%e.tileCols-current%e.tileCols)+Math.abs(Math.floor(i/e.tileCols)-Math.floor(current/e.tileCols))===1);
 const refuge=neighbors[e.tileRound%neighbors.length]??current;
 const candidates=Array.from({length:total},(_,i)=>i).filter(i=>i!==refuge);
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(e.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 e.tileDanger=candidates.slice(0,count);e.tileSafe=Array.from({length:total},(_,i)=>i).filter(i=>!e.tileDanger.includes(i));
 e.tileState='warning';e.tileTimer=2.3-e.stage*.18;
 e.log(`전장 분할 경고 · 위험 ${count} / 안전 ${total-count}`);
}
function drawTilePattern(e:Engine,c:CanvasRenderingContext2D){
 const cw=e.fieldW/e.tileCols,ch=e.fieldH/e.tileRows,gap=5;
 const urgent=e.tileTimer<.65,pulse=.17+.19*clamp(1-e.tileTimer/2.3,0,1);
 c.save();
 for(let i=0;i<e.tileCols*e.tileRows;i++){
  const p=tileCenter(e,i),x=p.x-cw/2+gap/2,y=p.y-ch/2+gap/2,w=cw-gap,h=ch-gap,danger=e.tileDanger.includes(i),safe=e.tileSafe.includes(i);
  c.globalAlpha=1;c.lineWidth=2;c.strokeStyle='#b69bd888';c.strokeRect(x,y,w,h);
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  if(e.tileState==='warning'&&danger){
   c.fillStyle=`rgba(163,50,242,${pulse})`;c.fillRect(x,y,w,h);
   c.strokeStyle=urgent?'#fff0ff':'#df93ff';c.lineWidth=urgent?7:3;c.strokeRect(x+3,y+3,w-6,h-6);
   c.globalAlpha=.45;c.lineWidth=2;
   for(let z=-h;z<w;z+=30){c.beginPath();c.moveTo(x+z,y);c.lineTo(x+z+h,y+h);c.stroke();}
   c.globalAlpha=.8;c.strokeStyle='#edbcff';c.lineWidth=4;const q=clamp(e.tileTimer/(2.3-e.stage*.18),0,1);c.strokeRect(p.x-w*q/2,p.y-h*q/2,w*q,h*q);c.globalAlpha=1;
  }
  if((e.tileState==='warning'||e.tileState==='blast')&&safe){
   c.fillStyle='#69ffce22';c.fillRect(x,y,w,h);c.strokeStyle='#81ffe0';c.lineWidth=3;c.strokeRect(x+4,y+4,w-8,h-8);
  }
  if(e.tileState==='blast'&&danger){
   const k=clamp(1-e.tileTimer/.9,0,1),fade=1-k;
   c.fillStyle=`rgba(130,35,215,${.65*fade})`;c.fillRect(x,y,w,h);
   const glow=c.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(cw,ch)*.8);
   glow.addColorStop(0,`rgba(255,245,255,${fade})`);glow.addColorStop(.25,`rgba(229,123,255,${fade})`);glow.addColorStop(1,'#7312b900');c.fillStyle=glow;c.fillRect(x,y,w,h);
   c.shadowColor='#e09bff';c.shadowBlur=22;
   for(let ring=0;ring<3;ring++){const q=clamp(k*1.7-ring*.16,0,1);c.globalAlpha=(1-q)*fade;c.strokeStyle=ring?'#c77bff':'#fff';c.lineWidth=9-ring*2;c.beginPath();c.ellipse(p.x,p.y,Math.max(1,q*cw*.8),Math.max(1,q*ch*.8),0,0,Math.PI*2);c.stroke();}
   for(let j=0;j<22;j++){const angle=j*2.399+i,dist=(25+(j%5)*15)*k*3;c.save();c.translate(p.x+Math.cos(angle)*dist,p.y+Math.sin(angle)*dist);c.rotate(angle+k*5);c.globalAlpha=fade;c.fillStyle=j%3?'#dd8aff':'#fff';c.fillRect(-3,-8,6,10+(j%4)*5);c.restore();}
   c.globalAlpha=fade*.7;c.fillStyle='#edc1ff';c.fillRect(p.x-8*(1-k),y,16*(1-k),h);
  }
  c.restore();
 }
 c.restore();
}
function fluidPoly(e:Engine){const g=e.gravityLocal(),surface=e.fluidSurface(),point={x:g.x*surface,y:g.y*surface};return clipPolygon(rectPoly(e),point,g,true);}
function drawFluid(e:Engine,c:CanvasRenderingContext2D){
  const g=e.gravityLocal(),surface=e.fluidSurface(),fluid=fluidPoly(e),t={x:-g.y,y:g.x};if(fluid.length<3)return;c.save();c.beginPath();fluid.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip();
  const grad=c.createLinearGradient(-g.x*330,-g.y*330,g.x*330,g.y*330);grad.addColorStop(0,'#8b4bd255');grad.addColorStop(.45,'#6d35a9aa');grad.addColorStop(1,'#3e1a72e8');c.fillStyle=grad;c.fillRect(-e.fieldW/2,-e.fieldH/2,e.fieldW,e.fieldH);
  c.strokeStyle='#d0a4ff22';c.lineWidth=2;for(let i=0;i<18;i++){const base=-360+i*44+(e.clock*(12+e.stage*3))%44;c.beginPath();for(let j=-4;j<=4;j++){const q={x:t.x*base+g.x*(j*75),y:t.y*base+g.y*(j*75)},side=dot(q,g)>=surface;if(!side)continue;j===-4?c.moveTo(q.x,q.y):c.lineTo(q.x,q.y);}c.stroke();}
  c.fillStyle='#deb8ff88';for(let i=0;i<30;i++){const x=((i*83.17+e.clock*9*(i%3+1))%(e.fieldW+60))-e.fieldW/2-30,y=((i*47.31-e.clock*18*(i%4+1))%(e.fieldH+80)+e.fieldH+80)%(e.fieldH+80)-e.fieldH/2-40,p={x,y};if(dot(p,g)>=surface){c.beginPath();c.arc(x,y,1.5+(i%4)*.7,0,Math.PI*2);c.fill();}}
  c.restore();
  const center={x:g.x*surface,y:g.y*surface},span=Math.hypot(e.fieldW,e.fieldH);c.save();c.strokeStyle='#e3bdff';c.shadowColor='#b277ff';c.shadowBlur=14;c.lineWidth=3;c.beginPath();for(let i=0;i<=80;i++){const u=(i/80-.5)*span,p={x:center.x+t.x*u+g.x*Math.sin(i*.52+e.clock*5.3)*4,y:center.y+t.y*u+g.y*Math.sin(i*.52+e.clock*5.3)*4};i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.stroke();c.shadowBlur=0;c.restore();
}
export const patterns:Pattern[]=[
  make('wall','세로 → 가로 전환','AXIS BREAK','일반 공격을 유지하며 전장을 가로 방향으로 전환합니다.',1,['전투 축의 전환','가로 전투','일반 공격과 조합','가로 복합 전투'],30,noop),
  make('rhythm','5레인 리듬게임','RHYTHM DETONATION','↑↓ 레인 이동 · 노트가 판정선에 닿으면 그 레인이 폭발합니다.',1,['단일 노트 학습','두 레인 동시','시간차 계단','동시 / 계단 / 왕복 / 홀드'],29,e=>{
    if(!e.emitting||e.beat>0)return;
    const ping=[0,1,2,3,4,3,2,1],cycle=Math.floor(e.counter/8)%4;
    let lanes:number[];let hold=0;
    if(e.stage===0){lanes=[e.counter%5];e.beat=2.3;}
    else if(e.stage===1){lanes=[e.counter%5,(e.counter+2)%5];e.beat=2.2;}
    else if(e.stage===2){lanes=[ping[e.counter%8]];e.beat=.8;}
    else if(cycle===0){const safe=e.counter%5;lanes=[0,1,2,3,4].filter(i=>i!==safe&&(e.counter%2===0||i!==(safe+1)%5));e.beat=1.7;}
    else if(cycle===1){lanes=[e.counter%5];e.beat=.48;}
    else if(cycle===2){lanes=[ping[e.counter%8]];e.beat=.5;}
    else {lanes=[e.counter%5,(e.counter+2)%5];hold=1; e.beat=1.7;}
    for(const lane of lanes)e.add({kind:'note',x:(lane-2)*e.fieldW/5,y:-e.fieldH/2+20,vy:105,warn:.15,life:7,r:15,lane,hold,tag:hold?'홀드 노트':'리듬 노트',color:hold?'#da9eff':pink});
    e.counter++;
  },(e,c)=>{
    c.lineWidth=1;c.strokeStyle='#bba0ed30';for(let i=1;i<5;i++){const x=-e.fieldW/2+i*e.fieldW/5;c.beginPath();c.moveTo(x,-e.fieldH/2);c.lineTo(x,e.fieldH/2);c.stroke();}
    c.strokeStyle=mint;c.lineWidth=2;c.setLineDash([6,6]);c.beginPath();c.moveTo(-e.fieldW/2,e.fieldH/2-100);c.lineTo(e.fieldW/2,e.fieldH/2-100);c.stroke();c.setLineDash([]);
  }),
  make('flight','지오메트리 비행','GRAVITY FLIGHT','SPACE를 누르면 상승, 떼면 하강합니다. 천장과 바닥도 위험합니다.',1,['부드러운 상승 / 하강','가속 증가','오염 장애물 교차','가시와 좁은 통로'],28,e=>{
    if(!e.emitting||e.beat>0)return;e.beat=2.35-e.stage*.12;
    const gap=135-e.stage*10,center=Math.sin(e.counter*.95)*115;
    // Local x is screen y after the quarter turn; local y advances right → left.
    const upper=-e.fieldW/2,lower=e.fieldW/2;
    for(const [a,b] of [[upper,center-gap/2],[center+gap/2,lower]]){
      if(b<=a)continue;e.add({kind:'rect',x:(a+b)/2,y:-e.fieldH/2-35,w:b-a,h:40,vy:155+e.stage*12,warn:1,life:6,tag:'비행 오염 블록'});
    }
    if(e.stage>0){const sign=e.counter%2?1:-1;e.add({kind:'spike',x:center+sign*(gap/2+18),y:-e.fieldH/2-100,w:42,h:46,vx:-sign*.001,vy:155+e.stage*12,warn:1,life:6,tag:'비행 가시'});}
    e.counter++;
  },(e,c)=>{c.fillStyle='#71479899';c.fillRect(-e.fieldW/2,-e.fieldH/2,9,e.fieldH);c.fillRect(e.fieldW/2-9,-e.fieldH/2,9,e.fieldH);c.strokeStyle='#c193ed';c.setLineDash([12,8]);c.strokeRect(-e.fieldW/2+9,-e.fieldH/2,e.fieldW-18,e.fieldH);c.setLineDash([]);}),
  make('rotation','전장 다중 회전','CONTINUOUS ROTATION','약 5초마다 회전하며 일반 공격과 화면 기준 조작을 유지합니다.',0,['90° 회전','역세로 전투','네 방향 연결','연속 회전'],30,noop),
  make('clones','3분신 공동 생존','TRIPLE EXISTENCE','일반 공격과 함께 세 기체가 사격·피격합니다. 세 기체의 LIFE를 공유합니다.',0,['중심에서 세 갈래','세 기체 동시 사격','공동 피격 회피','분신 사이의 여백'],27,noop),
  make('miss','미스탄 누적 폭격','MISSED SHOT DEBT','빗나간 탄을 회수합니다. 게이지 또는 30초 조건 후 종료 시 폭격합니다.',0,['사격과 미스 집계','흔들리는 표적','오염 자원 축적','최대 15발 폭격'],31,e=>{
    // A full meter ends this dedicated collection phase, then runs the normal exit transition.
    if(e.pendingBombard&&e.miss>=e.missCap)e.finish();
  }),
  make('link','탄환 접합','ELECTRIC JUNCTION','삼각형·사각형·육각형·별 진형이 이동하고 회전하며 전기장을 만듭니다.',0,['삼각형 / 사각형','회전 사각형 / 육각형','별 / 교차 연결','겹치는 기하 진형'],30,(e,dt)=>{
    if(e.emitting&&e.beat<=0){e.beat=2.5-e.stage*.25;const count=[3,4,6,8][(e.counter+e.stage)%4],group=++e.counter,origin={x:(e.random()-.5)*(e.fieldW-340),y:-e.fieldH/2-140},orbs:Entity[]=[],radius=100+e.stage*8;
      for(let i=0;i<count;i++){const a=i*Math.PI*2/count;orbs.push(e.add({x:origin.x+Math.cos(a)*radius,y:origin.y+Math.sin(a)*radius,r:14,warn:.9,life:11,color:purple,tag:'접합 탄체',group,vertex:i,vertices:count,origin:{...origin},rotation:a}));}
      for(let i=0;i<count;i++){const next=count===8?(i+3)%count:(i+1)%count;e.links.push({a:orbs[i],b:orbs[next],age:0,strength:0,active:false});}if(e.stage>=2&&count===4){e.links.push({a:orbs[0],b:orbs[2],age:0,strength:0,active:false},{a:orbs[1],b:orbs[3],age:0,strength:0,active:false});}
    }
    const orbs=e.hazards.filter(h=>h.tag==='접합 탄체'||h.tag==='접합 탄체');
    for(const h of orbs){if(h.group===undefined)continue;const hd=dt*e.localTime(h),a=(h.rotation??0)+(h.age-h.warn)*(.5+e.stage*.09)*(h.group%2?1:-1),r=100+e.stage*8+Math.sin(h.age*2)*18;h.origin!.y+=(95+e.stage*15)*hd;h.x=h.origin!.x+Math.cos(a)*r+Math.sin(h.age*1.3+h.group)*50;h.y=h.origin!.y+Math.sin(a)*r;}
    for(let i=0;i<orbs.length;i++)for(let j=i+1;j<orbs.length;j++){const a=orbs[i],b=orbs[j];if(a.group!==undefined||b.group!==undefined||a.age<a.warn||b.age<b.warn)continue;if(distance(a,b)<180&&!e.links.some(l=>l.a.id===a.id&&l.b.id===b.id))e.links.push({a,b,age:0,strength:0,active:false});}
    for(const l of e.links){const ld=dt*(e.localTime(l.a)+e.localTime(l.b))/2;l.age+=ld;const near=orbs.includes(l.a)&&orbs.includes(l.b)&&(l.a.group!==undefined||distance(l.a,l.b)<190);l.strength=clamp(l.strength+(near?ld*3:-ld*2.4),0,1);l.active=l.age>=1.25&&l.strength>0;if(l.active){const [a,b]=linkEndpoints(l.a,l.b,l.strength);for(const body of e.bodies())if(segmentDistance(e.local(body),a,b)<8)e.hit('접합 전기장',body);}}
    e.links=e.links.filter(l=>l.strength>0||l.age<.1);
  }),
  make('rockets','외곽 로켓','PERIMETER ROCKETS','대형 로켓이 쉬지 않고 연속 발사됩니다. 외곽 예고선과 교차 탄도를 확인하세요.',0,['한 방향 로켓','반대편 로켓','수평 / 수직 교차','외곽 교대 공격'],28,e=>{
    if(!e.emitting||e.beat>0)return;e.beat=.32-e.stage*.04;
    const side=e.stage===0?0:e.counter%4;
    const limit=side%2===0?e.fieldW:e.fieldH;rocket(e,side,(e.random()-.5)*(limit-90));
    if(e.stage>=2){const s=(side+2)%4;rocket(e,s,(e.random()-.5)*(limit-90));}e.counter++;
  }),
  make('mirror','거울 레이저','MIRROR REFLECTION','점선 전체가 발사 경로입니다. 레이저는 보스 쪽부터 순서대로 사라집니다.',0,['레이저 1개 / 반사','레이저 2개 / 부채꼴','레이저 3개 / 부채꼴','세 갈래 반사 회피'],30,(e,dt)=>{
    if(e.emitting&&e.beat<=0){e.beat=7.5;e.lasers.push({age:0,aim:0,paths:[],count:Math.min(3,e.stage+1),fired:false,lastReflect:0,reflections:[],headTime:0,tailTime:0});e.log(`거울 조준 · ${Math.min(3,e.stage+1)}개 / 최대 5회 반사`);}
    for(const laser of e.lasers){const scale=e.localTime(e.boss),before=laser.age;laser.age+=dt*scale;laser.headTime=(laser.headTime??0)+Math.max(0,dt-Math.max(0,2.4-before)/scale);laser.tailTime=(laser.tailTime??0)+Math.max(0,dt-Math.max(0,3.65-before)/scale);
      if(laser.age<1.6){const p=e.localPlayer();laser.aim=Math.atan2(p.y-e.boss.y,p.x-e.boss.x);laser.paths=Array.from({length:laser.count},(_,i)=>reflectedPath(e.boss,laser.aim+(i-(laser.count-1)/2)*.19,e.fieldW,e.fieldH,5));}
      if(laser.age>=2.4){
        if(!laser.fired){laser.fired=true;e.log('거울 레이저 발사 · 반사 대기 없음');}
        for(const [pathIndex,path] of laser.paths.entries()){
          for(const [a,b] of activeLaserSegments(e,laser,path))for(const body of e.bodies())if(segmentDistance(e.local(body),a,b)<7.5)e.hit('거울 반사 레이저',body);
          let offset=0;for(let i=1;i<path.length;i++){offset+=distance(path[i-1],path[i]);if(pathTimeCost(path.slice(0,i+1),e.advanced.zones)<=(laser.headTime??Math.max(0,laser.age-2.4))*5200&&i<path.length-1){const key=`${pathIndex}:${i}`;if(!laser.reflections.includes(key)){laser.reflections.push(key);e.fx(path[i],'ring',22,purple,.3);}}}
        }
      }
    }
    e.lasers=e.lasers.filter(l=>(!l.fired||(l.tailTime??0)<=0||l.paths.some(p=>activeLaserSegments(e,l,p).length>0)));
  },(e,c)=>{c.strokeStyle='#ada7e8';c.lineWidth=4;c.shadowColor=purple;c.shadowBlur=10;c.strokeRect(-e.fieldW/2+3,-e.fieldH/2+3,e.fieldW-6,e.fieldH-6);c.shadowBlur=0;c.lineWidth=1;for(let i=-e.fieldW/2;i<e.fieldW/2;i+=30){c.strokeStyle='#b6b3f244';c.beginPath();c.moveTo(i,-e.fieldH/2);c.lineTo(i+16,-e.fieldH/2+12);c.moveTo(i,e.fieldH/2);c.lineTo(i+16,e.fieldH/2-12);c.stroke();}}),
  spaceCutPattern,
  make('split8','전장 분할 안전 피신','FRACTURED SANCTUARY','전체 전장의 보라색 위험 칸을 피해 민트색 안전 칸으로 이동하세요. 수축하는 테두리가 사라지면 폭발합니다.',0,['위험 구역 점진 확대','짧아지는 피신 시간','두 칸 앞 안전 구역','최종 고속 피신'],29,(e,dt)=>{
    e.tileTimer-=dt;
    if(e.tileState==='recover'||e.tileState==='idle'){if(e.emitting&&e.tileTimer<=0)startTileWave(e);}
    else if(e.tileState==='warning'&&e.tileTimer<=0){e.tileState='blast';e.tileTimer=.9;e.shake=.24;for(const i of e.tileDanger){e.fx(tileCenter(e,i),'burst',130,'#edb4ff',.9);e.fx(tileCenter(e,i),'ring',165,'#ac63ff',.9);}const tile=e.tileIndex(e.localPlayer());if(e.tileDanger.includes(tile))e.hit('폭발 맵 전역 공격');e.log(`맵 폭발 · 위험 ${e.tileDanger.length}개`);}
    else if(e.tileState==='blast'){
      const tile=e.tileIndex(e.localPlayer());if(tile<0||e.tileDanger.includes(tile))e.hit('폭발 맵 전역 공격');
      if(e.tileTimer<=0){e.tileState='recover';e.tileTimer=Math.max(.42,.72-e.stage*.07);e.tileDanger=[];e.tileSafe=[];e.tileRound++;}
    }
  },drawTilePattern,e=>{const size=e.gridSize();e.fieldW=size.w;e.fieldH=size.h;e.tileCols=Math.max(3,Math.round(e.fieldW/280));e.tileRows=Math.max(3,Math.round(e.fieldH/280));if(!e.encounter.enabled)e.boss={x:0,y:-e.fieldH/2+140};e.tileRound=0;e.tileState='recover';e.tileTimer=.85;e.tileDanger=[];e.tileSafe=[];}),
  make('fluid','오염 액체 범람','CORRUPTION FLUID','차오르는 오염 액체로 떨어집니다. 입수 후 방향키로 몸을 돌려 헤엄치세요.',0,['액체 상승 / 저항 학습','기울기와 흐름 변화','360° 회전 유체','연속 회전 + 사방 탄막'],29,(e,dt)=>{
    const target=e.emitting?clamp(.08+e.t*.105,.08,.9+e.stage*.015):0;e.fluidFill+=(target-e.fluidFill)*Math.min(1,dt*3.4);
    const rotationAnchor=e.localPlayer();
    if(e.emitting){if(e.stage===0)e.angle=Math.sin(e.t*.58)*.18;
    else if(e.stage===1)e.angle=Math.sin(e.t*.46)*.44;
    else if(e.stage===2)e.angle=e.t/16*Math.PI*2;
    else e.angle=e.t/9.5*Math.PI*2+Math.sin(e.t*.7)*.13;}
    e.player=e.screen(rotationAnchor);
    e.orientation=(Math.round(e.angle/(Math.PI/2))%4+4)%4;const g=e.gravityLocal(),t={x:-g.y,y:g.x},fall=42+e.stage*18+Math.abs(Math.sin(e.angle))*20,side=Math.sin(e.t*.72)*22;
    e.fluidFlow={x:g.x*fall+t.x*side,y:g.y*fall+t.y*side};
    if(e.emitting&&e.beat<=0){e.beat=Math.max(.82,1.48-e.stage*.14);const spawn=(sideIndex:number)=>{const along=e.random()-.5,p=sideIndex===0?{x:along*e.fieldW,y:-e.fieldH/2-16}:sideIndex===1?{x:e.fieldW/2+16,y:along*e.fieldH}:sideIndex===2?{x:along*e.fieldW,y:e.fieldH/2+16}:{x:-e.fieldW/2-16,y:along*e.fieldH},target=e.localPlayer(),a=Math.atan2(target.y-p.y,target.x-p.x)+(e.random()-.5)*.22,sp=45+e.stage*7+e.random()*14;e.add({...p,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:9+e.random()*3,warn:.7,life:11,color:'#c477ff',tag:'유체 오염탄'});};const sideIndex=e.counter%4;spawn(sideIndex);if(e.stage>=2)spawn((sideIndex+2)%4);e.counter++;}
  },drawFluid,e=>{e.fieldW=CANVAS_W;e.fieldH=CANVAS_H;e.fluidFill=.05;e.fluidPlayerV={x:0,y:0};e.fluidHeading=0;e.fluidThrottle=0;e.fluidFlow={x:0,y:25};e.boss={x:0,y:-230};})
  ,...advancedPatterns,...menuDeceptionPatterns,...normalBulletPatterns,...corridorPatterns,finalStandPattern,pauseStormPattern,graduationStampPattern,pathFoldPattern,recyclePattern,...unseenPatterns,...fieldTrickPatterns,...extraNormalPatterns,tileStreamPattern
];
