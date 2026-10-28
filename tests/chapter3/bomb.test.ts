import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, distance, SMART_BOMB_SPEED } from '../../src/game/chapter3/degreeon/engine';
import { patterns } from '../../src/game/chapter3/degreeon/patterns';
import { bombView, drawBombEffects } from '../../src/game/chapter3/degreeon/bomb';
const run=(e:Engine,s:number)=>{for(let i=0;i<Math.ceil(s*120);i++)e.step(1/120);};
const active=(id='flowers')=>{const e=new Engine({getContext:()=>({})} as any,patterns);e.select(patterns.findIndex(p=>p.id===id));e.invincible=true;e.selectedSupports.clear();e.skip();run(e,.025);e.beat=1e6;e.hazards=[];return e;};
test('a wave launched at a wide-field corner continues beyond the old cap and clears the far corner',()=>{
 const e=active();e.fullField=true;e.fieldW=4000;e.player=e.screen({x:-1980,y:460});const target=e.add({x:1980,y:-450,r:8,warn:0,life:20});e.bomb();
 run(e,1.3);assert.ok(e.smartBombRadius>Math.hypot(922,960)+80);assert.equal(e.smartBombActive,true);assert.ok(e.hazards.includes(target));
 while(e.smartBombActive)e.step(1/120);assert.ok(!e.hazards.includes(target));assert.ok(e.smartBombRadius*.86>distance(e.smartBombWorldOrigin,{x:2000,y:-480}));
});
test('expansion during an active wave increases its reach while radius and source remain continuous',()=>{
 const e=active();e.player=e.screen({x:0,y:0});e.bomb();run(e,.3);const limit=e.smartBombLimit,r=e.smartBombRadius,origin={...e.smartBombWorldOrigin};e.fullField=true;e.fieldW=3600;
 const target=e.add({x:1740,y:400,r:8,warn:0,life:20});run(e,.1);assert.ok(e.smartBombLimit>limit*2);assert.ok(Math.abs(e.smartBombRadius-r-SMART_BOMB_SPEED*.1)<1e-6);assert.deepEqual(e.smartBombWorldOrigin,origin);
 run(e,.4);assert.equal(e.smartBombActive,true);while(e.smartBombActive)e.step(1/120);assert.ok(!e.hazards.includes(target));
});
test('rotation keeps the wave attached to the launch point in the battlefield',()=>{
 const e=active();e.player=e.screen({x:100,y:180});e.bomb();const origin={...e.smartBombWorldOrigin};e.angle=Math.PI/2;e.rotation=0;e.player=e.screen({x:220,y:230});
 const target=e.add({x:origin.x+130,y:origin.y,r:5,warn:0,life:10});run(e,.12);assert.deepEqual(e.smartBombWorldOrigin,origin);assert.ok(!e.hazards.includes(target));
});
test('fullscreen exile clears distant enemies without dragging the origin with the player or camera',()=>{
 const e=active('exile');run(e,4);const x=e.advanced.exile;x.world={x:-700,y:200};x.velocity={x:0,y:0};x.camera={x:0,y:0};e.player=e.screen(x.world);x.enemies=[];x.spawn=1e6;
 const enemy={x:750,y:-410,hp:2,age:0,vx:0,vy:0};x.enemies.push(enemy);e.bomb();const origin={...x.world};assert.deepEqual(e.smartBombWorldOrigin,origin);
 run(e,1.15);assert.equal(e.smartBombActive,true);assert.ok(x.enemies.includes(enemy));e.keys.add('ArrowRight');run(e,.2);e.keys.clear();assert.deepEqual(e.smartBombWorldOrigin,origin);
 while(e.smartBombActive)e.step(1/120);assert.ok(!x.enemies.includes(enemy));const v=bombView(e);for(const sx of [-1,1])for(const sy of [-1,1])assert.ok(e.smartBombRadius*.86>distance(origin,{x:v.x+sx*v.w/2,y:v.y+sy*v.h/2}));
});
test('wave damages the boss once and also clears seeds, link nodes, beams and wall fragments as it reaches them',()=>{
 const e=active();e.boss={x:0,y:0};e.player=e.screen({x:0,y:150});e.bomb();const start=e.bossHp;
 e.add({kind:'seed',x:0,y:300,warn:0,life:4,hp:2,petals:6});const a=e.add({x:180,y:150,warn:0,life:10}),b=e.add({x:210,y:150,warn:0,life:10});e.links.push({a,b,age:0,strength:1,active:true});
 e.lasers=[{age:3,aim:0,paths:[[{x:-200,y:270},{x:200,y:270}]],count:1,fired:true,lastReflect:0,reflections:[]}];
 e.advanced.bolts=[{a:{x:-200,y:290},b:{x:200,y:290},target:{x:0,y:290},points:[{x:-200,y:290},{x:200,y:290}],branches:[],age:0,warn:10,life:10,fired:false}];
 e.advanced.walls=[{y:350,vy:0,cols:1,rows:1,cellW:e.fieldW,cellH:28,cells:[1],age:0}];run(e,.35);
 assert.equal(e.bossHp,start-40);assert.equal(e.links.length,0);assert.equal(e.hazards.length,0);assert.equal(e.lasers.length,0);assert.equal(e.advanced.bolts.length,0);assert.equal(e.advanced.walls[0].cells[0],0);run(e,.3);assert.equal(e.bossHp,start-40);
});
test('completion applies the final reached targets and stops drawing instead of freezing the ring',()=>{
 const e=active();e.player=e.screen({x:0,y:0});e.bomb();const target=e.add({x:460,y:-479,r:1,w:1,h:1,warn:0,life:10});e.updateSmartBomb(1);e.resolveSmartBomb();assert.equal(e.smartBombActive,false);assert.ok(!e.hazards.includes(target));
 let arcs=0;const c={save(){},restore(){},beginPath(){},arc(){arcs++;},fill(){}} as any;e.bombParticles=[];drawBombEffects(e,c);assert.equal(arcs,0);
});
test('a wave keeps propagating through purification until its rings leave the view',()=>{
 const e=active();e.bomb();run(e,.1);const r=e.smartBombRadius;e.purification=0;run(e,.2);assert.ok(e.smartBombRadius>r+200);while(e.smartBombActive)e.step(1/120);assert.ok(e.smartBombRadius*.86>distance(e.smartBombWorldOrigin,{x:-461,y:-480}));
});
