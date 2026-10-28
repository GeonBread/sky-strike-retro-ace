import type {Engine} from './engine';
import type {Pattern,Vec} from './core';
import {BASE_FIELD_W,BASE_FIELD_H,PLAYER_HIT_RADIUS,clamp,smooth} from './core';
import {drawWaveBeam} from './waveLaser';

export const FINAL_STAND_SECONDS=40;
export type FinaleBeam={u:number;age:number;warn:number;life:number;lanes:number};
export type FinalStandState={started:boolean;pending:boolean;complete:boolean;elapsed:number;section:number;cursor:number;beams:FinaleBeam[]};
export const freshFinalStand=():FinalStandState=>({started:false,pending:false,complete:false,elapsed:0,section:-1,cursor:0,beams:[]});
type Cue={at:number;kind:'gate'|'wall'|'cores';gap:number;lanes:number;speed?:number;warn?:number};
/** One immutable score. No player targeting, random numbers, or stage-dependent changes. */
export const finalStandScore:readonly Cue[]=[
 ...[3,1,3,5,4,2,4,5,3].map((gap,i):Cue=>({at:.15+i*1.05,kind:'gate',gap,lanes:7,warn:.7})),
 ...[3,2,4,3,5,4,2].flatMap((gap,i):Cue[]=>[
  {at:10.15+i*1.3,kind:'wall',gap,lanes:7,speed:340},
  {at:10.42+i*1.3,kind:'wall',gap,lanes:7,speed:490}
 ]),
 ...[2,1,3].map((gap,i):Cue=>({at:21.15+i*1.3,kind:'gate',gap,lanes:5,warn:.8})),
 ...[2,1,3].map((gap,i):Cue=>({at:26.3+i*1.05,kind:'wall',gap,lanes:5,speed:340})),
 ...[3,2,1,2,3].flatMap((gap,i):Cue[]=>[
  {at:30.15+i*1.85,kind:'gate',gap,lanes:7,warn:.8},
  {at:30.15+i*1.85,kind:'wall',gap,lanes:7,speed:410},
  {at:30.42+i*1.85,kind:'wall',gap,lanes:7,speed:540},
  {at:30.65+i*1.85,kind:'cores',gap,lanes:7,speed:240}
 ])
].sort((a,b)=>a.at-b.at);

export function finalFieldPose(t:number){
 const shrink=smooth((t-20)/1.25),expand=smooth((t-30)/1.25);
 const size=1-.25*shrink*(1-expand);
 const angle=(smooth((t-20.5)/1.8)+smooth((t-26)/1.5)+2*smooth((t-31)/2))*Math.PI/2;
 return{w:BASE_FIELD_W*size,h:BASE_FIELD_H*(1-.18*shrink*(1-expand)),angle};
}
export function beamBounds(e:Engine,b:FinaleBeam){return{x:(b.u-.5)*e.fieldW,y:0,w:e.fieldW/b.lanes*.63,h:e.fieldH};}
export function finaleBeamHits(e:Engine,p:Vec){return e.finalStand.beams.some(b=>{
 if(b.age<b.warn||b.age>=b.warn+b.life)return false;const r=beamBounds(e,b);
 return Math.abs(p.x-r.x)<r.w/2+PLAYER_HIT_RADIUS&&Math.abs(p.y)<e.fieldH/2+PLAYER_HIT_RADIUS;
});}
function fireCue(e:Engine,cue:Cue){
 const gapX=((cue.gap+.5)/cue.lanes-.5)*e.fieldW;
 if(cue.kind==='gate'){
  for(let i=0;i<cue.lanes;i++)if(i!==cue.gap)e.finalStand.beams.push({u:(i+.5)/cue.lanes,lanes:cue.lanes,age:0,warn:cue.warn??.8,life:.25});
  return;
 }
 if(cue.kind==='cores'){
  for(const side of [-1,1])e.add({x:side*e.fieldW*.42,y:-e.fieldH/2+70,vx:0,vy:cue.speed??240,r:24,warn:.12,life:5,visual:'core',color:'#ff9bcc',tag:'최후 코어 압박탄'});
  return;
 }
 const gapWidth=e.fieldW/cue.lanes*.9;
 for(let x=-e.fieldW/2+20;x<e.fieldW/2;x+=30){
  if(Math.abs(x-gapX)<gapWidth/2)continue;
  e.add({x,y:-e.fieldH/2+60,vx:0,vy:cue.speed??340,r:8,warn:.12,life:5,visual:(cue.speed??0)>450?'needle':'shard',color:(cue.speed??0)>450?'#ffd5a1':'#c695ff',tag:'최후 고정 틈 탄벽'});
 }
}
function applyPose(e:Engine,t:number){
 const p=e.localPlayer(),pose=finalFieldPose(t);e.fieldW=pose.w;e.fieldH=pose.h;e.angle=pose.angle;e.rotation=0;
 e.orientation=(Math.round(e.angle/(Math.PI/2))%4+4)%4;
 p.x=clamp(p.x,-e.fieldW/2+13,e.fieldW/2-13);p.y=clamp(p.y,-e.fieldH/2+13,e.fieldH/2-13);e.player=e.screen(p);
 e.boss={x:0,y:-e.fieldH/2+145};
}
function update(e:Engine,dt:number){
 const f=e.finalStand;
 if(f.complete){applyPose(e,40);return;}
 f.elapsed=Math.min(FINAL_STAND_SECONDS,f.elapsed+dt);
 if(FINAL_STAND_SECONDS-f.elapsed<1e-8)f.elapsed=FINAL_STAND_SECONDS;
 const section=Math.min(3,Math.floor(f.elapsed/10));
 if(section!==f.section){f.section=section;e.log(`최후 악보 · ${section+1}/4 · ${['레이저 회랑','속도차 탄벽','전장 압축·회전','복합 압박'][section]}`);}
 applyPose(e,f.elapsed);
 for(const b of f.beams)b.age+=dt;f.beams=f.beams.filter(b=>b.age<b.warn+b.life);
 while(f.cursor<finalStandScore.length&&finalStandScore[f.cursor].at<=f.elapsed){const cue=finalStandScore[f.cursor++];if(Math.floor(cue.at/10)===section)fireCue(e,cue);}
 for(const body of e.bodies())if(finaleBeamHits(e,e.local(body)))e.hit('최후 회랑 레이저',body);
 e.bossHp=Math.max(1,e.bossHpMax*.01);
 if(f.elapsed>=FINAL_STAND_SECONDS){
  f.complete=true;e.volley.events=[];e.bossHp=1;
  e.fx(e.boss,'burst',100,'#f5cfec',.8);e.log('패턴 종료 · 40초 생존 · 사격 해제 · 마지막 1 HP');
 }
}
function render(e:Engine,c:CanvasRenderingContext2D){for(const b of e.finalStand.beams)drawWaveBeam(e,c,b);}
export const finalStandPattern:Pattern={
 id:'last-stand',name:'최후의 1% · 40초',english:'LAST ONE PERCENT',subtitle:'사격·폭탄 봉인 · 고정된 4구간을 40초 버티면 마지막 한 발을 쏠 수 있습니다.',
 category:'special',orientation:0,duration:Infinity,stages:['최후의 1% · 사격 봉인','최후의 1% · 사격 봉인','최후의 1% · 사격 봉인','최후의 1% · 사격 봉인'],
 enter:e=>{e.finalStand={...freshFinalStand(),started:true};e.bossForm=2;e.bossHp=Math.max(1,e.bossHpMax*.01);e.pendingBombard=false;e.volley.events=[];e.angle=0;e.rotation=0;e.player=e.screen({x:0,y:BASE_FIELD_H*.36});},
 update,render,exit:e=>{e.finalStand=freshFinalStand();}
};
