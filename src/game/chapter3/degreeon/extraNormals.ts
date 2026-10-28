import type {Engine} from './engine';
import type {Pattern,Entity,Vec} from './core';
import {clamp} from './core';
export type TailChain={age:number;head:Entity;tails:Entity[];released:number;detached:boolean;target:Vec;releaseClocks:number[];side:number;aimed:boolean;fan:number};
export type ExtraNormalState={chains:TailChain[];sequence:number};
export const freshExtraNormal=():ExtraNormalState=>({chains:[],sequence:0});
/** Each salvo has two independent comets. There is no wait for the previous salvo. */
function spawnTailSalvo(e:Engine){
 const s=e.extraNormal,n=6+Math.floor(e.stage/2),center=Math.sin(s.sequence*.91)*e.fieldW*.27,spread=Math.min(142,e.fieldW*.18),speed=310+e.stage*18;
 for(const side of [-1,1]){const aimed=(s.sequence+(side>0?1:0))%2===0,x=clamp(center+side*spread,-e.fieldW/2+65,e.fieldW/2-65),head=e.add({x,y:-e.fieldH/2+140,r:26,visual:'core',vx:side*20,vy:speed,warn:.42,life:6,color:aimed?'#ef9fdb':'#b99aff',tag:'꼬리 분리 대형탄'}),tails:Entity[]=[];
  for(let i=0;i<n;i++)tails.push(e.add({x:x+Math.sin(i*.65+s.sequence)*7,y:head.y-(i+1)*23,r:8,visual:i%3===2?'needle':'drop',vx:side*20,vy:speed,warn:.42,life:6,color:i%2?'#ffd995':'#dc9cff',tag:'꼬리를 벗는 소형탄'}));
  s.chains.push({age:0,head,tails,released:0,detached:false,target:{...e.localPlayer()},releaseClocks:Array(n).fill(0),side,aimed,fan:(s.sequence%3-1)*.16});
 }s.sequence++;
}
export function tailLaunchDirection(chain:TailChain,i:number):Vec{
 if(!chain.aimed){const a=chain.fan+(-.75+1.5*i/Math.max(1,chain.tails.length-1));return{x:Math.sin(a),y:Math.cos(a)};}
 const p=chain.tails[i],dx=chain.target.x-p.x,dy=chain.target.y-p.y,d=Math.hypot(dx,dy)||1;return{x:dx/d,y:dy/d};
}
function tailUpdate(e:Engine,dt:number){
 const s=e.extraNormal;if(e.emitting&&e.beat<=0){e.beat=.64-e.stage*.06;spawnTailSalvo(e);}
 const alive=new Set(e.hazards.map(h=>h.id));
 for(const chain of s.chains){chain.age+=dt*e.localTime(chain.head);
  if(!chain.detached&&chain.age>=1.55){chain.detached=true;chain.target={...e.localPlayer()};chain.head.vx=chain.side*(450+e.stage*24);chain.head.vy=70;
   for(const p of chain.tails){p.vx=0;p.vy=0;}if(alive.has(chain.head.id))e.fx(chain.head,'ring',42,chain.head.color,.25);
  }
  if(!chain.detached)continue;
  for(let i=chain.released;i<chain.tails.length;i++){
   const p=chain.tails[i];chain.releaseClocks[i]+=dt*e.localTime(p);if(chain.releaseClocks[i]<.38+i*.065)continue;
   // Only release the next visible projectile, never recreate one cleared by a bomb.
   if(i!==chain.released)break;const d=tailLaunchDirection(chain,i),sp=210+e.stage*16+(i%3)*12;p.vx=d.x*sp;p.vy=d.y*sp;chain.released++;if(alive.has(p.id))e.fx(p,'ring',18,p.color,.17);
  }
 }
 s.chains=s.chains.filter(c=>c.age<6.5&&(alive.has(c.head.id)||c.tails.some(p=>alive.has(p.id))));
}
function drawTails(e:Engine,c:CanvasRenderingContext2D){
 const alive=new Set(e.hazards.map(h=>h.id));
 for(const chain of e.extraNormal.chains){if(!chain.detached)continue;
  for(let i=chain.released;i<chain.tails.length;i++){const p=chain.tails[i];if(!alive.has(p.id))continue;const d=tailLaunchDirection(chain,i),f=clamp(chain.releaseClocks[i]/(.38+i*.065),0,1);
   c.save();c.translate(p.x,p.y);c.strokeStyle='#ffe5ad';c.lineWidth=2;c.globalAlpha=.35+.65*f;c.beginPath();c.arc(0,0,15,-Math.PI/2,-Math.PI/2+Math.PI*2*f);c.stroke();c.rotate(Math.atan2(d.y,d.x));c.beginPath();c.moveTo(18,-5);c.lineTo(26,0);c.lineTo(18,5);c.stroke();c.restore();
  }
 }
}
export function spawnWaveWall(e:Engine,index:number,sequence:number){const gapWidth=155-e.stage*10,gap=([-1,0,1][(sequence%2?2-index:index)]??0)*e.fieldW*.27,speed=190+e.stage*18;
 for(let x=-e.fieldW/2+18;x<e.fieldW/2;x+=Math.max(25,e.fieldW/75)){if(Math.abs(x-gap)<gapWidth/2+12)continue;e.add({x,y:-e.fieldH/2-20+Math.sin(x/e.fieldW*Math.PI*3+index*.32)*24,vx:0,vy:speed,r:8,visual:'shard',warn:0,life:e.fieldH/speed+2,color:['#c7a0ff','#ed9cdd','#ffd698'][index],tag:`세 겹 물결 ${index+1}층`});}
}
function waveUpdate(e:Engine){if(!e.emitting||e.beat>0)return;const n=e.extraNormal.sequence,index=n%3;e.beat=index<2?.95:Math.max(2,(e.fieldH/(190+e.stage*18))*.58);spawnWaveWall(e,index,Math.floor(n/3));e.extraNormal.sequence++;}
const make=(id:string,name:string,english:string,subtitle:string,update:Pattern['update'],render:Pattern['render']=()=>{}):Pattern=>({id,name,english,subtitle,category:'normal',orientation:0,stages:['기본 회피','교대 진행','빠른 탄막','좁아지는 통로'],duration:26,enter:e=>{e.extraNormal=freshExtraNormal();e.beat=.4;},update,render,exit:()=>{}});
export const extraNormalPatterns=[make('tail-shed','꼬리를 벗어던지는 탄','SHEDDING COMET','쌍줄기 탄이 끊임없이 진입합니다. 꼬리 정지 예고 후 교차·조준 탄막이 연달아 쏟아집니다.',tailUpdate,drawTails),make('triple-wave','세 겹 물결 탄벽','TRIPLE WAVE WALL','세 겹의 빈틈을 좌·중앙·우 순서로 통과하세요. 다음 묶음은 반대 순서입니다.',waveUpdate)];
