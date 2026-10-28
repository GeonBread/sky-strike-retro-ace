import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine,distance,segmentDistance} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {configureZones,laserSegments,attackDestructibles,wallHit} from '../../src/game/chapter3/degreeon/advanced';
const run=(e:Engine,s:number)=>{for(let i=0;i<Math.ceil(s*120);i++)e.step(1/120)};
const active=(id:string,stage=0)=>{const e=new Engine({getContext:()=>({})} as any,patterns);e.begin(patterns.findIndex(p=>p.id===id),stage);e.invincible=true;e.skip();run(e,.025);return e;};
test('categories preserve requested special/support patterns and add all six new patterns',()=>{
 for(const id of ['split8','fluid','flight','rhythm','hp-sword','exile'])assert.equal(patterns.find(p=>p.id===id)?.category,'special');
 for(const id of ['cut','wall','rotation','miss','erosion','time','clones'])assert.equal(patterns.find(p=>p.id===id)?.category,'support');
 for(const id of ['flowers','lightning','rockets','link','mirror'])assert.equal(patterns.find(p=>p.id===id)?.category,'normal');
 assert.equal(new Set(patterns.map(p=>p.id)).size,patterns.length);
});
test('flower grows for three local seconds and launches exactly 6 to 8 petals in sequence',()=>{
 const e=active('flowers');e.beat=100;e.hazards=[];const seed=e.add({kind:'seed',x:0,y:0,warn:0,life:4,hp:2,petals:7,petalIndex:0,petalTimer:0});run(e,2.98);assert.equal(e.advanced.flowersFired,0);run(e,.04);assert.equal(e.advanced.flowersFired,1);assert.ok(e.hazards.includes(seed));run(e,.8);assert.equal(e.advanced.flowersFired,7);assert.ok(!e.hazards.includes(seed));assert.equal(e.hazards.filter(h=>h.kind==='petal').length,7);
});
test('shooting a growing seed removes it without releasing petals or counting a miss',()=>{
 const e=active('flowers');e.beat=100;e.hazards=[];const seed=e.add({kind:'seed',x:0,y:100,warn:0,life:4,hp:2,petals:8});for(let i=0;i<2;i++){e.shots=[{x:0,y:120,vy:-540,age:0}];e.updateShots(.05);}assert.equal(seed.hp,0);run(e,3.7);assert.equal(e.advanced.destroyedSeeds,1);assert.equal(e.advanced.flowersFired,0);assert.equal(e.miss,0);
});
test('flowers keep planting rather than waiting for the previous flower to mature',()=>{const e=active('flowers',3);run(e,2.5);const seeds=e.hazards.filter(h=>h.kind==='seed');assert.ok(seeds.length>=6);assert.ok(seeds.every(h=>h.petals!>=6&&h.petals!<=8));});
test('lightning pair crosses exact arena edges and both lines pass the locked player point',()=>{
 const e=active('lightning',3);run(e,.4);const first=e.advanced.bolts[0];e.player.x+=100;run(e,.17);const second=e.advanced.bolts[1];assert.ok(first&&second);assert.equal(e.advanced.lightTotal,8);assert.ok(distance(first.target,second.target)<.001);for(const b of [first,second]){assert.ok(segmentDistance(b.target,b.a,b.b)<.001);for(const p of [b.a,b.b])assert.ok(Math.abs(Math.abs(p.x)-e.fieldW/2)<.01||Math.abs(Math.abs(p.y)-e.fieldH/2)<.01);}assert.notDeepEqual(first.a,second.a);run(e,8);assert.ok(e.logs.filter(l=>l.includes('8쌍')).length>=2);
});
test('large rockets sustain sub-second launch intervals and geometric nodes create star connections',()=>{
 const e=active('rockets',3),serial=e.serial;run(e,2);assert.ok(e.serial-serial>=18);assert.ok(e.hazards.filter(h=>h.kind==='rocket').every(h=>Math.max(h.w,h.h)===84&&Math.min(h.w,h.h)>=32));const g=active('link',3);assert.equal(g.links.length,8);assert.equal(g.hazards.filter(h=>h.group!==undefined).length,8);const node=g.hazards[0],p={...node};run(g,1.5);assert.ok(distance(node,p)>50);assert.ok(g.links.some(l=>l.active));
});
test('mirror erosion advances from emitter through reflected path and leaves distant parts alive',()=>{
 const path=[{x:0,y:0},{x:1000,y:0},{x:1000,y:1000},{x:0,y:1000}],segments=laserSegments(path,3.8);assert.ok(segments.length>=2);assert.ok(segments[0][0].x>700);assert.equal(segments.at(-1)![1].y,1000);assert.equal(laserSegments(path,4.3).length,0);
});
test('normal time fields scale player, both projectile kinds, growth and effects by the same factor',()=>{
 const e=active('flowers');e.selectedSupports=new Set(['time']);configureZones(e);e.beat=100;e.hazards=[];assert.deepEqual(e.advanced.zones.map(z=>z.scale),[.5,1,2]);const slow=e.advanced.zones[0],fast=e.advanced.zones[2];const a=e.add({x:slow.x,y:0,vx:0,vy:20,warn:0,life:10}),b=e.add({x:fast.x,y:0,vx:0,vy:20,warn:0,life:10});e.updateEntities(.1);assert.equal(b.y/a.y,4);const sa={x:slow.x,y:200,vy:-20,age:0},sb={x:fast.x,y:200,vy:-20,age:0};e.shots=[sa,sb];e.updateShots(.1);assert.equal((200-sb.y)/(200-sa.y),4);e.keys.add('ArrowDown');e.player=e.screen({x:slow.x,y:0});e.move(.1);const dy=e.localPlayer().y;e.player=e.screen({x:fast.x,y:0});e.move(.1);assert.ok(Math.abs(e.localPlayer().y/dy-4)<1e-6);e.keys.clear();e.fx({x:slow.x,y:0});e.fx({x:fast.x,y:0});run(e,.1);assert.ok(Math.abs(e.effects.at(-1)!.age/e.effects.at(-2)!.age-4)<1e-6);
 e.hazards=[];e.add({kind:'seed',x:slow.x,y:0,warn:0,life:4,petals:6});e.add({kind:'seed',x:fast.x,y:0,warn:0,life:4,petals:6});run(e,1.6);assert.ok(e.advanced.flowersFired>0);assert.ok(e.hazards.some(h=>h.kind==='seed'&&h.x===slow.x&&!h.fired));
});
test('full field divides into six evenly spaced time factors and combined supports persist',()=>{
 const e=active('flowers');e.fullField=true;e.selectedSupports=new Set(['time','erosion','rotation']);e.restart();e.skip();run(e,1.5);assert.deepEqual(e.advanced.zones.map(z=>z.scale),[.5,.8,1.1,1.4,1.7,2]);assert.equal(e.advanced.walls.length,1);const seed=e.hazards.find(h=>h.kind==='seed')!;run(e,4);assert.ok(e.rotation>0);assert.ok(e.hazards.length>0);assert.ok(e.advanced.zones.length===6);assert.equal(e.pendingBombard,false);
});
test('successive shots erode wall material into a real passable hole',()=>{
 const e=active('erosion');e.beat=100;run(e,1.1);const w=e.advanced.walls[0];w.y=0;w.vy=0;assert.ok(wallHit(e,w,{x:0,y:0},4));const initial=w.cells.reduce((a,b)=>a+b);for(let i=0;i<24;i++)attackDestructibles(e,{x:0,y:-100},{x:0,y:100});assert.ok(w.cells.reduce((a,b)=>a+b)<initial);assert.equal(wallHit(e,w,{x:0,y:0},4),false);assert.equal(wallHit(e,w,{x:200,y:0},4),true);
});
test('exile throws, allows steering and directional fire, and returns only after portal contact',()=>{
 const e=active('exile');run(e,4);const x=e.advanced.exile;assert.equal(x.state,'explore');assert.ok(x.w>e.fieldW&&x.h>e.fieldH);e.keys.add('ArrowRight');e.nativeWeapon.style='humanities';e.keys.add(' ');const start={...x.world};run(e,.4);e.keys.clear();assert.ok(x.world.x>start.x+50);assert.ok(Math.abs(x.heading-Math.PI/2)<.01);assert.ok(x.shots.some(s=>s.vx>600&&Math.abs(s.vy)<.01));run(e,1);assert.ok(x.enemies.length>=5);assert.ok(x.enemies.every(m=>Math.hypot(m.vx,m.vy)<40));assert.equal(x.returned,false);x.world={...x.portal};x.velocity={x:0,y:0};run(e,.025);assert.equal(x.state,'enter');run(e,1.1);assert.equal(x.state,'return');run(e,1.3);assert.equal(x.returned,true);assert.equal(e.phase,'outro');
});
test('special patterns suspend support systems and changing pattern cleans up advanced state',()=>{
 const e=active('flowers');e.selectedSupports=new Set(['time','erosion','rotation','miss']);e.select(patterns.findIndex(p=>p.id==='hp-sword'));e.skip();run(e,2);assert.equal(e.advanced.zones.length,0);assert.equal(e.advanced.walls.length,0);assert.equal(e.debtEnabled,false);assert.ok(e.advanced.sword.trail.length>=0);e.select(patterns.findIndex(p=>p.id==='flowers'));assert.equal(e.advanced.sword.age,0);assert.equal(e.advanced.zones.length,3);
});
