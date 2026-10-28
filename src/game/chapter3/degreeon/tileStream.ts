import type {Engine} from './engine';
import type {Pattern,Vec} from './core';
import {clamp} from './core';
type Batch={id:number;cells:number[];age:number;warn:number;life:number;fired:boolean};
export type TileStream={timer:number;serial:number;batches:Batch[];last:number[];blasts:number};
export const freshTileStream=():TileStream=>({timer:.25,serial:0,batches:[],last:[],blasts:0});
const center=(e:Engine,i:number):Vec=>({x:-e.fieldW/2+(i%e.tileCols+.5)*e.fieldW/e.tileCols,y:-e.fieldH/2+(Math.floor(i/e.tileCols)+.5)*e.fieldH/e.tileRows});
function fit(e:Engine){const v=e.gridSize();if(Math.abs(e.fieldW-v.w)>.1||Math.abs(e.fieldH-v.h)>.1)e.tileStream=freshTileStream();e.fieldW=v.w;e.fieldH=v.h;e.tileCols=Math.max(3,Math.round(v.w/280));e.tileRows=Math.max(3,Math.round(v.h/280));if(!e.encounter.enabled)e.boss={x:0,y:-v.h/2+140};}
function schedule(e:Engine){const s=e.tileStream,total=e.tileCols*e.tileRows,used=new Set(s.batches.flatMap(b=>b.cells));
 const current=Math.max(0,e.tileIndex(e.localPlayer())),neighbors=[current-1,current+1,current-e.tileCols,current+e.tileCols].filter(i=>i>=0&&i<total&&Math.abs(i%e.tileCols-current%e.tileCols)+Math.abs(Math.floor(i/e.tileCols)-Math.floor(current/e.tileCols))===1),refuge=neighbors[s.serial%neighbors.length]??current;
 // Keep a reachable refuge and never place a fresh warning over a currently live cell.
 let available=Array.from({length:total},(_,i)=>i).filter(i=>i!==refuge&&!used.has(i)&&!s.last.includes(i));
 if(!available.length)available=Array.from({length:total},(_,i)=>i).filter(i=>i!==refuge&&!used.has(i));
 if(!available.length)return;
 for(let i=available.length-1;i>0;i--){const j=Math.floor(e.random()*(i+1));[available[i],available[j]]=[available[j],available[i]];}
 const count=Math.min(1+Math.floor(e.random()*3),available.length,Math.max(0,total-used.size-1));if(!count)return;
 const cells=available.slice(0,count);s.last=cells;s.batches.push({id:++s.serial,cells,age:0,warn:.95-e.stage*.06,life:.24,fired:false});
}
function update(e:Engine,dt:number){fit(e);const s=e.tileStream;s.timer-=dt;
 if(e.emitting&&s.timer<=0){s.timer+=.40-e.stage*.025;schedule(e);}
 for(const b of s.batches){b.age+=dt;if(b.age<b.warn||b.age>=b.warn+b.life)continue;
  if(!b.fired){b.fired=true;s.blasts++;e.shake=Math.max(e.shake,.06);for(const i of b.cells)e.fx(center(e,i),'ring',90,'#c988f5',.3);}
  for(const body of e.bodies())if(b.cells.includes(e.tileIndex(e.local(body))))e.hit('연쇄 구역 폭발',body);
 }s.batches=s.batches.filter(b=>b.age<b.warn+b.life);
}
function render(e:Engine,c:CanvasRenderingContext2D){const cw=e.fieldW/e.tileCols,ch=e.fieldH/e.tileRows;c.save();c.lineWidth=1;c.strokeStyle='#b69bd844';
 for(let i=0;i<e.tileCols*e.tileRows;i++){const p=center(e,i);c.strokeRect(p.x-cw/2+3,p.y-ch/2+3,cw-6,ch-6);}
 for(const b of e.tileStream.batches)for(const i of b.cells){const p=center(e,i),x=p.x-cw/2+5,y=p.y-ch/2+5,w=cw-10,h=ch-10,warning=b.age<b.warn,k=clamp(warning?b.age/b.warn:(b.age-b.warn)/b.life,0,1);
  c.fillStyle=warning?'#a839e32a':`rgba(185,78,237,${.68*(1-k)})`;c.fillRect(x,y,w,h);c.strokeStyle=warning?'#db93ff':'#f3d4ff';c.lineWidth=warning?2:5;c.strokeRect(x,y,w,h);
  if(warning){c.strokeStyle='#f1c7ff';c.lineWidth=3;c.strokeRect(p.x-w*(1-k)/2,p.y-h*(1-k)/2,w*(1-k),h*(1-k));}
  else{c.beginPath();c.ellipse(p.x,p.y,Math.max(1,w*k*.55),Math.max(1,h*k*.55),0,0,Math.PI*2);c.stroke();}
 }c.restore();}
export const tileStreamPattern:Pattern={id:'tile-stream',name:'전장 분할 · 연속 폭발',english:'RESTLESS TILE CASCADE',subtitle:'매번 다른 1~3칸을 예고합니다. 먼저 표시된 칸부터 쉬지 않고 폭발하므로 다음 경고도 함께 확인하세요.',category:'special',orientation:0,stages:['연속 1~3칸','겹치는 다음 예고','빠른 연쇄 폭발','무휴 고속 폭발'],duration:29,enter:e=>{fit(e);e.tileStream=freshTileStream();},update,render,exit:()=>{}};
