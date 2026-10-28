import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, distance } from '../../src/game/chapter3/degreeon/engine';
import { patterns } from '../../src/game/chapter3/degreeon/patterns';
import { attackDestructibles, wallHit, WALL_BODY_RADIUS, updateSupports } from '../../src/game/chapter3/degreeon/advanced';
import { swordContains, swordPose } from '../../src/game/chapter3/degreeon/sword';
import { exileProjection } from '../../src/game/chapter3/degreeon/exile';
const run=(e:Engine,s:number)=>{for(let i=0;i<Math.ceil(s*120);i++)e.step(1/120);};
const active=(id:string)=>{const e=new Engine({getContext:()=>({})} as any,patterns);e.select(patterns.findIndex(p=>p.id===id));e.invincible=true;e.selectedSupports.clear();e.skip();run(e,.025);return e;};
test('lightning alternates horizontal and vertical pairs and every branch root has both sides',()=>{
 const e=active('lightning'),directions=new Set<string>();
 for(let i=0;i<600;i++){e.step(1/120);for(const b of e.advanced.bolts){const d={x:b.b.x-b.a.x,y:b.b.y-b.a.y};if(Math.abs(d.x)>Math.abs(d.y)*4)directions.add('horizontal');if(Math.abs(d.y)>Math.abs(d.x)*4)directions.add('vertical');
  for(let j=0;j<b.branches.length;j+=2){const [a,c]=[b.branches[j],b.branches[j+1]],side=(p:any)=>d.x*(p.y-a[0].y)-d.y*(p.x-a[0].x);assert.deepEqual(a[0],c[0]);assert.ok(side(a[2])*side(c[2])<0);}}}
 assert.deepEqual(directions,new Set(['horizontal','vertical']));
});
test('solid wall blocks movement regardless of immunity, slides, then permits the excavated hole',()=>{
 const e=active('erosion');run(e,1.1);e.beat=100;e.hazards=[];const w=e.advanced.walls[0];w.y=0;w.vy=0;e.player=e.screen({x:0,y:120});
 e.keys.add('ArrowUp');e.move(.6);assert.ok(e.localPlayer().y>=56+WALL_BODY_RADIUS);assert.ok(!wallHit(e,w,e.localPlayer(),WALL_BODY_RADIUS));
 e.keys.add('ArrowRight');e.move(.2);assert.ok(e.localPlayer().x>50);assert.ok(e.localPlayer().y>=56+WALL_BODY_RADIUS);e.keys.clear();
 for(const x of [-24,0,24])for(let i=0;i<24;i++)attackDestructibles(e,{x,y:-100},{x,y:100});e.player=e.screen({x:0,y:120});e.keys.add('ArrowUp');e.move(.6);assert.ok(e.localPlayer().y< -56-WALL_BODY_RADIUS);
});
test('a descending solid wall pushes the avatar rather than passing through its body',()=>{
 const e=active('erosion');run(e,1.1);e.hazards=[];const w=e.advanced.walls[0];w.y=0;w.vy=60;e.player=e.screen({x:0,y:75});updateSupports(e,.1);assert.ok(e.localPlayer().y>79);assert.ok(!wallHit(e,w,e.localPlayer(),WALL_BODY_RADIUS));
});
test('six sword moves remain continuous and the full damaging width is inside the advertised sweep',()=>{
 const e=active('hp-sword'),kinds=new Set<number>();let old={...e.advanced.sword.pose};
 for(let i=0;i<3200;i++){e.step(1/120);const s=e.advanced.sword;kinds.add(s.kind);assert.ok(distance(old,s.pose)<20,'blade position must not jump between attacks');
  if(s.state==='attack'){const pose=s.pose;for(const a of [-270,0,270])for(const b of [-20,0,20]){const p={x:pose.x+Math.cos(pose.angle)*a-Math.sin(pose.angle)*b,y:pose.y+Math.sin(pose.angle)*a+Math.cos(pose.angle)*b};assert.ok(s.preview.some(v=>swordContains(p,v,10)),'entire blade lies inside the preview');}}
  old={...s.pose};}
 assert.equal(kinds.size,6);
 const s=e.advanced.sword;s.kind=4;const p=swordPose(s,.5);assert.ok(swordContains({x:p.x,y:p.y},p));
});
test('exile breaches at the actual arena edge, recedes right and decelerates smoothly to rest',()=>{
 const e=active('exile'),x=e.advanced.exile;while(!x.detached)e.step(1/120);
 assert.ok(Math.abs(x.world.x+e.fieldW/2)<.001);assert.ok(distance(x.world,x.flightStart)<.001);assert.equal(x.viewW,e.gridSize().w);const start=exileProjection(x);
 let speed=Math.hypot(x.velocity.x,x.velocity.y),screenX=start.x;while(x.state==='drift'){e.step(1/120);assert.ok(Math.hypot(x.velocity.x,x.velocity.y)<=speed+.001);speed=Math.hypot(x.velocity.x,x.velocity.y);const p=exileProjection(x);assert.ok(p.x>=screenX-.001);screenX=p.x;}
 assert.equal(speed,0);assert.equal(x.state,'explore');assert.ok(exileProjection(x).scale<.15);assert.ok(screenX>x.viewW);assert.ok(x.enemies.length>20);const end={...x.world};run(e,.1);assert.ok(distance(end,x.world)<.001);
});
