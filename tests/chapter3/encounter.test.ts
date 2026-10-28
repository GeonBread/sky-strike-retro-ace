import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {phaseOneScore,phaseTwoScore,storyLines,revealDialogue,skipStoryScene,advanceStoryDialogue,advanceEncounterCue as advanceOriginalCue,enterEncounterCue as enterOriginalCue,PHASE_HP} from '../../src/game/chapter3/degreeon/encounter';
const run=(e:Engine,t:number)=>{for(let i=0;i<Math.ceil(t*120);i++)e.step(1/120);};
const make=(practice=false)=>{const e=new Engine({getContext:()=>({})}as any,patterns);e.startEncounter(practice);e.invincible=true;return e;};
const combat=(practice=false)=>{const e=make(practice);skipStoryScene(e);enterEncounterCue(e);e.skip();run(e,.03);return e;};
test('curated phase one uses sparse single supports and only the three grounded special attacks',()=>{
 const normals=phaseOneScore.filter(c=>patterns.find(p=>p.id===c.id)!.category==='normal'),attached=normals.filter(c=>c.supports.length);assert.ok(attached.length/normals.length<.45);assert.ok(phaseOneScore.every(c=>c.supports.length<=1));assert.deepEqual(new Set(phaseOneScore.filter(c=>patterns.find(p=>p.id===c.id)!.category==='special').map(c=>c.id)),new Set(['inspection','split8','graduation-gate']));assert.ok(phaseOneScore.flatMap(c=>c.supports).every(id=>['erosion','magnet','wall'].includes(id)));
});
test('phase two opens with the HP blade and every normal has one or two curated supports',()=>{
 assert.equal(phaseTwoScore[0].id,'hp-sword');for(const c of phaseTwoScore){const p=patterns.find(p=>p.id===c.id)!;assert.ok(p);if(p.category==='normal')assert.ok(c.supports.length>=1&&c.supports.length<=2,c.id);else assert.equal(c.supports.length,0,c.id);}for(const id of ['pause-storm','menu-deception','outside-hands','path-fold','exile'])assert.ok(phaseTwoScore.some(c=>c.id===id));
});
test('dialogue reveals slowly, pauses at emphasized words and can be read or advanced by input',()=>{
 const line=storyLines.threat![2];assert.equal(revealDialogue(line,0).text,'');assert.ok(revealDialogue(line,1).count<revealDialogue(line,5).count);assert.equal(revealDialogue(line,100).text,line.text);assert.equal(line.still,true);const e=make();run(e,6.6);advanceStoryDialogue(e);assert.equal(e.encounter.line,0);assert.equal(e.encounter.revealed,true);advanceStoryDialogue(e);assert.equal(e.encounter.line,1);
});
test('dialogue freezes all combat input, health and attack clocks, while pause freezes dialogue too',()=>{
 const e=make();const hp=e.hp,bombs=e.bombs,boss=e.bossHp,t=e.t;e.keys.add(' ');e.keys.add('d');run(e,.6);e.bomb();e.hit('cinematic');assert.equal(e.damageBoss(999),false);assert.equal(e.hp,hp);assert.equal(e.bombs,bombs);assert.equal(e.bossHp,boss);assert.equal(e.t,t);assert.equal(e.shots.length,0);const age=e.encounter.lineAge;e.paused=true;run(e,2);advanceStoryDialogue(e);assert.equal(e.encounter.lineAge,age);
});
test('pattern transitions preserve player health, bombs, boss HP and cumulative statistics',()=>{
 const e=combat();e.hp=2;e.bombs=1;e.bossHp=210;e.hits=1;e.bossHits=37;advanceEncounterCue(e);assert.equal(e.hp,2);assert.equal(e.bombs,1);assert.equal(e.bossHp,210);assert.equal(e.hits,1);assert.equal(e.bossHits,37);assert.equal(e.encounter.cue,1);assert.equal(e.bossForm,1);e.skip();run(e,11);assert.ok(e.encounter.cue>=2);assert.equal(e.bossHp,210);assert.equal(e.hp,2);
});
test('phase one depletion runs false victory, taunt, awakening and fourth-wall speech before phase two',()=>{
 const e=combat();e.hp=2;e.bombs=1;e.damageBoss(10000);run(e,.02);assert.equal(e.encounter.mode,'false-clear');assert.equal(e.bossForm,1);assert.equal(e.hazards.length,0);run(e,6.5);assert.equal(e.encounter.mode,'taunt');skipStoryScene(e);assert.equal(e.encounter.mode,'awakening');run(e,5.3);assert.equal(e.bossForm,2);run(e,6.8);assert.equal(e.encounter.mode,'threat');assert.equal(e.encounter.phase,2);assert.equal(e.bossHp,PHASE_HP[2]);assert.ok(storyLines.threat!.some(l=>l.text.includes('방향키')));skipStoryScene(e);assert.equal(e.pattern.id,'hp-sword');assert.equal(e.encounter.mode,'combat');assert.equal(e.hp,2);assert.equal(e.bombs,1);assert.equal(e.bossForm,2);
});
test('new cue order is deterministic, loops safely, retains live projectiles and never resets phase two form',()=>{
 const a=combat(true),b=combat(true);for(let i=0;i<phaseTwoScore.length+2;i++){assert.equal(a.pattern.id,b.pattern.id);assert.equal(a.bossForm,2);assert.equal(a.pattern.category==='normal'?a.selectedSupports.size>0:a.selectedSupports.size===0,true);const h=a.add({warn:0,life:10});advanceEncounterCue(a);advanceEncounterCue(b);assert.ok(a.hazards.includes(h));}assert.equal(a.encounter.loop,1);
});
test('ESC and menu scenes finish their attacks and full returns before the score advances',()=>{
 for(const id of ['pause-storm','menu-deception']){const e=combat(true);e.encounter.cue=phaseTwoScore.findIndex(c=>c.id===id);enterEncounterCue(e);e.phase='active';const old=e.encounter.cue;e.finish();run(e,2.4);assert.equal(e.encounter.cue,old,id);let waited=0;while((e.phase as string)!=='outro'&&waited<35){run(e,.01);waited+=.01;}assert.equal(e.phase,'outro',id);assert.equal(e.encounter.cue,old,id);run(e,2);assert.equal(e.encounter.cue,old,id);run(e,.3);assert.equal(e.encounter.cue,old+1,id);assert.equal(e.bossForm,2);}
});
test('the fullscreen stamp cue actually begins in a full arena while morph remains selected',()=>{
 const e=combat(true);e.encounter.cue=phaseTwoScore.findIndex(c=>c.id==='graduation-stamp');enterEncounterCue(e);e.skip();run(e,.1);assert.equal(e.fieldWarp.current,'full');assert.equal(e.selectedSupports.has('shape'),true);assert.equal(e.graduationStamp.quick,true);assert.ok(e.fieldW>922);
});
test('one percent is clamped and announces the fixed last stand; surviving it still requires the final shot',()=>{
 const e=combat(true);e.hp=2;e.bombs=1;e.damageBoss(10000);run(e,.02);assert.equal(e.encounter.mode,'last-warning');assert.equal(e.bossHp,PHASE_HP[2]*.01);assert.equal(e.attackLocked,true);skipStoryScene(e);assert.equal(e.pattern.id,'last-stand');assert.equal(e.finalStand.started,true);assert.equal(e.hp,2);assert.equal(e.bombs,1);e.skip();run(e,40.1);assert.equal(e.finalStand.complete,true);assert.equal(e.bossHp,1);assert.equal(e.encounter.mode,'combat');run(e,.5);assert.equal(e.encounter.mode,'combat');e.damageBoss(1);run(e,.02);assert.equal(e.encounter.mode,'victory');skipStoryScene(e);assert.equal(e.encounter.mode,'complete');const elapsed=e.encounter.elapsed;run(e,2);assert.equal(e.encounter.elapsed,elapsed);
});
test('death wins over a simultaneous phase transition and restart starts the whole encounter again',()=>{
 const e=combat();e.invincible=false;e.cooldown=0;e.hp=1;e.hit('death');e.bossHp=0;run(e,1.2);assert.equal(e.gameOver,true);assert.equal(e.encounter.mode,'combat');e.restart();assert.equal(e.encounter.mode,'opening');assert.equal(e.hp,3);assert.equal(e.bombs,3);assert.equal(e.bossHp,PHASE_HP[1]);assert.equal(e.gameOver,false);
});
test('manual pattern selection exits story mode and restores the original laboratory preferences',()=>{
 const e=new Engine({getContext:()=>({})}as any,patterns);e.select(patterns.findIndex(p=>p.id==='flowers'));e.selectedSupports=new Set(['time','recycle']);e.fullField=true;e.startEncounter();assert.equal(e.encounter.enabled,true);e.select(patterns.findIndex(p=>p.id==='tail-shed'));assert.equal(e.encounter.enabled,false);assert.equal(e.pattern.id,'tail-shed');assert.deepEqual([...e.selectedSupports],['time','recycle']);assert.equal(e.fullField,true);assert.equal(e.bossHpMax,240);
});
test('phase two practice has its own fresh stock, and manual phase skips or rotations cannot alter the score',()=>{
 const e=combat(true);assert.equal(e.encounter.practice,true);assert.equal(e.hp,3);assert.equal(e.bombs,3);const id=e.pattern.id,stage=e.stage;e.next();e.rotate();assert.equal(e.pattern.id,id);assert.equal(e.stage,stage);assert.equal(e.rotation,0);e.restart();assert.equal(e.encounter.mode,'threat');assert.equal(e.encounter.phase,2);
});

// Historical continuity fixtures exercise a single explicit stage, independent of learning policy.
function enterEncounterCue(e:Engine){const c=(e.encounter.phase===1?phaseOneScore:phaseTwoScore)[e.encounter.cue];e.encounter.learning.stages=[c.stage];e.encounter.learning.step=0;enterOriginalCue(e,false,true);}
function advanceEncounterCue(e:Engine){e.encounter.learning.step=e.encounter.learning.stages.length-1;advanceOriginalCue(e);}
