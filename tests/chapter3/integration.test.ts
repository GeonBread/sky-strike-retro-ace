import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {startCuePractice,phaseOneScore,phaseTwoScore,enterEncounterCue,advanceEncounterCue,skipStoryScene,PHASE_HP} from '../../src/game/chapter3/degreeon/encounter';
import {emitNativeShots,nativeFireInterval} from '../../src/game/chapter3/degreeon/nativeWeapon';
import {firePlayerWeaponBulletPatternSystem,addPlayerBulletEntitySystem} from '../../src/game/player/playerWeaponBulletPatternSystem';
import {freshLearning,startLearning} from '../../src/game/chapter3/degreeon/learning';
import {readFileSync} from 'node:fs';
const make=()=>new Engine({getContext:()=>({})} as any,patterns);
const run=(e:Engine,t:number)=>{for(let i=0;i<Math.ceil(t*120);i++)e.step(1/120);};
test('first sight learns stages 1–4; repeat sight uses stages 3–4 and a different pattern starts fresh',()=>{
 const l=freshLearning();assert.equal(startLearning(l,'flowers'),0);assert.deepEqual(l.stages,[0,1,2,3]);assert.equal(startLearning(l,'flowers'),2);assert.deepEqual(l.stages,[2,3]);assert.equal(startLearning(l,'mirror'),0);
});
test('actual encounter advances through four learning stages before changing its score cue',()=>{
 const e=make();e.startEncounter();skipStoryScene(e);assert.equal(e.stage,0);for(const stage of [1,2,3]){advanceEncounterCue(e);assert.equal(e.encounter.cue,0);assert.equal(e.stage,stage);}advanceEncounterCue(e);assert.equal(e.encounter.cue,1);assert.equal(e.stage,0);
});
test('shared primary patterns remember phase-one learning during phase two',()=>{
 const e=make();e.startEncounter();e.encounter.cue=phaseOneScore.findIndex(c=>c.id==='flowers');enterEncounterCue(e);e.encounter.phase=2;e.encounter.cue=phaseTwoScore.findIndex(c=>c.id==='flowers');enterEncounterCue(e);assert.equal(e.encounter.learning.first,false);assert.equal(e.stage,2);assert.equal(e.bossForm,2);
});
test('whole-fight retry clears learned IDs and restarts phase-one introduction with full stock',()=>{
 const e=make();e.startEncounter();skipStoryScene(e);e.encounter.learning.seen.add('flowers');e.hp=1;e.bombs=0;e.restart();assert.equal(e.encounter.learning.seen.size,0);assert.equal(e.encounter.mode,'opening');assert.equal(e.hp,3);assert.equal(e.bombs,3);assert.equal(e.bossHp,PHASE_HP[1]);
});
test('phase-specific tests retain their actual support combinations and loop without accidental phase clear',()=>{
 for(const phase of [1,2] as const){const score=phase===1?phaseOneScore:phaseTwoScore;for(let i=0;i<score.length;i++){
  const e=make();startCuePractice(e,phase,i,'expert');assert.equal(e.bossForm,phase);assert.equal(e.pattern.id,score[i].id);assert.deepEqual([...e.selectedSupports],score[i].supports);assert.equal(e.stage,2);e.phase='active';const hp=e.bossHp;e.damageBoss(1e6);assert.equal(e.bossHp,hp);advanceEncounterCue(e);advanceEncounterCue(e);assert.equal(e.encounter.cue,i);assert.equal(e.encounter.phase,phase);
 }}
});
test('all three weapon styles and all five power levels emit exactly CH2 native bullets and metadata',()=>{
 for(const style of ['science','humanities','arts'] as const)for(let power=1;power<=5;power++){
  const e=make();e.nativeWeapon.style=style;e.nativeWeapon.power=power;const p={x:150,y:280};const shots=emitNativeShots(e,p);
  const ref:any={player:{x:p.x-24,y:p.y-24,width:48,height:48,powerLevel:power,weaponStyle:style,color:'blue'},bullets:[],playerWeaponShotIndex:0};ref.addPlayerBlt=(...a:any[])=>addPlayerBulletEntitySystem(ref,...a as [number,number,number,number,number,number,string,number,any]);firePlayerWeaponBulletPatternSystem(ref);
  assert.equal(shots.length,ref.bullets.length);
  for(let i=0;i<shots.length;i++)for(const k of ['vx','vy','damage','width','height','playerBulletKind','playerBulletSprite','playerBulletHoming','playerBeamBig'])assert.equal((shots[i].native as any)[k],ref.bullets[i][k],`${style}/${power}/${k}`);
 }
});
test('native firing cadence and science burst pause replace simulator 0.17 second fire',()=>{
 const e=make();e.nativeWeapon.style='science';assert.equal(nativeFireInterval(e),.054);e.nativeWeapon.style='humanities';assert.equal(nativeFireInterval(e),.12);e.nativeWeapon.style='arts';assert.equal(nativeFireInterval(e),.185);
});
test('native shots carry damage, survive a learning transition, and use directional movement in a menu arena',()=>{
 const e=make();e.startEncounter();skipStoryScene(e);e.phase='active';e.shotTimer=0;e.keys.add(' ');e.nativeWeapon.style='humanities';e.updateShots(.13);assert.ok(e.shots.length>0);assert.ok(e.shots.every(s=>!!s.native));const s=e.shots[0];advanceEncounterCue(e);assert.ok(e.shots.includes(s));const directional=emitNativeShots(e,{x:0,y:100},Math.PI/2);assert.ok((directional[0].vx??0)>600);assert.ok(Math.abs(directional[0].vy)<1e-6);
});
test('native damage reaches the real boss and cinematic/last-stand locks block fire',()=>{
 const e=make();e.startEncounter();skipStoryScene(e);e.phase='active';e.boss={x:0,y:-200};e.player=e.screen({x:0,y:100});e.keys.add(' ');e.nativeWeapon.style='humanities';e.invincible=true;const before=e.bossHp;run(e,.5);assert.ok(e.bossHp<before);e.encounter.mode='awakening';const n=e.shots.length;run(e,1);assert.equal(e.shots.length,n);assert.equal(e.t<1,true);
});
test('story handoff keeps existing dialogue indices, waits for boss-complete, and host does not replay the launch',()=>{
 const html=readFileSync(new URL('../../src/embedded/chapter3Story.html',import.meta.url),'utf8');assert.equal(html.includes('C3D.fx("boss-running"'),false);assert.match(html,/HOST_SELECTOR_MODE && effectId === 'boss-battle-transition'/);assert.match(html,/message.type === 'boss-complete'/);
 const host=readFileSync(new URL('../../src/components/story/Chapter3StoryExperience.tsx',import.meta.url),'utf8');assert.match(host,/storyLaunchAppliedRef.current===signature/);assert.match(host,/screen === "boss"/);assert.match(host,/kind:"boss"/);
});
