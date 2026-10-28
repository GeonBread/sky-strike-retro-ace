import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../../src/game/chapter3/degreeon/engine';
import {pointInPolygon} from '../../src/game/chapter3/degreeon/core';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {graduationInk,stampFootprintHits,stampStrokeHits,clearStampByBomb} from '../../src/game/chapter3/degreeon/graduationStamp';
import {TRACE_RECORD_TIME,TRACE_WARN_TIME,pathFoldHits,pathSegmentLive,clearPathFoldByBomb} from '../../src/game/chapter3/degreeon/pathFold';
import {collectRecycledBullets,updateRecycle,recycleAnchor,RECYCLE_WARN_TIME,RECYCLE_COLLECT_TIME,clearRecycleByBomb} from '../../src/game/chapter3/degreeon/bulletRecycle';
import {configureZones} from '../../src/game/chapter3/degreeon/advanced';
const run=(e:Engine,t:number)=>{for(let i=0;i<Math.ceil(t*120);i++)e.step(1/120);};
const active=(id:string,stage=0)=>{const e=new Engine({getContext:()=>({})} as any,patterns);e.selectedSupports.clear();e.begin(patterns.findIndex(p=>p.id===id),stage);e.skip();run(e,.04);e.invincible=true;return e;};
test('new patterns have two exclusive special rules and one composable support',()=>{
 assert.equal(patterns.length,41);assert.equal(patterns.find(p=>p.id==='graduation-stamp')!.category,'normal');assert.equal(patterns.find(p=>p.id==='path-fold')!.category,'special');assert.equal(patterns.find(p=>p.id==='recycle')!.category,'support');
 const e=active('flowers');e.selectedSupports.add('recycle');assert.equal(e.recycleEnabled,true);e.select(patterns.findIndex(p=>p.id==='path-fold'));assert.equal(e.recycleEnabled,false);
});
test('stamp locks its telegraphed footprint and only damages when it lands, including rotated edges',()=>{
 const e=active('graduation-stamp');const s=e.graduationStamp,target={...s.target};e.invincible=false;e.cooldown=0;e.player=e.screen(target);run(e,.5);assert.equal(e.hp,3);assert.deepEqual(s.target,target);
 s.phase='press';s.age=.10;e.step(1/120);assert.equal(e.hp,3);run(e,.09);assert.equal(e.hp,2);assert.ok(s.impacted&&s.impactShake>0);
 e.cooldown=0;s.phase='ink';s.age=.1;e.player=e.screen(target);run(e,.1);assert.equal(e.hp,2);
 for(const angle of [0,.25,Math.PI/2]){s.angle=angle;const point=(x:number,y:number)=>({x:target.x+x*Math.cos(angle)-y*Math.sin(angle),y:target.y+x*Math.sin(angle)+y*Math.cos(angle)});assert.equal(stampFootprintHits(e,point(s.w/2-1,0)),true);assert.equal(stampFootprintHits(e,point(s.w/2+12,0)),false);}
});
test('Hangul strokes detach independently, preserve their own visible geometry and are cleared by a reaching bomb',()=>{
 const e=active('graduation-stamp'),s=e.graduationStamp;assert.ok(graduationInk().length>25);s.phase='scatter';s.age=0;const first={...s.strokes[0]};run(e,.15);assert.ok(Math.hypot(s.strokes[0].x-first.x,s.strokes[0].y-first.y)>10);assert.ok(s.strokes.some(f=>f.age<0));run(e,1);assert.equal(s.released,s.strokes.length);
 const f=s.strokes.find(f=>!f.ring)!;assert.equal(stampStrokeHits(f,f),true);assert.equal(stampStrokeHits(f,{x:f.x+100,y:f.y+100}),false);const ring=s.strokes.find(f=>f.ring)!;assert.equal(stampStrokeHits(ring,ring),false);assert.equal(stampStrokeHits(ring,{x:ring.x+ring.ring,y:ring.y}),true);
 e.smartBombWorldOrigin={x:f.x,y:f.y};e.smartBombRadius=1;clearStampByBomb(e);assert.equal(f.cleared,true);assert.equal(stampStrokeHits(f,f),false);assert.ok(s.strokes.some(x=>!x.cleared));
});
test('path folding records actual four-second movement and freezes it during the complete warning',()=>{
 const e=active('path-fold');e.player=e.screen({x:0,y:100});e.keys.add('a');run(e,.5);e.keys.clear();e.keys.add('w');run(e,.5);e.keys.clear();e.keys.add('d');run(e,.5);e.keys.clear();run(e,TRACE_RECORD_TIME-1.5);
 const s=e.pathFold;assert.equal(s.phase,'warn');assert.ok(s.points.length>40);assert.ok(s.points.some(p=>p.x< -100));assert.ok(s.points.some(p=>p.y<0));const points=JSON.stringify(s.points);e.keys.add('d');run(e,.5);assert.equal(JSON.stringify(s.points),points);assert.equal(s.phase,'warn');run(e,TRACE_WARN_TIME);assert.equal(s.phase,'zip');assert.ok(s.activated>0);
});
test('zipper closes the oldest path first, its warning is harmless, and its damage trails the live head',()=>{
 const e=active('path-fold'),s=e.pathFold;s.points=[{x:-200,y:0,at:0},{x:-100,y:0,at:1},{x:100,y:0,at:3},{x:200,y:0,at:4}];s.phase='warn';s.age=.3;assert.equal(pathFoldHits(e,{x:-200,y:0}),false);
 s.phase='zip';s.age=.1;assert.equal(pathSegmentLive(e,0),true);assert.equal(pathFoldHits(e,{x:-200,y:0}),true);assert.equal(pathFoldHits(e,{x:200,y:0}),false);assert.equal(pathFoldHits(e,{x:-200,y:50}),false);
 s.age=s.zipDuration+.1;assert.equal(pathSegmentLive(e,0),false);assert.equal(pathFoldHits(e,{x:200,y:0}),true);e.smartBombWorldOrigin={x:200,y:0};e.smartBombRadius=15;clearPathFoldByBomb(e);assert.equal(pathFoldHits(e,{x:200,y:0}),false);
});
test('stationary recordings still telegraph and close around the recorded point',()=>{
 const e=active('path-fold');e.player=e.screen({x:0,y:80});run(e,4.1);const s=e.pathFold;assert.equal(s.phase,'warn');assert.ok(s.points.length>=10);s.phase='zip';s.age=.1;assert.equal(pathFoldHits(e,{x:0,y:80}),true);assert.equal(pathFoldHits(e,{x:40,y:80}),false);
});
test('recycling collects real escaped bullets on all edges, rejects unlaunched or expired objects and preserves source art',()=>{
 const e=active('recycle');e.beat=100;e.hazards=[];const w=e.fieldW,h=e.fieldH;
 for(const p of [{x:-w/2-20,y:0,vx:-180,vy:0},{x:w/2+20,y:0,vx:180,vy:0},{x:0,y:-h/2-20,vx:0,vy:-180},{x:0,y:h/2+20,vx:0,vy:180}])e.add({...p,age:.2,warn:0,life:20,visual:'drop'});
 e.add({x:w/2+40,y:0,vx:200,age:0,warn:1,life:20});e.add({x:w/2+50,y:0,vx:200,age:10,warn:0,life:2});e.add({x:w/2+60,y:0,vx:200,age:1,warn:0,life:20,kind:'seed'});
 collectRecycledBullets(e);assert.equal(e.recycle.collected,4);assert.equal(e.recycle.bank.length,4);assert.equal(new Set(e.recycle.bank.map(b=>b.edge)).size,4);assert.ok(e.recycle.bank.every(b=>b.visual==='drop'));assert.equal(e.hazards.length,3);
});
test('full bank gives a complete warning, returns each captured shot once and cannot recycle its own return wave',()=>{
 const e=active('recycle');e.hazards=[];e.add({x:e.fieldW/2+30,y:0,vx:220,vy:0,age:.1,warn:0,life:20,visual:'core'});collectRecycledBullets(e);const s=e.recycle;s.age=RECYCLE_COLLECT_TIME;updateRecycle(e,.01);assert.equal(s.phase,'warn');assert.equal(e.hazards.length,0);updateRecycle(e,RECYCLE_WARN_TIME-.1);assert.equal(e.hazards.length,0);updateRecycle(e,.11);assert.equal(s.phase,'rest');assert.equal(s.returned,1);const r=e.hazards[0];assert.ok(r.recycled&&r.vx<0);assert.equal(r.visual,'core');assert.equal(s.bank.length,0);
 s.phase='collect';r.x=-e.fieldW/2-50;collectRecycledBullets(e);assert.equal(s.collected,1);assert.equal(s.bank.length,0);
});
test('bank storage is bounded, adapts to resized edges and obeys local warning time and bomb reach',()=>{
 const e=active('recycle');e.hazards=[];for(let i=0;i<150;i++)e.add({x:e.fieldW/2+30,y:100,vx:200,vy:0,warn:0,age:1,life:30});collectRecycledBullets(e);assert.equal(e.recycle.bank.length,36);
 const b=e.recycle.bank[0],old=recycleAnchor(e,b);e.fieldW+=400;assert.equal(recycleAnchor(e,b).x-old.x,200);e.selectedSupports.add('time');configureZones(e);e.recycle.phase='warn';for(const q of e.recycle.bank)q.warnAge=0;const scale=e.localTime(recycleAnchor(e,b));updateRecycle(e,.1);assert.ok(Math.abs(b.warnAge-.1*scale)<1e-9);
 e.smartBombWorldOrigin=recycleAnchor(e,b);e.smartBombRadius=1;clearRecycleByBomb(e);assert.equal(e.recycle.bank.length,0);assert.equal(e.recycle.phase,'rest');
});
test('new attacks pause and clean up across restart and manual selection without leaking into another pattern',()=>{
 for(const id of ['graduation-stamp','path-fold','recycle']){const e=active(id);run(e,2);const clocks={stamp:e.graduationStamp.age,path:e.pathFold.age,recycle:e.recycle.age};e.paused=true;run(e,2);assert.deepEqual({stamp:e.graduationStamp.age,path:e.pathFold.age,recycle:e.recycle.age},clocks);e.select(patterns.findIndex(p=>p.id==='flowers'));assert.equal(e.graduationStamp.strokes.length,0);assert.equal(e.pathFold.points.length,0);assert.equal(e.recycle.bank.length,0);}
});
test('recycling combines with all normal patterns and rotation, morph, time, erosion, cut and clones',()=>{
 for(const pattern of patterns.filter(p=>p.category==='normal')){const e=active(pattern.id);e.selectedSupports=new Set(['recycle','rotation','shape','time','erosion','cut','clones']);e.restart();e.invincible=true;e.skip();run(e,15);assert.ok(Number.isFinite(e.player.x));assert.ok(e.hazards.length<350);assert.ok(e.recycle.bank.length<=36);assert.ok(e.advanced.zones.length>0);}
});

test('cut support keeps stored crystals and their warnings on the surviving visible boundary',()=>{
 const e=active('recycle');e.selectedSupports.add('cut');e.cutPolygon=[{x:-e.fieldW/2,y:-e.fieldH/2},{x:0,y:-e.fieldH/2},{x:0,y:e.fieldH/2},{x:-e.fieldW/2,y:e.fieldH/2}];e.hazards=[];e.add({x:e.fieldW/2+30,y:50,vx:200,warn:0,age:1,life:20});collectRecycledBullets(e);assert.equal(e.recycle.bank.length,1);const crystal=e.recycle.bank[0];assert.equal(pointInPolygon(recycleAnchor(e,crystal),e.cutPolygon),true);const launch=recycleAnchor(e,crystal,true);assert.ok(launch.x>0&&launch.x<20);e.recycle.phase='warn';e.recycle.bank[0].warnAge=RECYCLE_WARN_TIME;updateRecycle(e,.01);assert.ok(e.hazards[0].vx<0);
});
