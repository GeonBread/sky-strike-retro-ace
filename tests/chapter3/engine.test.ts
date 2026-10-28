import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, reflectedPath, segmentDistance, distance, CANVAS_CX, CANVAS_CY, CANVAS_W, CANVAS_H, MAX_HP, MAX_BOMBS, SMART_BOMB_SPEED } from '../../src/game/chapter3/degreeon/engine';
import { patterns } from '../../src/game/chapter3/degreeon/patterns';
const make=()=>new Engine({getContext:()=>({})} as any,patterns);
const run=(e:Engine,seconds:number)=>{for(let n=0;n<Math.ceil(seconds*120);n++)e.step(1/120);};
const active=(id:string,stage=0)=>{const e=make();e.begin(patterns.findIndex(p=>p.id===id),stage);e.skip();run(e,.02);return e;};

test('story combat shell starts with the specified player center, LIFE and BOMB stock',()=>{
  const e=make();assert.equal(e.player.x,CANVAS_CX);assert.equal(e.player.y,884);assert.equal(e.hp,MAX_HP);assert.equal(e.bombs,MAX_BOMBS);
  e.skip();run(e,.02);e.cooldown=0;e.hit('test');assert.equal(e.hp,2);assert.ok(e.cooldown>2.7);assert.equal(e.damageFlash,.85);
  e.cooldown=0;e.hit('test');e.cooldown=0;e.hit('test');assert.equal(e.hp,0);assert.equal(e.deaths,1);assert.ok(e.dead>1);run(e,1.2);assert.equal(e.gameOver,true);
});
test('all attack categories × 4 stages: finite state and bounded objects through transitions',()=>{
  for(const p of patterns)for(let s=0;s<4;s++){
    const e=active(p.id,s);e.invincible=true;run(e,12);if(p.id==='exile'){e.advanced.exile.world={...e.advanced.exile.portal};run(e,3);}else run(e,p.id==='last-stand'?33:23);
    assert.ok(Number.isFinite(e.player.x)&&Number.isFinite(e.player.y),p.id);
    assert.ok(e.hazards.length<180,p.id);assert.ok(e.shots.length<150);assert.ok(e.effects.length<=250);
    assert.ok(e.logs.some(x=>x.includes('패턴 종료')),p.id);
    if(e.debtEnabled)assert.ok(e.logs.some(x=>x.includes('폭격')),p.id);
  }
});
test('90 degree entry really changes shot direction from up to right',()=>{
  const e=active('wall');assert.equal(e.orientation,1);
  const before=e.screen({x:0,y:100}),after=e.screen({x:0,y:50});assert.ok(after.x>before.x);assert.ok(Math.abs(after.y-before.y)<1e-6);
  assert.ok(e.player.x<CANVAS_CX);
});
test('multi rotation retains hazards, advances projectiles and does not grant immunity',()=>{
  const e=active('rotation');e.beat=100;e.autoFire=false;e.cooldown=0;
  const h=e.add({x:70,y:0,vx:50,warn:0,life:10});e.rotate();const start=e.t;run(e,.6);
  assert.ok(e.hazards.includes(h));assert.ok(h.x>95);assert.ok(e.t>start+.5);assert.equal(e.cooldown,0);
  run(e,1.5);assert.equal(e.orientation,1);assert.equal(e.cooldown,0);
});
test('screen controls remain rightward through arbitrary field angles',()=>{
  const e=active('rotation');e.invincible=true;e.autoFire=false;e.beat=100;e.angle=.71;e.player={x:CANVAS_CX,y:CANVAS_CY};e.keys.add('d');run(e,.1);
  assert.ok(e.player.x>CANVAS_CX+35);assert.ok(Math.abs(e.player.y-CANVAS_CY)<1e-6);
});
test('rhythm: center lane, horizontal lock, gravity, judgement-line explosion and hold',()=>{
  const e=active('rhythm');e.beat=100;e.autoFire=false;assert.equal(e.lane,2);
  const x=e.player.x;e.keys.add('d');run(e,.3);assert.ok(Math.abs(e.player.x-x)<.1);
  e.keys.clear();e.keys.add('ArrowUp');run(e,.05);assert.equal(e.lane,1);e.keys.clear();
  const h=e.add({kind:'note',x:0,y:e.fieldH/2-105,vy:100,warn:0,life:5,lane:2,hold:1});run(e,.08);
  assert.ok(h.vy>100);assert.ok(!e.hazards.includes(h));
  const blast=e.hazards.find(h=>h.tag==='판정선 레인 폭발');assert.ok(blast);assert.equal(blast.life,1);assert.ok(e.effects.some(f=>f.kind==='lane'));
});
test('flight locks x to one third; SPACE rises, release falls, wall contact kills',()=>{
  const e=active('flight');e.beat=100;e.autoFire=false;e.cooldown=0;
  const start=e.player.y;e.keys.add(' ');run(e,.35);assert.ok(e.player.y<start);const x=e.player.x;
  e.keys.clear();run(e,.9);assert.ok(e.flightV>0);assert.ok(Math.abs(e.player.x-x)<1e-6);
  e.player=e.screen({x:e.fieldW/2-10,y:e.fieldH/6});e.flightV=80;e.step(1/120);assert.equal(e.hp,MAX_HP-1);assert.equal(e.deaths,0);assert.ok(e.cooldown>2.7);
});
test('clones fire three shots, edge clone hit shares LIFE and reunites on exit',()=>{
  const e=active('clones');e.keys.add(' ');e.beat=100;run(e,.6);e.shots=[];e.shotTimer=0;e.step(1/120);assert.equal(e.shots.length,3);
  e.autoFire=false;e.cooldown=0;const b=e.bodies()[0];e.add({...e.local(b),r:6,warn:0,life:.1});e.step(1/120);assert.equal(e.hp,MAX_HP-1);assert.equal(e.deaths,0);assert.equal(e.dead,0);assert.equal(e.shots.length,0);
  assert.equal(e.bodies().length,3);e.finish();run(e,1);assert.ok(e.split<.01);
});
test('boss hits are excluded from misses; offscreen shots count once',()=>{
  const e=active('miss');e.autoFire=false;e.beat=100;e.shots=[{x:e.boss.x,y:e.boss.y+1,vy:0,age:0}];e.updateShots(.001);assert.equal(e.bossHits,1);assert.equal(e.miss,0);
  e.shots=[{x:240,y:-e.fieldH/2-20,vy:-100,age:0}];e.updateShots(.01);e.updateShots(.01);assert.equal(e.miss,1);
});
test('full gauge queues instead of interrupting; 15 bombs maximum then restore',()=>{
  const e=active('rockets');e.autoFire=false;e.invincible=true;e.beat=100;
  for(let i=0;i<200;i++)e.recordMiss();assert.equal(e.miss,120);assert.equal(e.pendingBombard,true);assert.equal(e.phase,'active');
  e.next();run(e,2.5);assert.equal(e.phase,'bombard');assert.equal(e.bombTotal,15);
  run(e,1.8);assert.ok(e.fieldW>890);run(e,25);assert.ok(e.logs.some(x=>x.includes('폭격 종료')));assert.equal(e.fieldW,CANVAS_W);assert.equal(e.fieldH,CANVAS_H);assert.ok(e.bombSpawned<=15);
});
test('30s deadline queues low meter and bomb count follows ceil ratio',()=>{
  const e=active('rockets');e.invincible=true;e.autoFire=false;e.miss=40;e.missTimer=29.99;e.step(.02);assert.equal(e.pendingBombard,true);e.finish();run(e,3);assert.equal(e.bombTotal,5);
});
test('connection line itself is lethal after warning and fades after separation',()=>{
  const e=active('link');e.autoFire=false;e.beat=100;e.hazards=[];e.links=[];e.cooldown=0;e.player=e.screen({x:0,y:100});
  const a=e.add({x:-60,y:100,warn:0,life:10,tag:'접합 탄체'}),b=e.add({x:60,y:100,warn:0,life:10,tag:'접합 탄체'});
  run(e,.6);assert.equal(e.hp,MAX_HP);run(e,.75);assert.equal(e.hp,MAX_HP-1);
  a.x=-240;b.x=240;run(e,.6);assert.equal(e.links.length,0);
});
test('rockets are cardinal, spawn outside, and warn before moving',()=>{
  const e=active('rockets',3);e.autoFire=false;e.step(.01);const rockets=e.hazards.filter(h=>h.kind==='rocket');assert.ok(rockets.length>=2);
  for(const h of rockets){assert.ok(h.vx===0||h.vy===0);assert.ok(Math.abs(h.x)>e.fieldW/2||Math.abs(h.y)>e.fieldH/2);assert.ok(h.warn>=1);}
});
test('mirror paths reflect at exact walls at most five times; aim locks before firing',()=>{
  const path=reflectedPath({x:0,y:0},.6,540,650,5);assert.equal(path.length,7);
  for(const p of path.slice(1))assert.ok(Math.abs(Math.abs(p.x)-270)<.01||Math.abs(Math.abs(p.y)-325)<.01);
  const e=active('mirror',2);e.invincible=true;e.autoFire=false;run(e,1.7);const l=e.lasers[0];assert.equal(l.paths.length,3);const fixed=JSON.stringify(l.paths);e.player.x+=80;run(e,.4);assert.equal(JSON.stringify(l.paths),fixed);assert.equal(l.fired,false);run(e,.4);assert.equal(l.fired,true);
  assert.equal(segmentDistance({x:5,y:4},{x:0,y:0},{x:10,y:0}),4);
});
test('pause freezes combat and smart bomb expands from the player instead of instant-clearing',()=>{
  const e=active('clones');run(e,.5);e.keys.add(' ');e.step(.01);assert.equal(e.paused,false);e.keys.clear();
  const origin={...e.player};const local=e.localPlayer();e.hazards=[];e.beat=100;e.add({x:local.x+220,y:local.y,r:6,warn:0,life:8});
  e.bomb();assert.equal(e.bombs,MAX_BOMBS-1);assert.equal(e.smartBombActive,true);assert.equal(e.bombParticles.length,60);assert.ok(distance(e.smartBombOrigin,origin)<.01);assert.equal(e.hazards.length,1);
  e.step(.05);assert.ok(e.smartBombRadius>=SMART_BOMB_SPEED*.049);assert.equal(e.hazards.length,1);run(e,.18);assert.equal(e.hazards.length,0);
  e.paused=true;const t=e.t;e.step(1);assert.equal(e.t,t);
});
test('expert restart and immediate pattern selection preserve valid transition state',()=>{
  const e=active('clones');e.expert=true;e.restart();assert.equal(e.stage,2);e.select(8);assert.equal(e.phase,'intro');assert.equal(e.pattern.id,'mirror');assert.equal(e.stage,2);
});
test('space cut creates up to four real polygon fragments and reduces playable area',()=>{
  const e=active('cut',3);e.invincible=true;e.autoFire=false;const initial=e.fieldW*e.fieldH;run(e,13);
  assert.equal(e.cutCount,4);assert.equal(e.cutPieces.length,4);assert.ok(e.cutPolygon.length>=3);
  const area=Math.abs(e.cutPolygon.reduce((a,p,i)=>{const q=e.cutPolygon[(i+1)%e.cutPolygon.length];return a+p.x*q.y-q.x*p.y;},0)/2);
  assert.ok(area<initial*.82);assert.ok(area>initial*.2);assert.ok(e.cutPieces.some(p=>Math.hypot(p.offset.x,p.offset.y)>20));
});
test('full grid uses all cells, escalates danger and preserves reachable refuge',()=>{
 const e=active('split8',3);e.invincible=true;e.autoFire=false;run(e,.9);
 const total=e.tileCols*e.tileRows;assert.ok(total>8);assert.equal(e.tileDanger.length,Math.round(total*.2));
 assert.equal(e.tileSafe.length+e.tileDanger.length,total);
 const current=e.tileIndex(e.localPlayer());
 assert.ok(e.tileSafe.some(i=>Math.abs(i%e.tileCols-current%e.tileCols)+Math.abs(Math.floor(i/e.tileCols)-Math.floor(current/e.tileCols))<=1));
 e.player=e.screen({x:0,y:205});e.keys.add('ArrowUp');run(e,.5);e.keys.clear();assert.ok(e.localPlayer().y<0);
 while(e.tileState!=='warning'||e.tileRound<1)e.step(1/120);
 assert.equal(e.tileDanger.length,Math.round(total*.35));
 const index=e.tileDanger[0];e.player=e.screen({x:-e.fieldW/2+(index%e.tileCols+.5)*e.fieldW/e.tileCols,y:-e.fieldH/2+(Math.floor(index/e.tileCols)+.5)*e.fieldH/e.tileRows});
 e.invincible=false;e.cooldown=0;e.tileTimer=.001;e.step(.01);assert.equal(e.hp,2);assert.equal(e.tileState,'blast');
});
test('fluid arena rotates, accelerates steering, builds flow, and bends shots',()=>{
  const e=active('fluid',3);e.invincible=true;e.autoFire=false;run(e,9);e.player=e.screen({x:0,y:0});e.fluidPlayerV={x:0,y:0};e.keys.add('d');run(e,1.4);e.keys.clear();
  assert.ok(e.fluidThrottle>.4);assert.ok(Math.hypot(e.fluidPlayerV.x,e.fluidPlayerV.y)>10);assert.ok(e.fluidFill>.12);assert.ok(Math.abs(e.angle)>.4);assert.ok(Math.hypot(e.fluidFlow.x,e.fluidFlow.y)>40);
  e.shots=[{x:0,y:120,vx:0,vy:-360,age:0,phase:0}];run(e,.5);assert.ok(e.shots.length===1);assert.ok(Math.abs(e.shots[0].x)>1);assert.notEqual(Math.round(e.shots[0].vy),-360);
});

test('display and battlefield share full size, rotations preserve length and local player anchor',()=>{
 const e=active('rotation');e.invincible=true;e.beat=100;
 assert.equal(e.fieldW,CANVAS_W);assert.equal(e.fieldH,CANVAS_H);
 const corner={x:CANVAS_W/2,y:CANVAS_H/2};
 for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI]){e.angle=angle;assert.equal(e.zoom,1);const screen=e.screen(corner);assert.ok(Math.abs(Math.hypot(screen.x-CANVAS_CX,screen.y-CANVAS_CY)-Math.hypot(corner.x,corner.y))<1e-6);}
 e.angle=0;e.orientation=0;e.player=e.screen({x:35,y:120});const p=e.localPlayer();e.rotate();run(e,2.1);assert.ok(distance(e.localPlayer(),p)<1e-6);
});

test('selection escapes every phase, game over and purification immediately',()=>{
 for(const phase of ['intro','active','outro','bombard','restore'] as const){
  const e=active('miss');e.phase=phase;e.gameOver=true;e.purification=2;e.pendingBombard=true;e.paused=true;e.select(2);
  assert.equal(e.index,2);assert.equal(e.phase,'intro');assert.equal(e.paused,false);assert.equal(e.gameOver,false);assert.equal(e.purification,-1);assert.equal(e.pendingBombard,false);
 }
});
test('horizontal stages and bombardment retain their orientation',()=>{
 const e=active('wall');e.invincible=true;const a=e.angle;e.finish();assert.equal(e.rotation,0);assert.equal(e.angle,a);
 e.advance();assert.equal(e.rotation,0);assert.equal(e.angle,a);
 e.startBombard();assert.equal(e.angle,a);assert.equal(e.rotation,0);
});

test('fluid has airborne gravity before swimming and returns facing after exit',()=>{
 const e=active('fluid');e.invincible=true;e.angle=0;e.rotation=0;e.fluidFill=.05;e.player=e.screen({x:0,y:-150});
 e.keys.add('ArrowUp');const y=e.player.y;e.move(.1);
 assert.ok(e.player.y>y);assert.equal(e.fluidThrottle,0);assert.equal(e.fluidWet,false);
 e.player=e.screen({x:0,y:460});e.move(.01);
 assert.equal(e.fluidWet,true);assert.ok(e.effects.some(f=>f.kind==='burst'));assert.ok(e.fluidThrottle>0);
 e.playerFacing=2;e.fluidHeading=2;e.startBombard();run(e,.5);assert.ok(Math.abs(e.playerFacing)<.01);
});
test('rhythm arena has a longer horizontal run without widening lanes',()=>{
 const e=active('rhythm');assert.equal(e.fieldW,922);assert.equal(e.fieldH,1600);
 assert.ok(e.width/e.height>1.7);
 e.pattern.update(e,0);assert.ok(e.hazards.some(h=>h.y===-780));
});
