import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine,BASE_FIELD_W,BASE_FIELD_H,MAX_HP} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {waveBeamBounds,waveBeamHits} from '../../src/game/chapter3/degreeon/waveLaser';
import {fieldShapes,fieldShapeSize,FieldShape} from '../../src/game/chapter3/degreeon/fieldWarp';
const run=(e:Engine,seconds:number)=>{for(let i=0;i<Math.ceil(seconds*120);i++)e.step(1/120);};
function active(id:string,stage=0,ids:string[]=[]){
 const e=new Engine({getContext:()=>({})} as any,patterns);e.selectedSupports=new Set(ids);e.begin(patterns.findIndex(p=>p.id===id),stage);e.invincible=true;e.skip();run(e,.025);return e;
}
function hold(e:Engine,shape:FieldShape){e.fieldWarp.mode='hold';e.fieldWarp.age=0;e.fieldWarp.current=e.fieldWarp.target=shape;e.syncTimeZones();}
test('both standalone corridors keep their own axis across every 5–8 volley stage',()=>{
 for(const axis of ['vertical','horizontal'])for(let stage=0;stage<4;stage++){
  const id='corridor-'+axis;assert.equal(patterns.find(p=>p.id===id)?.category,'normal');
  const e=active(id,stage),axes=new Set<string>(),volleyBeams:number[]=[];let fired=0;
  for(let i=0;i<120*20&&e.phase==='active';i++){
   e.step(1/120);for(const b of e.corridor.beams)axes.add(b.axis!);
   if(e.corridor.fired>fired){fired=e.corridor.fired;volleyBeams.push(e.corridor.beams.filter(b=>b.age===0).length);}
  }
  assert.equal(fired,stage+5);assert.equal(e.phase,'outro');assert.ok(volleyBeams.every(n=>n===6));
  assert.deepEqual([...axes],[axis]);assert.equal(e.attackLocked,false);
 }
});
test('both laser axes advertise a safe lane and deal real damage only after their warning',()=>{
 for(const stage of [0,1]){
  const e=active(stage?'corridor-horizontal':'corridor-vertical',stage);run(e,.22);const beam=e.corridor.beams[0],r=waveBeamBounds(e,beam);
  const gap=stage?{x:0,y:0}:{x:0,y:200},center=stage?{x:0,y:r.y}:{x:r.x,y:200};
  assert.equal(waveBeamHits(e,beam,center),false);e.player=e.screen(center);e.invincible=false;e.cooldown=0;
  run(e,.5);assert.equal(e.hp,MAX_HP);run(e,.5);assert.ok(e.hp<MAX_HP);assert.ok(e.corridor.beams.some(b=>waveBeamHits(e,b,center)));
  assert.ok(e.corridor.beams.every(b=>!waveBeamHits(e,b,gap)));assert.ok(stage?r.w===e.fieldW:r.h===e.fieldH);
 }
});
test('laser sections share local time with bullets, including horizontal lines crossing three zones',()=>{
 for(const stage of [0,1]){
  const e=active(stage?'corridor-horizontal':'corridor-vertical',stage,['time']);run(e,.45);assert.equal(e.corridor.fired,1);
  const beams=[...e.corridor.beams];run(e,.3);
  if(stage===0){const slow=beams[0],fast=beams.at(-1)!;assert.ok(slow.age<slow.warn);assert.ok(fast.age>=fast.warn);assert.ok(Math.abs(fast.age/slow.age-4)<1e-6);}
  else{const b=beams[0];assert.equal(b.parts!.length,3);assert.ok(Math.abs(b.parts![2].age/b.parts![0].age-4)<1e-6);const r=waveBeamBounds(e,b);assert.equal(waveBeamHits(e,b,{x:-e.fieldW/3,y:r.y}),false);assert.equal(waveBeamHits(e,b,{x:e.fieldW/3,y:r.y}),true);}
 }
});
test('bomb clears corridor beams as its expanding front reaches them',()=>{
 const e=active('corridor-vertical');run(e,.3);e.player=e.screen({x:0,y:150});e.bomb();run(e,.6);assert.equal(e.corridor.beams.length,0);assert.ok(e.smartBombRadius>400);assert.equal(e.bombs,2);
});
test('size support visits all six silhouettes, warns, morphs continuously and preserves shot velocity',()=>{
 const e=active('shape');e.supportPreviewId='corridor-vertical';e.restart();e.invincible=true;e.skip();run(e,.025);
 const seen=new Set<FieldShape>([e.fieldWarp.current]);let warned=false,morphed=false,prev=e.fieldW;
 for(let i=0;i<120*30&&e.phase==='active';i++){
  e.step(1/120);seen.add(e.fieldWarp.current);warned||=e.fieldWarp.mode==='warn'&&!!e.fieldWarp.preview;morphed||=e.fieldWarp.mode==='morph';assert.ok(Math.abs(e.fieldW-prev)<35);prev=e.fieldW;
 }
 assert.equal(seen.size,6);assert.ok(warned&&morphed);assert.ok(e.logs.some(l=>l.includes('5/5')));assert.equal(e.pattern.id,'shape');assert.equal(e.phase,'active');
 hold(e,'tiny');const h=e.add({x:0,y:0,vx:100,vy:0,r:8,warn:0,life:5});e.updateEntities(.1);assert.equal(h.r,8);assert.ok(Math.abs(h.x-10)<1e-6);assert.equal(h.vx,100);
});
test('six dimensions affect physical bounds and stay inside the viewport throughout rotation',()=>{
 const e=active('volley-core',0,['shape']),v=e.gridSize();const sizes=Object.fromEntries(fieldShapes.map(t=>[t,fieldShapeSize(e,t)]));
 assert.ok(sizes.tall.h/sizes.tall.w>1.7);assert.ok(sizes.flat.w/sizes.flat.h>3);assert.deepEqual(sizes.full,v);assert.ok(sizes.wide.w>BASE_FIELD_W);assert.ok(sizes.tiny.w<BASE_FIELD_W*.5&&sizes.tiny.h<BASE_FIELD_H*.5);
 for(const angle of [0,.35,Math.PI/4,1.15,Math.PI/2,Math.PI*1.3])for(const shape of fieldShapes){e.angle=angle;hold(e,shape);assert.ok(e.width<=v.w+.001&&e.height<=v.h+.001,shape);}
 e.angle=0;e.player=e.screen({x:600,y:380});hold(e,'tiny');assert.ok(Math.abs(e.localPlayer().x)<=e.fieldW/2-13+.001);assert.ok(Math.abs(e.localPlayer().y)<=e.fieldH/2-13+.001);
});
test('dimension changes rebuild 3 or 6 time zones, retain wall holes and bound all three clones',()=>{
 const e=active('volley-gap',2,['shape','time','erosion','clones']);run(e,1.5);const wall=e.advanced.walls[0];assert.ok(wall);wall.cells[10]=0;const cells=[...wall.cells];
 hold(e,'full');assert.equal(e.advanced.zones.length,6);assert.deepEqual(e.advanced.zones.map(z=>z.scale),[.5,.8,1.1,1.4,1.7,2]);
 e.angle=.75;hold(e,'tiny');assert.equal(e.advanced.zones.length,3);assert.deepEqual(wall.cells,cells);assert.ok(Math.abs(wall.cellW*wall.cols-e.fieldW)<1e-6);
 for(const b of e.bodies()){const p=e.local(b);assert.ok(Math.abs(p.x)<=e.fieldW/2-12);assert.ok(Math.abs(p.y)<=e.fieldH/2-12);}
 e.paused=true;const before=JSON.stringify(e.fieldWarp);run(e,2);assert.equal(JSON.stringify(e.fieldWarp),before);
});
test('every normal combines with morph, rotation, time, erosion and clones; specials suspend morph',()=>{
 for(const p of patterns.filter(p=>p.category==='normal')){
  const e=active(p.id,2,['shape','rotation','time','erosion','clones']);run(e,18);
  assert.ok(e.hazards.every(h=>Number.isFinite(h.x)&&Number.isFinite(h.y)),p.id);assert.ok(Number.isFinite(e.fieldW+e.fieldH),p.id);assert.ok(e.width<=e.gridSize().w+.01&&e.height<=e.gridSize().h+.01,p.id);assert.equal(e.bodies().length,3);
 }
 const e=active('hp-sword',0,['shape','time']);run(e,5);assert.equal(e.fieldWarpEnabled,false);assert.equal(e.fieldWarp.changes,0);assert.equal(e.advanced.zones.length,0);
 e.select(patterns.findIndex(p=>p.id==='corridor-vertical'));assert.equal(e.fieldWarp.changes,0);assert.equal(e.corridor.beams.length,0);
});
