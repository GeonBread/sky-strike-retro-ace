import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine,PLAYER_MOVE_SPEED,BASE_FIELD_W,BASE_FIELD_H} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {menuArt,menuLayout,menuBackgroundPath} from '../../src/game/chapter3/degreeon/originalUi';
import {MENU_ATTACK_START,spawnMenuProjectile,menuProjectileHits,menuProjectileExited} from '../../src/game/chapter3/degreeon/menuDeception';
import {sampleMenuCinematic,menuBreachTime,ARENA_BREACH_TIME,MENU_SLIDE_START,MENU_SLIDE_END} from '../../src/game/chapter3/degreeon/menuCinematic';
import {polygonArea,pointInPolygon} from '../../src/game/chapter3/degreeon/core';
const run=(e:Engine,t:number)=>{for(let i=0;i<Math.round(t*120);i++)e.step(1/120);};
const active=(id='menu-deception',stage=0)=>{const e=new Engine({getContext:()=>({})} as any,patterns);e.select(patterns.findIndex(p=>p.id===id));if(stage)e.begin(e.index,stage);e.invincible=true;return e;};
test('menu starts with a real throw and gradual full-viewport reveal; input and bombs unlock after arrival',()=>{
 const e=active();e.keys=new Set(['a',' ']);e.bomb();assert.equal(e.bombs,3);run(e,.6);assert.ok(e.localPlayer().y<200);assert.equal(e.shots.length,0);assert.equal(e.menuDeception.phase,'throw');assert.ok(e.fieldW<e.gridSize().w);run(e,2.1);assert.equal(e.menuDeception.phase,'reveal');assert.deepEqual({w:e.fieldW,h:e.fieldH},e.gridSize());
 run(e,.7);e.player=e.screen({x:0,y:0});e.keys=new Set(['d','w']);run(e,.3);assert.ok(Math.abs(Math.hypot(e.localPlayer().x,e.localPlayer().y)-PLAYER_MOVE_SPEED*.3)<.001);assert.ok(e.playerFacing>.3);e.rotate();assert.equal(e.rotation,0);
});
test('all six original menu elements retain exact layout aspect ratio and local-time backgrounds',()=>{
 assert.equal(menuArt.length,6);const layout=menuLayout(1600,900);assert.equal(layout[0].w,330);assert.equal(layout[4].x,0);assert.equal(layout[5].x,-724);assert.equal(layout[4].h,144);
 for(const a of layout)assert.ok(Math.abs(a.h/a.w-menuArt.find(m=>m.id===a.id)!.ratio)<1e-6);
 const layouts=menuLayout(800,450);for(let i=0;i<6;i++){assert.equal(layouts[i].x,layout[i].x/2);assert.equal(layouts[i].w,layout[i].w/2);}
 const paths=[2,5,12,18].map(hour=>menuBackgroundPath(new Date(2026,0,1,hour)));assert.equal(new Set(paths).size,4);
});
test('copies spawn outside all four edges and only travel on a horizontal or vertical axis',()=>{
 const e=active();run(e,MENU_ATTACK_START+.02);e.menuDeception.projectiles=[];const dirs=new Set<string>(),arts=new Set<number>();
 for(let i=0;i<150;i++){spawnMenuProjectile(e);const p=e.menuDeception.projectiles.at(-1)!;assert.equal(Number(!!p.vx)+Number(!!p.vy),1);assert.ok(Math.abs(p.x)>e.fieldW/2||Math.abs(p.y)>e.fieldH/2);dirs.add(p.vx<0?'left':p.vx>0?'right':p.vy<0?'up':'down');arts.add(p.art);assert.equal(menuProjectileHits(p,p),false);p.age=p.warn;assert.equal(menuProjectileHits(p,p),true);}
 assert.equal(dirs.size,4);assert.equal(arts.size,6);
});
test('7–10 second menu salvoes end smoothly, retain hazards while fading and cannot skip restoration',()=>{
 for(let stage=0;stage<4;stage++){const e=active('menu-deception',stage);assert.equal(e.menuDeception.attackDuration,7+stage);run(e,MENU_ATTACK_START+7+stage-.1);assert.equal(e.phase,'active');assert.ok(e.menuDeception.serial>15);run(e,5);assert.ok(e.logs.some(x=>x.includes('패턴 종료')));}
 const e=active();run(e,7);const count=e.menuDeception.projectiles.length;e.finish();assert.equal(e.menuDeception.phase,'return');assert.equal(e.menuDeception.projectiles.length,count);e.skip();assert.equal(e.phaseTime,0);run(e,1.1);assert.ok(e.fieldW>BASE_FIELD_W&&e.fieldW<e.gridSize().w);run(e,1.05);assert.equal(e.phase,'outro');assert.ok(Math.abs(e.fieldW-BASE_FIELD_W)<3);assert.ok(Math.abs(e.fieldH-BASE_FIELD_H)<3);run(e,.1);assert.equal(e.phase,'active');assert.equal(e.menuDeception.phase,'throw');
});
test('both scene planes retain their actual size, travel right, and the player crosses both physical walls',()=>{
 for(const v of [{w:1600,h:960},{w:960,h:1707},{w:3200,h:960}]){
  const at=(t:number)=>sampleMenuCinematic(v.w,v.h,t,{x:0,y:404},{x:0,y:-300});
  let prevArena=0,prevMenu=-v.w*1.2;
  for(let i=0;i<400;i++){const q=at(i/100);assert.equal(q.arena.w,BASE_FIELD_W);assert.equal(q.arena.h,BASE_FIELD_H);assert.equal(q.arena.scale,1);assert.equal(q.menu.w,v.w);assert.equal(q.menu.h,v.h);assert.ok(q.arena.x>=prevArena);assert.ok(q.menu.x>=prevMenu);prevArena=q.arena.x;prevMenu=q.menu.x;}
  const before=at(ARENA_BREACH_TIME-.001),hit=at(ARENA_BREACH_TIME),after=at(ARENA_BREACH_TIME+.001);
  assert.ok(before.player.x>before.arena.x-BASE_FIELD_W/2);assert.ok(Math.abs(hit.player.x-(hit.arena.x-BASE_FIELD_W/2))<1e-6);assert.ok(after.player.x<after.arena.x-BASE_FIELD_W/2);
  const t=menuBreachTime(v.w),a=at(t-.001),b=at(t),c=at(t+.001);assert.ok(t>MENU_SLIDE_START&&t<MENU_SLIDE_END);assert.ok(a.player.x>a.menu.x+v.w/2);assert.ok(Math.abs(b.player.x-(b.menu.x+v.w/2))<.00001);assert.ok(c.player.x<c.menu.x+v.w/2);assert.ok(Math.abs(at(3.25).menu.x)<1e-9);
 }
});
test('last warned buttons launch, finish crossing the full viewport and only then allow automatic return',()=>{
 for(let stage=0;stage<4;stage++){
  const e=active('menu-deception',stage);run(e,MENU_ATTACK_START+e.menuDeception.attackDuration+.01);assert.equal(e.phase,'active');assert.equal(e.menuDeception.phase,'drain');const serial=e.menuDeception.serial;assert.ok(e.menuDeception.projectiles.length>0);assert.ok(e.menuDeception.projectiles.some(h=>h.age<h.warn));
  let sawWarningFinish=false;for(let i=0;i<120*8&&e.phase==='active';i++){const pending=e.menuDeception.projectiles.find(h=>h.age<h.warn);e.step(1/120);assert.equal(e.menuDeception.serial,serial);if(pending&&pending.age>=pending.warn)sawWarningFinish=true;if(e.menuDeception.projectiles.length)assert.equal(e.phase,'active');}
  assert.ok(sawWarningFinish);assert.equal(e.menuDeception.projectiles.length,0);assert.equal(e.phase,'outro');
 }
 const e=active();run(e,MENU_ATTACK_START+.01);const h=e.menuDeception.projectiles[0];Object.assign(h,{age:1,warn:.45,x:e.fieldW/2+39,y:0,w:80,h:30,vx:650,vy:0});assert.equal(menuProjectileExited(e,h),false);h.x=e.fieldW/2+49;assert.equal(menuProjectileExited(e,h),true);h.age=.1;assert.equal(menuProjectileExited(e,h),false);
});
test('original monster preview schedules exactly twenty spawns, pauses, and clears on selection',()=>{
 const e=active('menu-deception-mobs');run(e,12);assert.equal(e.menuDeception.spawned,20);const state=JSON.stringify(e.menuDeception);e.paused=true;run(e,2);assert.equal(JSON.stringify(e.menuDeception),state);e.select(patterns.findIndex(p=>p.id==='flowers'));assert.equal(e.menuDeception.spawned,0);assert.equal(e.menuDeception.wave,null);assert.equal(e.stormInputLocked,false);
});
test('ESC return closes windows before shrinking, and waits before advancing queued patterns',()=>{
 const e=active('pause-storm');run(e,7);const count=e.pauseStorm.windows.length;e.queuedIndex=patterns.findIndex(p=>p.id==='flowers');e.finish();assert.equal(e.pauseStorm.phase,'return');assert.equal(e.pauseStorm.windows.length,count);e.skip();assert.equal(e.phaseTime,0);run(e,.7);assert.equal(e.fieldW,e.gridSize().w);run(e,.5);assert.ok(e.fieldW<e.gridSize().w&&e.fieldW>BASE_FIELD_W);e.paused=true;const age=e.pauseStorm.returnAge;run(e,1);assert.equal(e.pauseStorm.returnAge,age);e.paused=false;run(e,1.1);assert.equal(e.pattern.id,'flowers');assert.equal(e.pauseStorm.windows.length,0);
});
test('space cut is a support and combines with normals, morph, rotation, time and three clones',()=>{
 assert.equal(patterns.find(p=>p.id==='cut')!.category,'support');const e=active('volley-core');e.selectedSupports=new Set(['cut','shape','rotation','time','clones']);e.restart();e.invincible=true;e.skip();run(e,.1);for(let i=0;i<2400;i++){e.step(1/120);assert.ok(Number.isFinite(e.player.x));if(e.cutPolygon.length)for(const p of e.bodies())assert.ok(pointInPolygon(e.local(p),e.cutPolygon));}
 assert.ok(e.cutCount>0);assert.ok(Math.abs(polygonArea(e.cutPolygon))<e.fieldW*e.fieldH);assert.ok(e.hazards.length>0);
});
