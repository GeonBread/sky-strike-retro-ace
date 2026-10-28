import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine,polygonArea,distance} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {phaseOneScore,phaseTwoScore,enterEncounterCue as enterOriginalCue,advanceEncounterCue as advanceOriginalCue,skipStoryScene} from '../../src/game/chapter3/degreeon/encounter';
const run=(e:Engine,t:number)=>{for(let i=0;i<Math.ceil(t*120);i++)e.step(1/120);};
function cue(id:string,phase:1|2=1){const e=new Engine({getContext:()=>({})} as any,patterns);e.startEncounter(phase===2);skipStoryScene(e);const score=phase===1?phaseOneScore:phaseTwoScore;e.encounter.cue=score.findIndex(c=>c.id===id);assert.ok(e.encounter.cue>=0);enterEncounterCue(e);e.skip();e.invincible=true;run(e,.03);return e;}
function next(e:Engine,max=20){const before=e.encounter.cue;let elapsed=0;while(e.encounter.cue===before&&elapsed<max){e.step(1/120);elapsed+=1/120;}assert.notEqual(e.encounter.cue,before,`${e.pattern.id} did not finish in ${max}s`);return elapsed;}

test('normal handoff keeps actual enemy/player projectiles, held keys, active purification and animation clocks',()=>{
 const e=cue('volley-rhythm');const h=e.add({x:80,y:30,vx:40,vy:50,warn:0,life:30}),shot={x:100,y:130,vx:0,vy:-100,age:.2};e.shots.push(shot);e.effects.push({x:30,y:40,kind:'ring',age:.1,life:3,radius:20,color:'#fff',lane:-1});
 e.player=e.screen({x:175,y:300});e.boss={x:85,y:-280};e.bossAnimClock=38;e.playerAnimClock=29;e.bodyAnimClocks=[25,26,27];e.cooldown=.13;e.keys.add('d');e.keys.add(' ');e.smartBombActive=true;e.smartBombRadius=50;e.smartBombLimit=1000;e.smartBombWorldOrigin={x:-400,y:-450};e.smartBombHitBoss=true;e.hp=2;e.bombs=1;
 advanceEncounterCue(e);assert.equal(e.pattern.id,'triple-wave');assert.equal(e.phase,'active');assert.ok(e.hazards.includes(h));assert.ok(e.shots.includes(shot));assert.equal(e.effects.length,1);assert.deepEqual(e.localPlayer(),{x:175,y:300});assert.deepEqual(e.boss,{x:85,y:-280});assert.equal(e.bossAnimClock,38);assert.equal(e.playerAnimClock,29);assert.deepEqual(e.bodyAnimClocks,[25,26,27]);assert.equal(e.cooldown,.13);assert.ok(e.keys.has('d'));assert.equal(e.smartBombActive,true);assert.equal(e.smartBombRadius,50);assert.equal(e.hp,2);assert.equal(e.bombs,1);
 e.smartBombActive=false;run(e,.1);assert.ok(h.age>.09);assert.ok(h.x>83);assert.ok(e.localPlayer().x>175);assert.ok(e.bossAnimClock>38);assert.ok(e.playerAnimClock>29);
});
test('already fired bullets stay dangerous after the next ordinary attack starts',()=>{
 const e=cue('volley-rhythm');e.hazards=[];const h=e.add({x:10,y:50,vx:0,vy:40,r:12,warn:0,life:20});advanceEncounterCue(e);e.invincible=false;e.hp=3;e.cooldown=0;e.player=e.screen({x:10,y:50});run(e,.02);assert.ok(e.hazards.includes(h));assert.equal(e.hp,2);
});
test('closing a combo flushes its scheduled last pulse, then starts the next attack without clearing its bullets',()=>{
 const e=cue('volley-rhythm');e.finish();assert.equal(e.phase,'active');const elapsed=next(e,8);assert.ok(elapsed>4.5,'scheduled 4.2s pulse and delayed pulse were cut');assert.equal(e.phase,'active');assert.ok(e.hazards.some(h=>h.tag==='코어 펄스'));assert.equal(e.volley.events.length,0);assert.equal(e.pattern.id,'triple-wave');
});
test('mirror warnings still fire and the travelling laser tail finishes before the following cue',()=>{
 const e=cue('mirror');run(e,.25);assert.ok(e.lasers.length);const l=e.lasers[0];e.finish();run(e,2.5);assert.equal(e.pattern.id,'mirror');assert.equal(l.fired,true);next(e,12);assert.equal(e.pattern.id,'lightning');assert.ok(l.tailTime!>0);
});
test('a corridor deadline cannot cut any of the promised laser volleys or their last beam',()=>{
 const e=cue('corridor-vertical');run(e,.3);const state=e.corridor;e.finish();run(e,1);assert.equal(e.pattern.id,'corridor-vertical');assert.ok(state.beams.length);next(e,14);assert.equal(state.fired,state.total);assert.equal(state.beams.length,0);
});
test('HP sword completes its advertised strike and visibly travels back to the HUD',()=>{
 const e=cue('hp-sword',2);run(e,2.5);const s=e.advanced.sword;assert.ok(['warn','attack'].includes(s.state));e.finish();run(e,.1);assert.equal(e.pattern.id,'hp-sword');next(e,6);assert.equal(s.state,'home');assert.ok(s.time>=.9);assert.ok(Math.abs(s.pose.y+418)<.01);assert.ok(Math.abs(s.pose.x)<.01);assert.ok(Math.abs(s.pose.angle%(Math.PI*2))<.01);
});
test('tail handoff releases every already visible tail rather than freezing or deleting it',()=>{
 const e=cue('tail-shed',2);e.encounter.cue=phaseTwoScore.length-1;run(e,.6);const state=e.extraNormal,chains=[...state.chains];e.finish();run(e,.1);assert.equal(e.pattern.id,'tail-shed');const sequence=e.extraNormal.sequence;next(e,12);assert.ok(chains.every(c=>c.detached&&c.released===c.tails.length));assert.ok(e.hazards.length>0);assert.equal(state.sequence,sequence);
});
test('a warned graduation stamp lands and finishes releasing its actual glyphs before exit',()=>{
 const e=cue('graduation-stamp');const s=e.graduationStamp;e.finish();run(e,.4);assert.equal(e.pattern.id,'graduation-stamp');next(e,8);assert.equal(s.impacted,true);assert.equal(s.phase,'rest');assert.equal(s.round,1);assert.equal(s.strokes.length,0);assert.equal(s.lingering.length,0);
});
test('rolling tile explosions stop scheduling new cells and resolve every existing warning',()=>{
 const e=cue('tile-stream',2);run(e,1.1);const s=e.tileStream,batches=[...s.batches],serial=s.serial;assert.ok(batches.length>0);e.finish();next(e,4);assert.equal(s.serial,serial);assert.ok(batches.every(b=>b.fired));assert.equal(s.batches.length,0);
});
test('exclusive scenes wait for remaining projectiles to leave before taking the avatar',()=>{
 const e=cue('corridor-vertical',2);e.corridor.fired=e.corridor.total;e.corridor.beams=[];const h=e.add({x:0,y:100,vx:0,vy:40,warn:0,life:1.2});e.finish();run(e,.6);assert.equal(e.pattern.id,'corridor-vertical');assert.ok(e.hazards.includes(h));next(e,3);assert.equal(e.pattern.id,'exile');assert.equal(e.hazards.length,0);
});
test('field resize/rotation and boss/player animation remain continuous across a cue boundary',()=>{
 const e=cue('corridor-vertical');e.keys.add('d');e.player=e.screen({x:120,y:260});e.boss={x:80,y:-280};e.bossAnimClock=47;e.playerAnimClock=36;const p={...e.player},boss={...e.boss},w=e.fieldW;advanceEncounterCue(e);
 assert.equal(e.pattern.id,'split8');assert.equal(e.fieldW,w);assert.deepEqual(e.player,p);assert.deepEqual(e.boss,boss);assert.equal(e.bossAnimClock,47);assert.ok(e.continuity.bridge);run(e,.5);assert.ok(e.fieldW>w&&e.fieldW<e.gridSize().w);assert.ok(e.localPlayer().x>120);let prior={...e.boss},max=0;for(let i=0;i<100;i++){e.step(1/120);max=Math.max(max,distance(prior,e.boss));prior={...e.boss};}assert.ok(max<5);assert.equal(e.fieldW,e.gridSize().w);assert.equal(e.phase,'active');assert.ok(e.bossAnimClock>48);assert.ok(e.playerAnimClock>37);
});
test('cut arena rejoins and pause freezes the pending handoff and geometry interpolation',()=>{
 const e=cue('volley-curve',2);e.volley.events=[];e.cutPolygon=[{x:-200,y:-350},{x:210,y:-350},{x:210,y:350},{x:-200,y:350}];e.cutTelegraph=null;e.cutCount=e.cutLimit;const area=Math.abs(polygonArea(e.cutPolygon));e.finish();run(e,.4);assert.ok(Math.abs(polygonArea(e.cutPolygon))>area);const age=e.continuity.age;e.paused=true;run(e,2);assert.equal(e.continuity.age,age);e.paused=false;next(e,5);assert.equal(e.pattern.id,'fluid');const b=cue('corridor-vertical');advanceEncounterCue(b);assert.ok(b.continuity.bridge);run(b,.3);const width=b.fieldW;b.paused=true;run(b,1);assert.equal(b.fieldW,width);
});
test('retained erosion walls keep moving and still block movement in the next normal attack',()=>{
 const e=cue('flowers');e.advanced.walls.push({y:150,vy:60,cols:3,rows:1,cellW:e.fieldW/3,cellH:60,cells:[1,1,1],age:0});const wall=e.advanced.walls[0];advanceEncounterCue(e);assert.equal(e.pattern.id,'rockets');assert.ok(e.advanced.walls.includes(wall));run(e,.1);assert.ok(wall.y>155);e.player=e.screen({x:0,y:wall.y-55});e.keys.add('s');run(e,.05);assert.ok(e.localPlayer().y<wall.y-45);
});
test('native menu monsters and their last bullets must finish instead of being erased at a timer',()=>{
 const e=cue('menu-deception-mobs',2);let clears=0;const wave={count:1,bulletCount:1,spawn:()=>null,resize:()=>{},step:()=>{},hitShots:()=>{},clear:()=>{clears++;}};e.menuDeception.wave=wave as any;run(e,31);assert.equal(e.menuDeception.spawned,20);assert.equal(e.pattern.id,'menu-deception-mobs');assert.equal(e.phase,'active');assert.equal(clears,0);wave.count=0;run(e,1);assert.equal(e.phase,'active');wave.bulletCount=0;run(e,.02);assert.equal(e.phase,'outro');assert.equal(clears,1);
});
test('fixed finale sections and the 40-second unlock keep already travelling bullets alive',()=>{
 const e=new Engine({getContext:()=>({})} as any,patterns);e.begin(patterns.findIndex(p=>p.id==='last-stand'),0);e.phase='active';e.invincible=true;run(e,19.9);const h=e.add({x:60,y:40,vx:0,vy:25,warn:0,life:30});run(e,.3);assert.ok(e.hazards.includes(h));assert.ok(h.y>47);run(e,19.9);assert.equal(e.finalStand.complete,true);assert.ok(e.hazards.includes(h));const y=h.y;run(e,.1);assert.ok(h.y>y);assert.equal(e.attackLocked,false);
});

// Historical continuity fixtures exercise a single explicit stage, independent of learning policy.
function enterEncounterCue(e:Engine){const c=(e.encounter.phase===1?phaseOneScore:phaseTwoScore)[e.encounter.cue];e.encounter.learning.stages=[c.stage];e.encounter.learning.step=0;enterOriginalCue(e,false,true);}
function advanceEncounterCue(e:Engine){e.encounter.learning.step=e.encounter.learning.stages.length-1;advanceOriginalCue(e);}
