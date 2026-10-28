import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine,distance} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {normalBulletPatterns,normalBulletComponents,normalBulletCombos,bulletHarmless} from '../../src/game/chapter3/degreeon/normalBullets';
const run=(e:Engine,t:number)=>{for(let i=0;i<Math.ceil(t*120);i++)e.step(1/120);};
const active=(id:string)=>{const testPatterns=[...patterns,...normalBulletComponents];const e=new Engine({getContext:()=>({})} as any,testPatterns);e.selectedSupports.clear();e.select(testPatterns.findIndex(p=>p.id===id));e.phase='active';e.rotation=0;e.invincible=true;e.step(1/120);e.beat=100;return e;};
const speed=(h:{vx:number;vy:number})=>Math.hypot(h.vx,h.vy);
test('five selectable combos cover every one of the twenty building blocks exactly once',()=>{
 assert.equal(normalBulletPatterns.length,5);assert.equal(normalBulletComponents.length,20);assert.equal(patterns.length,41);assert.equal(patterns.filter(p=>p.category==='normal').length,15);
 const ids=normalBulletCombos.flatMap(p=>p.cues.map(c=>c.id));assert.equal(new Set(ids).size,20);assert.deepEqual([...ids].sort(),normalBulletComponents.map(p=>p.id).sort());
 for(const p of normalBulletComponents){assert.ok(!patterns.includes(p));assert.ok(p.duration>=3&&p.duration<=7);const e=active(p.id);run(e,Math.min(3,p.duration-1));assert.ok(e.serial>0,p.id);assert.ok(e.hazards.every(h=>Number.isFinite(h.x)&&Number.isFinite(h.y)),p.id);}
});
test('combo cues overlap without clearing bullets, alternate the next motif and reset on selection',()=>{
 const e=active('volley-rhythm'),first=e.hazards[0];run(e,.7);assert.ok(e.hazards.includes(first));assert.ok(e.hazards.some(h=>h.tag.startsWith('속도차')));assert.equal(e.links.length,0);
 const c=active('volley-cross'),vx=c.hazards.find(h=>h.tag==='반달 쓸기')!.vx;run(c,6.3);assert.ok(c.hazards.some(h=>h.tag==='반달 쓸기'&&h.vx*vx<0));
 e.select(e.patterns.findIndex(p=>p.id==='volley-core'));assert.equal(e.volley.time,0);assert.equal(e.volley.events.length,0);assert.equal(e.hazards.length,0);
});
test('all five combos fire every cue and remain valid with normal supports together',()=>{
 const expected=[['첫 부채탄','속도차 1탄','회전 부채탄','코어 펄스'],['반달 쓸기','대각선 교차탄','교차 후 가속','내려찍는 오염창'],['점프 탄','옆으로 미끄러지는 탄','정지 후 재출발','휘는 3연탄'],['느린 탄벽','느린 대형 오염탄','양끝 압박탄','쌍둥이 탄'],['비대칭 방사탄','보스 중심 수축탄','중앙 분기 대형탄','폭발 지연탄']];
 for(const [i,p] of normalBulletCombos.entries()){
  const e=active(p.id),seen=new Set(e.hazards.map(h=>h.tag));const add=e.add.bind(e);e.add=v=>{seen.add(v.tag!);return add(v);};run(e,7);
  for(const tag of expected[i])assert.ok(seen.has(tag),`${p.id}: ${tag}`);
  for(const fullField of [false,true]){e.fullField=fullField;e.selectedSupports=new Set(['time','clones','erosion','rotation']);e.restart();e.skip();run(e,14);assert.ok(e.hazards.length<180,p.id);assert.ok(e.hazards.every(h=>Number.isFinite(h.x)&&Number.isFinite(h.y)));assert.equal(e.advanced.zones.length,fullField?6:3);assert.equal(new Set(e.hazards.map(h=>h.id)).size,e.hazards.length);}
 }
});
test('triple speed order stays on the same locked aim and second fan bisects the first fan',()=>{
 const e=active('speed-triple');run(e,.5);assert.deepEqual(e.hazards.map(h=>Math.round(speed(h))),[130,240,410]);assert.ok(e.hazards.every(h=>Math.abs(Math.atan2(h.vy,h.vx)-Math.atan2(e.hazards[0].vy,e.hazards[0].vx))<1e-8));
 const f=active('offbeat-fan');run(f,.5);const first=f.hazards.filter(h=>h.tag==='첫 부채탄'),second=f.hazards.filter(h=>h.tag==='엇박자 틈 탄');assert.equal(first.length,5);assert.equal(second.length,5);assert.ok(Math.abs(Math.atan2(second[0].vy,second[0].vx)-Math.atan2(first[0].vy,first[0].vx)-.095)<1e-6);
});
test('crescent alternates direction, diagonal streams delay, and four fans stop after four launches',()=>{
 const e=active('crescent');assert.equal(e.hazards.length,13);const vx=e.hazards[0].vx;e.hazards=[];e.beat=0;e.step(1/120);assert.ok(e.hazards[0].vx*vx<0);
 const d=active('diagonal-cross');run(d,.35);assert.ok(d.hazards.every(h=>h.vx>0));run(d,.65);assert.ok(d.hazards.some(h=>h.vx<0));
 const f=active('rotating-fan');run(f,1.3);assert.equal(f.serial,20);run(f,.7);assert.equal(f.serial,20);
});
test('jump changes height once, stop holds for 0.7 seconds, and slide returns to downward movement',()=>{
 const e=active('jump-bullet'),h=e.hazards[2];h.age=h.warn;h.y=-35;run(e,.01);assert.equal(h.motion?.stage,1);assert.ok(h.vy<0);run(e,1);assert.ok(h.vy>0);assert.equal(h.motion?.stage,1);
 const s=active('stop-restart'),q=s.hazards[1];q.age=q.warn;q.x=q.motion!.anchor!.x+q.motion!.direction!.x*q.motion!.trigger!;q.y=q.motion!.anchor!.y+q.motion!.direction!.y*q.motion!.trigger!;run(s,.01);assert.equal(speed(q),0);const p={...q};run(s,.65);assert.equal(distance(q,p),0);run(s,.08);assert.ok(speed(q)>560);
 const z=active('sliding-bullet'),b=z.hazards[2];b.age=b.warn;b.y=-20;run(z,.01);assert.equal(b.vy,0);assert.ok(Math.abs(b.vx)>200);run(z,.5);assert.equal(b.vx,0);assert.equal(b.vy,195);
});
test('fork splits exactly once, edge burst waits before four fragments, and cross point is harmless',()=>{
 const e=active('center-fork'),h=e.hazards[0];h.y=0;run(e,.2);assert.equal(e.hazards.length,3);assert.ok(e.hazards.every(h=>!h.motion));assert.equal(e.serial,4);
 assert.equal(new Set(e.hazards.map(h=>h.id)).size,3);assert.ok(e.hazards.every(child=>child.id!==h.id&&child.visual!=='core'&&child.age<h.age));
 const b=active('delayed-burst'),q=b.hazards[1];q.age=q.warn;q.y=b.fieldH/2-q.r;run(b,.01);assert.equal(q.motion?.stage,1);run(b,.5);assert.ok(b.hazards.includes(q));run(b,.08);assert.ok(!b.hazards.includes(q));assert.equal(b.hazards.filter(h=>h.tag==='지연탄 4방향 파편').length,4);
 const c=active('cross-accelerate'),a=c.hazards[0],m=a.motion!;a.age=a.warn;a.x=m.target!.x;a.y=m.target!.y;assert.equal(bulletHarmless(a),true);run(c,.3);assert.ok(speed(a)>500);assert.equal(bulletHarmless(a),false);
});
test('wall has a wide gap, pressure leaves one escape side, asymmetry has a rotating opening',()=>{
 const e=active('wall-gap'),gap=e.localPlayer().x;assert.ok(e.hazards.every(h=>Math.abs(h.x-gap)>95));run(e,1.2);assert.equal(e.hazards.filter(h=>h.tag==='빠른 틈 탄').length,3);
 const p=active('edge-pressure');assert.ok(p.hazards.every(h=>h.y>=-p.fieldH/2+230));
 const r=active('asymmetric-ring');const angles=r.hazards.map(h=>Math.atan2(h.vy,h.vx));assert.ok(angles.every(a=>Math.abs(a-Math.PI/2)>=.62));r.hazards=[];r.beat=0;r.step(1/120);assert.notDeepEqual(r.hazards.map(h=>Math.atan2(h.vy,h.vx)),angles);
});
test('curves are gentle, contraction is brief, twins narrow late and spears disappear on impact',()=>{
 const e=active('curving-triple');run(e,.5);assert.equal(e.hazards.length,3);const h=e.hazards[0];h.y=95;const angle=Math.atan2(h.vy,h.vx);run(e,.5);assert.ok(Math.abs(Math.atan2(h.vy,h.vx)-angle)<.13);
 const c=active('core-contract'),a=c.hazards[4];run(c,1.04);assert.ok(a.vy<0);run(c,.2);assert.ok(a.vy>0);
 const t=active('twin-bullets'),[l,r]=t.hazards;assert.ok(r.x-l.x>120);l.y=r.y=200;run(t,.5);assert.ok(r.x-l.x<100);
 const s=active('corruption-spears'),q=s.hazards[0];assert.equal(s.hazards.length,3);q.age=q.warn;q.x=q.motion!.target!.x;q.y=q.motion!.target!.y;run(s,.01);assert.ok(!s.hazards.includes(q));
});
test('large pair admits three faster small bullets and final core pulse is the fastest ring',()=>{
 const e=active('large-small');run(e,.7);assert.equal(e.hazards.filter(h=>h.r===34).length,2);assert.equal(e.hazards.filter(h=>h.r===6).length,3);assert.ok(e.hazards.filter(h=>h.r===6).every(h=>speed(h)>350));
 const p=active('core-pulse');run(p,.6);assert.equal(p.serial,32);assert.equal(p.effects.filter(f=>f.kind==='burst').length<=2,true);assert.ok(p.hazards.filter(h=>h.color==='#ffeaa3').every(h=>speed(h)>340));
});
