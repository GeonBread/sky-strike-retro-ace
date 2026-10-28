import type { Engine } from './engine';
import type { Entity, Pattern, Vec } from './core';
import { clamp, distance, dot } from './core';
type Fire=(e:Engine)=>void;
export type VolleyState={time:number;sequence:number;nextMotif:number;events:{at:number;fire:Fire}[]};
export const freshVolley=():VolleyState=>({time:0,sequence:0,nextMotif:0,events:[]});
const violet='#c695ff',pink='#ee96c9',mint='#96ffdf';
const angleTo=(a:Vec,b:Vec)=>Math.atan2(b.y-a.y,b.x-a.x);
function bullet(e:Engine,p:Vec,a:number,speed:number,tag:string,extra:Partial<Entity>={}){
 const visual:Entity['visual']=extra.motion?.kind==='spear'?'spear':(extra.r??9)>=15?'core':(extra.r??9)<=6||speed>=380?'needle':tag.includes('부채')||tag.includes('반달')||tag.includes('교차')?'shard':'drop';
 // Fragments get new identifiers and clocks instead of inheriting the parent entity.
 return e.add({x:p.x,y:p.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:9,warn:.16,life:12,color:violet,tag,visual,...extra});
}
function fan(e:Engine,p:Vec,a:number,n:number,step:number,speed:number,tag:string){for(let i=0;i<n;i++)bullet(e,p,a+(i-(n-1)/2)*step,speed,tag);}
function queue(e:Engine,delay:number,fire:Fire){e.volley.events.push({at:e.volley.time+delay,fire});}
function flushVolley(e:Engine){
 while(e.volley.events.length){e.volley.events.sort((a,b)=>a.at-b.at);if(e.volley.events[0].at>e.volley.time)break;e.volley.events.shift()!.fire(e);}
}
export type BulletComponent=Pattern&{fire:Fire};
const attack=(id:string,name:string,english:string,subtitle:string,duration:number,cycle:number,fire:Fire):BulletComponent=>({id,name,english,subtitle,category:'normal',orientation:0,stages:['기본 탄도','빠른 발사','짧은 연속 공격','숙련 탄막'],duration,fire,enter:e=>{e.volley=freshVolley();},exit:e=>{e.volley.events=[];},render:()=>{},update:(e,dt)=>{
 e.volley.time+=dt*e.localTime(e.boss);
 if(e.emitting&&e.beat<=0){fire(e);e.beat=cycle;e.volley.sequence++;e.counter++;}
 flushVolley(e);
}});
/** The twenty moves are building blocks, not independent menu entries. */
export const normalBulletComponents:BulletComponent[]=[
 attack('speed-triple','3연 속도차 탄','THREE SPEEDS','같은 방향의 느림 → 보통 → 빠름 3발을 연속으로 피하세요.',5,1.7,e=>{const p={...e.boss},a=angleTo(p,e.localPlayer());[130,240,410].forEach((s,i)=>queue(e,i*.22,x=>bullet(x,p,a,s,'속도차 '+(i+1)+'탄',{color:[violet,pink,'#fff0a3'][i]})));}),
 attack('offbeat-fan','엇박자 부채탄','OFFBEAT FAN','첫 5방향 탄의 빈틈으로 두 번째 5방향 탄이 들어옵니다.',5,2,e=>{const p={...e.boss},a=angleTo(p,e.localPlayer()),step=.19;fan(e,p,a,5,step,210,'첫 부채탄');queue(e,.48,x=>fan(x,p,a+step/2,5,step,235,'엇박자 틈 탄'));}),
 attack('crescent','반달 쓸기','CRESCENT SWEEP','보스 옆의 반달 탄막이 한쪽을 쓸고 다음에는 반대로 이동합니다.',6,2.35,e=>{const side=e.volley.sequence%2?1:-1,p={x:e.boss.x+side*130,y:e.boss.y+100};for(let i=0;i<13;i++){const a=-Math.PI/2+i*Math.PI/12;bullet(e,{x:p.x+side*Math.cos(a)*105,y:p.y+Math.sin(a)*105},Math.atan2(210,-side*245),320,'반달 쓸기',{r:11});}e.fx(p,'ring',100,violet,.35);}),
 attack('diagonal-cross','대각선 교차탄','DIAGONAL CROSS','두 모서리에서 탄 줄이 시간차로 대각선을 가로지릅니다.',6,2.4,e=>{for(const side of [-1,1])queue(e,side===-1?0:.55,x=>{const p={x:side*(x.fieldW/2-35),y:-x.fieldH/2+55},a=angleTo(p,{x:-p.x,y:x.fieldH/2-55});for(let i=0;i<6;i++)queue(x,i*.1,y=>bullet(y,p,a,300,'대각선 교차탄'));});}),
 attack('jump-bullet','점프 탄','ONE BOUNCE','직선으로 내려오던 탄이 중앙 높이에서 한 번만 위로 튕깁니다.',6,1.8,e=>{for(let i=-2;i<=2;i++)bullet(e,{x:e.boss.x+i*65,y:e.boss.y+30},Math.PI/2,180,'점프 탄',{motion:{kind:'jump',trigger:-35}});}),
 attack('stop-restart','정지 후 재출발','STOP AND DASH','플레이어 앞에서 0.7초 정지한 뒤 같은 방향으로 급가속합니다.',6,2.4,e=>{const p={...e.boss},a=angleTo(p,e.localPlayer()),d={x:Math.cos(a),y:Math.sin(a)};for(let i=-1;i<=1;i++){const from={x:p.x+i*40,y:p.y};bullet(e,from,a,235,'정지 후 재출발',{motion:{kind:'stop',anchor:from,direction:d,trigger:Math.max(100,distance(p,e.localPlayer())-145),speed:570}});}}),
 attack('wall-gap','느린 벽 + 빠른 틈 탄','WALL AND GAP','느린 탄벽의 넓은 틈으로 빠른 소형탄이 엇갈려 들어옵니다.',7,2.8,e=>{const gap=clamp(e.localPlayer().x,-e.fieldW/2+145,e.fieldW/2-145),y=e.boss.y+45;for(let x=-e.fieldW/2+30;x<e.fieldW/2;x+=36)if(Math.abs(x-gap)>95)bullet(e,{x,y},Math.PI/2,105,'느린 탄벽',{r:14});for(let i=0;i<3;i++)queue(e,.65+i*.18,x=>bullet(x,{x:gap+(i%2?70:-70),y:y+65},Math.atan2(470,i%2?-180:180),500,'빠른 틈 탄',{r:6,color:pink}));}),
 attack('edge-pressure','양끝 압박탄','EDGE PRESSURE','양쪽 탄 줄이 중앙을 압박합니다. 위·아래의 넓은 탈출 틈을 찾으세요.',6,2.4,e=>{const top=e.volley.sequence%2===0;for(let y=-e.fieldH/2+65;y<e.fieldH/2-35;y+=65){if(top?y<-e.fieldH/2+230:y>e.fieldH/2-230)continue;for(const side of [-1,1])bullet(e,{x:side*(e.fieldW/2-20),y},side===-1?0:Math.PI,170,'양끝 압박탄');}}),
 attack('center-fork','중앙 분기탄','THREE WAY FORK','대형탄이 중앙에서 ↙ ↓ ↘ 세 갈래로 한 번만 나뉩니다.',6,2.3,e=>bullet(e,{...e.boss},Math.PI/2,180,'중앙 분기 대형탄',{r:26,motion:{kind:'fork',trigger:0}})),
 attack('asymmetric-ring','비대칭 방사탄','ASYMMETRIC RING','촘촘한 원형 탄막의 넓은 빈 방향이 발사마다 바뀝니다.',5,1.9,e=>{const open=(e.volley.sequence*.95+Math.PI/2)%(Math.PI*2);for(let i=0;i<24;i++){const a=i*Math.PI*2/24;let d=a-open;while(d>Math.PI)d-=Math.PI*2;while(d< -Math.PI)d+=Math.PI*2;if(Math.abs(d)<.62)continue;bullet(e,{...e.boss},a,190,'비대칭 방사탄');}e.fx(e.boss,'ring',45,violet,.4);}),
 attack('curving-triple','휘는 3연탄','LATE CURVE','3발이 먼저 직진하고 마지막 구간에서만 작게 휘어집니다.',6,1.9,e=>{const p={...e.boss},a=angleTo(p,e.localPlayer());for(let i=0;i<3;i++)queue(e,i*.24,x=>bullet(x,p,a,250,'휘는 3연탄',{motion:{kind:'curve',trigger:95,side:i%2?1:-1}}));}),
 attack('rotating-fan','회전 부채탄','SHORT ROTATING FAN','0.4초마다 회전하는 5발 부채탄을 네 번만 발사합니다.',5,2.6,e=>{const p={...e.boss},a=angleTo(p,e.localPlayer())-.21;for(let i=0;i<4;i++)queue(e,i*.4,x=>fan(x,p,a+i*.14,5,.16,225,'회전 부채탄'));}),
 attack('large-small','큰 탄 사이 소형탄','LARGE AND SMALL','느린 대형탄 두 개 사이로 빠른 소형탄 3발이 통과합니다.',6,2.1,e=>{const p={...e.boss};for(const side of [-1,1])bullet(e,{x:p.x+side*90,y:p.y+30},Math.PI/2,120,'느린 대형 오염탄',{r:34});for(let i=0;i<3;i++)queue(e,.32+i*.16,x=>bullet(x,p,Math.PI/2,390,'사이 소형탄',{r:6,color:pink}));}),
 attack('delayed-burst','폭발 지연탄','DELAYED EDGE BURST','화면 끝에 닿은 탄이 0.55초 떨린 뒤 작은 4방향 탄으로 폭발합니다.',7,2,e=>{const a=angleTo(e.boss,e.localPlayer());for(let i=-1;i<=1;i++)bullet(e,{...e.boss},a+i*.28,330,'폭발 지연탄',{r:15,motion:{kind:'edge-burst'}});}),
 attack('cross-accelerate','교차 후 가속','CROSS THEN ACCELERATE','X 교차점은 안전합니다. 그 지점을 지난 두 탄은 빠르게 가속합니다.',6,2.3,e=>{const target={x:e.localPlayer().x*.35,y:-30};for(const side of [-1,1]){const p={x:side*e.fieldW*.32,y:e.boss.y+45},a=angleTo(p,target);bullet(e,p,a,225,'교차 후 가속',{r:12,motion:{kind:'cross',anchor:p,target,direction:{x:Math.cos(a),y:Math.sin(a)},trigger:distance(p,target)+35,speed:510}});}e.fx(target,'ring',35,mint,1.5);}),
 attack('core-contract','보스 중심 수축탄','SHORT CONTRACTION','퍼진 탄이 잠깐 코어 쪽으로 수축했다가 다시 확산합니다.',6,2.4,e=>{const p={...e.boss};for(let i=0;i<16;i++){const a=i*Math.PI*2/16;bullet(e,p,a,190,'보스 중심 수축탄',{motion:{kind:'contract',direction:{x:Math.cos(a),y:Math.sin(a)},speed:190}});}}),
 attack('corruption-spears','내려찍는 오염창','CORRUPTION SPEARS','가느다란 창 3~5개의 고정 착탄 경로를 미리 확인하세요.',5,1.9,e=>{const n=3+Math.min(2,e.stage),p=e.localPlayer();for(let i=0;i<n;i++){const from={x:e.boss.x+(i-(n-1)/2)*65,y:e.boss.y+30},target={x:clamp(p.x+(i-(n-1)/2)*75,-e.fieldW/2+35,e.fieldW/2-35),y:p.y},a=angleTo(from,target);bullet(e,from,a,880,'내려찍는 오염창',{r:7,w:12,h:74,warn:.7,motion:{kind:'spear',anchor:from,target,direction:{x:Math.cos(a),y:Math.sin(a)},trigger:distance(from,target)}});}}),
 attack('sliding-bullet','옆으로 미끄러지는 탄','DOWN SIDE DOWN','↓ 수평 이동 ↓ 순서로 한 번만 궤도가 바뀝니다.',6,1.9,e=>{for(let i=-2;i<=2;i++)bullet(e,{x:e.boss.x+i*65,y:e.boss.y+30},Math.PI/2,195,'옆으로 미끄러지는 탄',{motion:{kind:'slide',trigger:-20,side:e.volley.sequence%2?1:-1,speed:195}});}),
 attack('twin-bullets','쌍둥이 탄','CLOSING TWINS','두 탄의 넓은 간격은 후반에 서서히 좁아집니다.',6,1.8,e=>{const x=clamp(e.localPlayer().x,-e.fieldW/2+90,e.fieldW/2-90);for(const side of [-1,1])bullet(e,{x:x+side*62,y:e.boss.y+25},Math.PI/2,200,'쌍둥이 탄',{r:13,motion:{kind:'twins',anchor:{x,y:0},side,offset:62,trigger:45}});}),
 attack('core-pulse','코어 펄스','CORE PULSE','코어가 2~3번 빛나며 원형탄을 발사합니다. 마지막 탄만 빠릅니다.',5,2.5,e=>{const n=e.stage?3:2;for(let i=0;i<n;i++)queue(e,i*.48,x=>{x.fx(x.boss,'burst',85,i===n-1?'#ffeaa3':violet,.2);for(let j=0;j<16;j++)bullet(x,{...x.boss},j*Math.PI*2/16+i*.075,i===n-1?350:125+i*20,'코어 펄스',{color:i===n-1?'#ffeaa3':violet});});})
];
type ComboCue={at:number;id:string};
export type BulletCombo=Pattern&{cues:ComboCue[];cycle:number};
function combo(id:string,name:string,english:string,subtitle:string,cycle:number,cues:ComboCue[]):BulletCombo{
 const components=cues.map(cue=>{const component=normalBulletComponents.find(p=>p.id===cue.id);if(!component)throw Error(`Unknown bullet component: ${cue.id}`);return {...cue,fire:component.fire};});
 return {id,name,english,subtitle,cycle,cues,category:'normal',orientation:0,duration:28,
  stages:['조합 탄막 시작','교대 발사','연속 조합','숙련 조합'],
  enter:e=>{e.volley=freshVolley();},exit:e=>{e.volley.events=[];},render:()=>{},
  update:(e,dt)=>{
   e.volley.time+=dt*e.localTime(e.boss);
   while(e.emitting&&e.volley.time>=e.volley.nextMotif){
    const start=e.volley.nextMotif,sequence=e.volley.sequence++;
    for(const cue of components)e.volley.events.push({at:start+cue.at,fire:x=>{
     const nextSequence=x.volley.sequence;x.volley.sequence=sequence;cue.fire(x);x.volley.sequence=nextSequence;
    }});
    e.volley.nextMotif+=cycle;e.counter++;
   }
   flushVolley(e);
  }
 };
}
/** Four complementary moves per motif; existing bullets keep moving between cues. */
export const normalBulletCombos:BulletCombo[]=[
 combo('volley-rhythm','엇박 연쇄 탄막','OFFBEAT CASCADE','엇박 부채 → 속도차 3연탄 → 회전 부채 → 코어 펄스가 이어집니다.',6.4,[{at:0,id:'offbeat-fan'},{at:.65,id:'speed-triple'},{at:2.1,id:'rotating-fan'},{at:4.2,id:'core-pulse'}]),
 combo('volley-cross','대각 교차 쓸기','CROSSING CRESCENT','반달 쓸기와 대각선 탄 줄에 교차 가속탄·오염창을 섞습니다.',6.2,[{at:0,id:'crescent'},{at:.6,id:'diagonal-cross'},{at:2.4,id:'cross-accelerate'},{at:3.8,id:'corruption-spears'}]),
 combo('volley-curve','궤도 변칙 탄막','WARPED TRAJECTORY','점프·수평 미끄러짐·정지 후 가속·휘는 탄이 차례로 들어옵니다.',6.2,[{at:0,id:'jump-bullet'},{at:.4,id:'sliding-bullet'},{at:1.8,id:'stop-restart'},{at:3.1,id:'curving-triple'}]),
 combo('volley-gap','틈새 압박 탄막','NARROWING GAPS','느린 탄벽과 대소형 탄 사이로 피한 뒤 양끝 압박·쌍둥이 탄을 넘습니다.',6.6,[{at:0,id:'wall-gap'},{at:.7,id:'large-small'},{at:2.6,id:'edge-pressure'},{at:3.2,id:'twin-bullets'}]),
 combo('volley-core','코어 분열 탄막','FRACTURED CORE','비대칭 방사와 짧은 수축 뒤 중앙 분기·지연 폭발탄이 이어집니다.',6.4,[{at:0,id:'asymmetric-ring'},{at:.9,id:'core-contract'},{at:1.9,id:'center-fork'},{at:2.4,id:'delayed-burst'}])
];
export const normalBulletPatterns:Pattern[]=normalBulletCombos;
/** Every trajectory transition uses this bullet's local clock, never global encounter time. */
export function prepareBullet(e:Engine,h:Entity,dt:number){const m=h.motion;if(!m)return;const age=h.age-h.warn;m.stage??=0;m.timer??=0;
 if(m.kind==='jump'&&m.stage===1)h.vy+=410*dt;
 if(m.kind==='curve'&&h.y>=(m.trigger??0)){const turn=Math.min(.22*dt,Math.max(0,.18-(m.offset??0)));m.offset=(m.offset??0)+turn;const a=Math.atan2(h.vy,h.vx)+(m.side??1)*turn,sp=Math.hypot(h.vx,h.vy);h.vx=Math.cos(a)*sp;h.vy=Math.sin(a)*sp;}
 if(m.kind==='twins'&&h.y>=(m.trigger??0)){const desired=(m.anchor?.x??0)+(m.side??1)*Math.max(18,(m.offset??62)-(h.y-(m.trigger??0))*.13);h.vx=(desired-h.x)*6;}
 if(m.kind==='contract'){const scale=age<.85?1:age<1.05?-.65:1.15;h.vx=m.direction!.x*m.speed!*scale;h.vy=m.direction!.y*m.speed!*scale;}
}
export function finishBullet(e:Engine,h:Entity,dt:number){const m=h.motion;if(!m)return;m.timer=(m.timer??0)+dt;const along=m.direction&&m.anchor?dot({x:h.x-m.anchor.x,y:h.y-m.anchor.y},m.direction):0;
 if(m.kind==='jump'&&m.stage===0&&h.y>=(m.trigger??0)){h.vy=-180;m.stage=1;}
 if(m.kind==='stop'){if(m.stage===0&&along>=(m.trigger??0)){h.vx=h.vy=0;m.stage=1;m.timer=0;e.fx(h,'ring',24,pink,.7);}else if(m.stage===1&&m.timer>=.7){h.vx=m.direction!.x*m.speed!;h.vy=m.direction!.y*m.speed!;m.stage=2;e.fx(h,'burst',26,pink,.2);}}
 if(m.kind==='fork'&&m.stage===0&&h.y>=(m.trigger??0)){m.stage=1;h.life=0;for(const a of [Math.PI*.75,Math.PI/2,Math.PI*.25])bullet(e,h,a,235,'중앙 분기 자탄',{r:9,warn:0,motion:undefined});e.fx(h,'burst',48,violet,.3);}
 if(m.kind==='edge-burst'){if(m.stage===0&&(Math.abs(h.x)+h.r>=e.fieldW/2||Math.abs(h.y)+h.r>=e.fieldH/2)){h.x=clamp(h.x,-e.fieldW/2+h.r,e.fieldW/2-h.r);h.y=clamp(h.y,-e.fieldH/2+h.r,e.fieldH/2-h.r);h.vx=h.vy=0;m.stage=1;m.timer=0;e.fx(h,'ring',32,pink,.55);}else if(m.stage===1&&m.timer>=.55){m.stage=2;h.life=0;for(let i=0;i<4;i++)bullet(e,h,i*Math.PI/2,245,'지연탄 4방향 파편',{r:6,warn:0,motion:undefined});e.fx(h,'burst',50,pink,.3);}}
 if(m.kind==='cross'&&m.stage===0&&along>=(m.trigger??0)){m.stage=1;h.vx=m.direction!.x*m.speed!;h.vy=m.direction!.y*m.speed!;e.fx(h,'burst',26,pink,.2);}
 if(m.kind==='slide'){if(m.stage===0&&h.y>=(m.trigger??0)){m.stage=1;m.timer=0;h.vx=(m.side??1)*230;h.vy=0;}else if(m.stage===1&&m.timer>=.45){m.stage=2;h.vx=0;h.vy=m.speed??195;}}
 if(m.kind==='spear'&&along>=(m.trigger??0)){m.stage=1;h.life=0;e.fx(h,'burst',30,pink,.25);}
}
export function bulletHarmless(h:Entity){return h.motion?.kind==='cross'&&h.motion.target&&distance(h,h.motion.target)<35||h.life<=0;}
