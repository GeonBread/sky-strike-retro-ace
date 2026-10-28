import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {finalStandScore,finalFieldPose,beamBounds,finaleBeamHits} from '../../src/game/chapter3/degreeon/finalStand';
const run=(e:Engine,t:number)=>{for(let i=0;i<Math.round(t*120);i++)e.step(1/120);};
const active=(id='last-stand')=>{const e=new Engine({getContext:()=>({})} as any,patterns);e.selectedSupports.clear();e.begin(patterns.findIndex(p=>p.id===id),0);e.phase='active';e.rotation=0;e.invincible=true;return e;};
test('manual preview locks final-form health and lasts exactly 40 seconds before the final shot',()=>{
 const e=active();assert.equal(e.bossForm,2);assert.equal(e.attackLocked,true);assert.equal(e.bossHp/e.bossHpMax,.01);
 e.keys.add(' ');const bombs=e.bombs;e.bomb();assert.equal(e.bombs,bombs);assert.equal(e.smartBombActive,false);run(e,39.9);
 assert.equal(e.attackLocked,true);assert.equal(e.shots.length,0);assert.equal(e.finalStand.complete,false);assert.equal(e.bossHp/e.bossHpMax,.01);
 run(e,.1);assert.equal(e.finalStand.elapsed,40);assert.equal(e.finalStand.complete,true);assert.equal(e.attackLocked,false);assert.equal(e.bossHp,1);assert.ok(e.hazards.length>0);assert.equal(e.finalStand.beams.length,0);
 e.keys.clear();e.shots=[{x:e.boss.x,y:e.boss.y+8,vy:-540,age:0}];e.step(1/120);assert.equal(e.bossHp,0);e.step(1/120);assert.equal(e.purification,0);assert.equal(e.finalStand.elapsed,40);
});
test('massive damage cannot skip 1% and automatic entry preserves player LIFE and bombs',()=>{
 const e=active('flowers');e.bossForm=2;e.bossHp=30;e.hp=2;e.bombs=1;e.selectedSupports=new Set(['clones','time','miss']);e.damageBoss(1000);
 assert.equal(e.bossHp,e.bossHpMax*.01);assert.equal(e.finalStand.pending,true);e.updateShots(.1);assert.equal(e.shots.length,0);e.step(1/120);
 assert.equal(e.pattern.id,'last-stand');assert.equal(e.phase,'intro');assert.equal(e.hp,2);assert.equal(e.bombs,1);assert.equal(e.advanced.zones.length,0);assert.equal(e.pendingBombard,false);assert.equal(e.smartBombActive,false);
 e.skip();run(e,.025);assert.equal(e.phase,'active');assert.equal(e.attackLocked,true);
});
test('an in-flight bomb cannot kill the final form or keep clearing the survival score',()=>{
 const e=active('flowers');e.bossForm=2;e.bossHp=20;e.boss={x:0,y:0};e.player=e.screen({x:0,y:150});e.bomb();run(e,.2);
 assert.equal(e.pattern.id,'last-stand');assert.equal(e.bossHp,e.bossHpMax*.01);assert.equal(e.smartBombActive,false);assert.equal(e.purification,-1);
});
test('first-form defeat still changes form and preview selection cleanly leaves the attack lock',()=>{
 const e=active('flowers');e.bossForm=1;e.damageBoss(1000);e.step(1/120);assert.equal(e.bossForm,2);assert.equal(e.bossHp,e.bossHpMax);assert.equal(e.finalStand.started,false);
 e.select(patterns.findIndex(p=>p.id==='last-stand'));assert.equal(e.attackLocked,true);e.select(patterns.findIndex(p=>p.id==='volley-core'));assert.equal(e.attackLocked,false);assert.equal(e.bossHp,e.bossHpMax);assert.equal(e.finalStand.beams.length,0);
});
test('same score and trajectories repeat with different seeds, player paths and difficulty stages',()=>{
 const a=active(),b=active();b.seed=123456;b.stage=3;b.player=b.screen({x:-210,y:200});b.keys.add('ArrowRight');
 for(const e of [a,b])e.random=()=>{throw Error('Randomness reached the fixed finale');};
 for(let step=0;step<4800;step++){
  a.step(1/120);b.step(1/120);
  if(step%30===0){assert.equal(a.angle,b.angle);assert.equal(a.fieldW,b.fieldW);assert.deepEqual(a.finalStand.beams,b.finalStand.beams);assert.deepEqual(a.hazards.map(h=>[h.x,h.y,h.vx,h.vy,h.age,h.tag]),b.hazards.map(h=>[h.x,h.y,h.vx,h.vy,h.age,h.tag]));}
 }
 assert.equal(a.finalStand.complete,true);assert.equal(b.finalStand.complete,true);
});
test('pause freezes score and manual next/rotate/skip cannot change active timings',()=>{
 const e=active();run(e,21);const t=e.finalStand.elapsed,angle=e.angle;e.next();e.rotate();e.skip();assert.equal(e.phase,'active');assert.equal(e.queuedIndex,null);assert.equal(e.angle,angle);assert.equal(e.finalStand.elapsed,t);
 e.paused=true;run(e,5);assert.equal(e.finalStand.elapsed,t);e.paused=false;run(e,1);assert.ok(e.finalStand.elapsed>t+.99);
 e.invincible=false;e.hp=0;e.dead=.05;run(e,.1);const end=e.finalStand.elapsed;assert.equal(e.gameOver,true);run(e,1);assert.equal(e.finalStand.elapsed,end);
});
test('laser warnings are harmless, the planned gap is safe and live beam bounds match hit tests',()=>{
 const e=active();run(e,.3);const b=e.finalStand.beams[0],r=beamBounds(e,b);assert.equal(finaleBeamHits(e,{x:r.x,y:200}),false);
 run(e,.6);assert.equal(finaleBeamHits(e,{x:r.x,y:200}),true);assert.equal(finaleBeamHits(e,{x:0,y:200}),false);assert.equal(finaleBeamHits(e,{x:r.x+r.w/2+5,y:200}),false);
 run(e,.25);assert.equal(finaleBeamHits(e,{x:r.x,y:200}),false);
 assert.equal(finalStandScore.filter(c=>c.at<10).length,9);for(const p of [finalFieldPose(23),finalFieldPose(28)])assert.ok(p.w<922&&p.h<960);assert.equal(finalFieldPose(23).angle,Math.PI/2);assert.equal(finalFieldPose(28).angle,Math.PI);assert.deepEqual(finalFieldPose(40),{w:922,h:960,angle:Math.PI*2});
});
