import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Engine,distance} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {moveExile} from '../../src/game/chapter3/degreeon/exile';
import {emitNativeShots} from '../../src/game/chapter3/degreeon/nativeWeapon';
import {playerHoverPose} from '../../src/game/chapter3/degreeon/playerHover';
const make=()=>new Engine({getContext:()=>({})} as any,patterns);
const run=(e:Engine,t:number)=>{for(let i=0;i<Math.ceil(t*120);i++)e.step(1/120);};
const active=(id:string)=>{const e=make();e.begin(patterns.findIndex(p=>p.id===id),0);e.invincible=true;e.skip();run(e,.025);return e;};
test('exile has a visible, distributed population at the breach, before exploration starts',()=>{
 const e=active('exile'),x=e.advanced.exile;while(!x.detached)e.step(1/120);
 assert.equal(x.state,'drift');assert.ok(x.enemies.length>=100);
 const occupied=new Set(x.enemies.map(m=>`${m.x>0}/${m.y>0}`));assert.equal(occupied.size,4);
 const landing={x:x.flightStart.x+x.initialVelocity.x*1.85/3,y:x.flightStart.y+x.initialVelocity.y*1.85/3};
 const visible=x.enemies.filter(m=>Math.abs(m.x-landing.x)<x.viewW*.5&&Math.abs(m.y-landing.y)<x.viewH*.5);assert.ok(visible.length>=15);
 assert.ok(x.enemies.every(m=>m.age>=.7&&distance(m,landing)>=175&&distance(m,x.portal)>=100));
});
test('exile steering turns gradually and native muzzle positions, velocity and artwork follow the actual heading',()=>{
 const e=active('exile');run(e,4);const x=e.advanced.exile;x.heading=0;e.playerFacing=0;x.velocity={x:0,y:0};
 moveExile(e,1/120,1,0);assert.ok(x.heading>0&&x.heading<.05);assert.equal(e.playerFacing,x.heading);
 for(let i=0;i<60;i++)moveExile(e,1/120,1,0);assert.ok(Math.abs(x.heading-Math.PI/2)<1e-8);
 e.nativeWeapon.style='humanities';const shots=emitNativeShots(e,x.world,x.heading);assert.ok(shots.length>0);
 assert.ok(shots.every(s=>(s.vx??0)>0&&Math.abs(s.vy)<1e-8));assert.ok(shots.every(s=>Math.abs(s.native!.playerBulletRotation!-x.heading)<1e-8));
 assert.ok(shots.every(s=>s.x>x.world.x));
});
test('geometry flight spans the full logical viewport width and Space only changes vertical motion',()=>{
 const e=active('flight');assert.equal(e.fieldH,e.gridSize().w);e.beat=100;e.keys.add(' ');run(e,.35);assert.ok(e.flightV<0);assert.equal(e.shots.length,0);
 e.keys.clear();run(e,.9);assert.ok(e.flightV>0);assert.equal(e.shots.length,0);
 e.hazards=[];e.beat=0;e.pattern.update(e,0);assert.ok(e.hazards.length>=2);
 for(const h of e.hazards)assert.ok(h.life>(e.fieldH*2/3)/h.vy+h.warn);
});
test('the opening has the same hover pose as combat and freezes that pose on pause',()=>{
 const e=make();e.startEncounter();const start=playerHoverPose(e.playerAnimClock);run(e,.4);const current=playerHoverPose(e.playerAnimClock);assert.notDeepEqual(start,current);assert.equal(e.t,0);assert.equal(e.shots.length,0);
 e.paused=true;run(e,1);assert.deepEqual(playerHoverPose(e.playerAnimClock),current);
});
test('standalone CH3 wave contains its parallax runtime and requires no external runtime request',()=>{
 const html=readFileSync(new URL('../../src/embedded/chapter3Wave.html',import.meta.url),'utf8');
 const inline=html.slice(html.indexOf('<!-- COMBAT_PARALLAX_RUNTIME_START -->'),html.indexOf('<!-- COMBAT_PARALLAX_RUNTIME_END -->'));
 const code=inline.match(/<script>([\s\S]*)<\/script>/)![1],global:any={};runInNewContext(code,global);assert.equal(typeof global.HobanuCombatParallax.CombatParallax,'function');
 assert.doesNotMatch(html,/<script src="\/assets\/runtime\/combatParallax.js"/);
});
