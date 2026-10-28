import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {configureZones,laserSegments,updateLightning} from '../../src/game/chapter3/degreeon/advanced';
import {makeTimeZones,timedMotion,pathTimeCost} from '../../src/game/chapter3/degreeon/time';
import {bombReaches} from '../../src/game/chapter3/degreeon/bomb';
const run=(e:Engine,t:number)=>{for(let i=0;i<Math.ceil(t*120);i++)e.step(1/120);};
const active=()=>{const e=new Engine({getContext:()=>({})} as any,patterns);e.selectedSupports=new Set(['time']);e.select(patterns.findIndex(p=>p.id==='flowers'));e.phase='active';e.rotation=0;e.beat=100;e.invincible=true;return e;};
test('boundary integration uses the remaining real time in the new zone in either direction',()=>{
 const z=makeTimeZones(600,600,false),a={x:-110,y:0},b={x:-90,y:0};timedMotion(z,a,{x:100,y:0},.4);timedMotion(z,b,{x:-100,y:0},.4);assert.ok(Math.abs(a.x+80)<1e-7);assert.ok(Math.abs(b.x+115)<1e-7);
 const c={x:-250,y:0};timedMotion(z,c,{x:1000,y:0},.65);assert.ok(Math.abs(c.x-400)<1e-6);
});
test('enemy bullets, player shots and player movement share boundary traversal',()=>{
 const e=active();e.fieldW=600;e.fieldH=600;configureZones(e);const h=e.add({x:-110,y:0,vx:100,vy:0,warn:0,life:10}),s={x:-110,y:40,vx:100,vy:0,age:0};e.shots=[s];e.updateEntities(.4);e.updateShots(.4);assert.ok(Math.abs(h.x-s.x)<1e-8);assert.ok(Math.abs(h.age-s.age)<1e-8);
 e.player=e.screen({x:-110,y:0});e.keys.add('ArrowRight');e.move(.4);assert.ok(Math.abs(e.localPlayer().x-72)<1e-5);
});
test('boss movement clock, firing clock, enemy, item and explosion particles share local scale',()=>{
 const e=active(),slow=e.advanced.zones[0],fast=e.advanced.zones[2];const a=e.addEnemy({x:slow.x,y:100,vy:20,fireTimer:1,firePeriod:2}),b=e.addEnemy({x:fast.x,y:100,vy:20,fireTimer:1,firePeriod:2}),c=e.addItem({x:slow.x,y:100,vy:20}),d=e.addItem({x:fast.x,y:100,vy:20});e.updateWorldActors(.1);assert.equal(b.age/a.age,4);assert.ok(Math.abs((1-b.fireTimer)/(1-a.fireTimer)-4)<1e-10);assert.equal(d.age/c.age,4);
 e.bombParticles=[{x:slow.x,y:100,vx:0,vy:20,age:0,life:2,size:4,color:'#fff'},{x:fast.x,y:100,vx:0,vy:20,age:0,life:2,size:4,color:'#fff'}];e.updateSmartBomb(.1);assert.equal(e.bombParticles[1].age/e.bombParticles[0].age,4);
 e.boss={x:slow.x,y:-100};e.beat=10;e.step(.1);assert.ok(Math.abs(e.bossAnimClock-.05)<1e-8);assert.ok(Math.abs(e.beat-9.95)<1e-8);
});
test('wave fronts and beam propagation obey path-local time and still reach slow corners',()=>{
 const e=active();e.fieldW=600;e.fieldH=600;configureZones(e);e.player=e.screen({x:0,y:0});e.bomb();e.smartBombRadius=160;assert.equal(bombReaches(e,{x:200,y:0}),true);assert.equal(bombReaches(e,{x:-200,y:0}),false);
 const path=[{x:-200,y:0},{x:200,y:0}],seg=laserSegments(path,3,e.advanced.zones,{head:.06,tail:0});assert.ok(Math.abs(seg[0][1].x-12)<1e-7);
 e.smartBombRadius=0;run(e,4);assert.equal(e.smartBombActive,false);assert.ok(e.smartBombRadius*.86>pathTimeCost([e.smartBombWorldOrigin,{x:-461,y:-480}],e.advanced.zones));
});
test('each section of a lightning line advances its warning and damage clock locally',()=>{
 const e=active();e.advanced.lightTimer=100;e.advanced.bolts=[{a:{x:-400,y:0},b:{x:400,y:0},target:{x:0,y:0},points:[{x:-400,y:0},{x:400,y:0}],branches:[],age:0,warn:.58,life:.18,fired:false,parts:[{a:{x:-400,y:0},b:{x:-300,y:0},age:0},{a:{x:300,y:0},b:{x:400,y:0},age:0}]}];updateLightning(e,.3);const b=e.advanced.bolts[0];assert.equal(b.parts![0].age,.15);assert.equal(b.parts![1].age,.6);assert.equal(b.fired,true);updateLightning(e,.5);assert.equal(e.advanced.bolts.length,1);
});
test('fullscreen resize keeps six evenly spaced scales and continuous zone clocks; exit clears them',()=>{
 const e=active();e.fullField=true;e.gridSize=()=>({w:1600,h:960});e.restart();e.phase='active';e.beat=100;run(e,.1);const before=e.advanced.zones.map(z=>z.clock);e.gridSize=()=>({w:2400,h:1200});e.syncTimeZones();assert.equal(e.fieldW,2400);assert.equal(e.fieldH,1200);assert.deepEqual(e.advanced.zones.map(z=>z.scale),[.5,.8,1.1,1.4,1.7,2]);assert.deepEqual(e.advanced.zones.map(z=>z.clock),before);e.finish();e.syncTimeZones();assert.equal(e.advanced.zones.length,0);
});
test('clones are a selectable support and combine with normals and time fields',()=>{
 const e=active();e.selectedSupports.add('clones');e.supportPreviewId='volley-rhythm';e.select(patterns.findIndex(p=>p.id==='clones'));e.phase='active';e.rotation=0;e.invincible=true;run(e,.7);assert.equal(e.pattern.category,'support');assert.equal(e.combatPattern.id,'volley-rhythm');assert.equal(e.bodies().length,3);assert.equal(e.advanced.zones.length,3);assert.ok(e.hazards.some(h=>h.tag==='엇박자 틈 탄'));e.keys.add(' ');e.shotTimer=0;e.updateShots(.01);assert.equal(e.shots.length,3);e.finish();run(e,1);assert.equal(e.bodies().length,1);
});
test('a stopped bullet waits 0.7 local seconds in either time zone before restarting',()=>{
 const e=active();e.hazards=[];const make=(x:number)=>e.add({x,y:0,warn:0,life:10,motion:{kind:'stop',stage:1,timer:0,direction:{x:0,y:1},speed:100}}),a=make(e.advanced.zones[0].x),b=make(e.advanced.zones[2].x);
 for(let i=0;i<48;i++)e.updateEntities(1/120);assert.equal(a.motion!.stage,1);assert.equal(b.motion!.stage,2);assert.equal(a.y,0);assert.ok(b.y>0);
 for(let i=0;i<125;i++)e.updateEntities(1/120);assert.equal(a.motion!.stage,2);assert.ok(a.y>0);
});
test('linked clones animate and fire with each body position local clock',()=>{
 const e=active();e.selectedSupports.add('clones');e.split=1;e.player=e.screen({x:e.fieldW/6+1,y:100});e.nativeWeapon.color='vanguard';e.keys.add(' ');
 // Count emitted projectiles: CH2's faster native shots leave the fast zone sooner.
 const emitted=new Set<(typeof e.shots)[number]>();for(let i=0;i<48;i++){e.step(1/120);for(const s of e.shots)emitted.add(s);}
 assert.ok(Math.abs(e.bodyAnimClocks[2]/e.bodyAnimClocks[0]-2)<1e-8);
 const left=[...emitted].filter(s=>s.x<e.fieldW/6),right=[...emitted].filter(s=>s.x>e.fieldW/6+50);assert.ok(right.length>left.length);
});
