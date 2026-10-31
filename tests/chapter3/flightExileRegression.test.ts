import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {startCuePractice,phaseTwoScore} from '../../src/game/chapter3/degreeon/encounter';
import {EXILE_MAX_ENEMIES,exileEnemyVisible} from '../../src/game/chapter3/degreeon/exile';
import {emitNativeShots,moveNativeShot} from '../../src/game/chapter3/degreeon/nativeWeapon';
const make=()=>new Engine({getContext:()=>({})} as any,patterns);
const run=(e:Engine,t:number)=>{for(let i=0;i<Math.ceil(t*120);i++)e.step(1/120);};
function flight(){
 const e=make();startCuePractice(e,2,phaseTwoScore.findIndex(c=>c.id==='flight'),'expert');e.invincible=true;e.skip();run(e,1);return e;
}
test('flight fades the boss away, keeps it absent through the final obstacle and restores it before the next cue',()=>{
 const e=make();startCuePractice(e,2,phaseTwoScore.findIndex(c=>c.id==='flight'),'expert');e.invincible=true;
 assert.equal(e.flightPresence.opacity,1);run(e,.25);assert.ok(e.flightPresence.opacity>0&&e.flightPresence.opacity<1);
 e.skip();run(e,1.2);assert.equal(e.flightPresence.state,'hidden');assert.equal(e.flightPresence.opacity,0);
 e.beat=100;e.hazards=[];const last=e.add({x:0,y:0,vy:0,warn:0,life:.8});e.finish();run(e,.35);
 assert.ok(e.hazards.includes(last));assert.equal(e.pattern.id,'flight');assert.equal(e.flightPresence.opacity,0);
 run(e,.6);assert.equal(e.flightPresence.state,'return');assert.ok(e.flightPresence.opacity>0&&e.flightPresence.opacity<1);assert.equal(e.pattern.id,'flight');
 const opacity=e.flightPresence.opacity;e.paused=true;run(e,1);assert.equal(e.flightPresence.opacity,opacity);e.paused=false;
 run(e,.3);assert.equal(e.pattern.id,'flight');assert.ok(e.flightPresence.opacity>opacity);
 run(e,.7);assert.equal(e.pattern.id,'flight');assert.equal(e.phase,'intro');assert.equal(e.flightPresence.state,'depart');
});
test('flight cannot take invisible boss damage and switching or restarting restores boss artwork',()=>{
 const e=flight();assert.equal(e.flightPresence.opacity,0);const hp=e.bossHp;assert.equal(e.damageBoss(50),false);assert.equal(e.bossHp,hp);
 e.select(patterns.findIndex(p=>p.id==='flowers'));assert.equal(e.flightPresence.state,'visible');assert.equal(e.flightPresence.opacity,1);
 e.begin(patterns.findIndex(p=>p.id==='flight'),0);e.invincible=true;e.skip();run(e,1);e.finish();run(e,.3);
 assert.equal(e.flightPresence.state,'return');assert.ok(e.flightPresence.opacity>0&&e.flightPresence.opacity<1);
 run(e,.5);assert.equal(e.flightPresence.state,'visible');assert.equal(e.flightPresence.opacity,1);
});
test('exile retains a populated world, bounds reinforcements during long exploration and preserves portal return',()=>{
 const e=make();e.begin(patterns.findIndex(p=>p.id==='exile'),3);e.invincible=true;e.skip();run(e,4);
 const x=e.advanced.exile;assert.ok(x.enemies.length>=100);assert.equal(new Set(x.enemies.map(m=>`${m.x>0}/${m.y>0}`)).size,4);
 for(let i=0;i<7200;i++){e.step(1/120);assert.ok(x.enemies.length<=EXILE_MAX_ENEMIES);}
 assert.equal(x.enemies.length,EXILE_MAX_ENEMIES);
 x.world={...x.portal};x.velocity={x:0,y:0};run(e,2.5);assert.equal(x.returned,true);
});
test('exile skips only enemies outside the camera including a glow margin',()=>{
 const e=make(),x=e.advanced.exile;x.camera={x:500,y:-300};x.viewW=1200;x.viewH=800;
 assert.equal(exileEnemyVisible(x,{x:500,y:-300}),true);
 assert.equal(exileEnemyVisible(x,{x:1140,y:-300}),true);
 assert.equal(exileEnemyVisible(x,{x:1160,y:-300}),false);
 assert.equal(exileEnemyVisible(x,{x:500,y:160}),false);
});
test('optimized native projectile updates retain homing towards the outside world population',()=>{
 const e=make();e.begin(patterns.findIndex(p=>p.id==='exile'),0);e.invincible=true;e.skip();run(e,4);
 const x=e.advanced.exile;x.world={x:0,y:0};x.enemies=[{x:200,y:-200,hp:2,age:1,vx:0,vy:0}];
 e.nativeWeapon.style='arts';e.nativeWeapon.power=1;
 const s=emitNativeShots(e,x.world,0)[0];assert.ok(s.native?.playerBulletHoming);const vx=s.vx!;
 moveNativeShot(e,s,1/60);assert.ok(s.vx!>vx);assert.ok(s.vy<0);
});
