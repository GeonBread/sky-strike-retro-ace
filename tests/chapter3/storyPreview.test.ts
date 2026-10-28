import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {startStoryPreview,skipStoryScene} from '../../src/game/chapter3/degreeon/encounter';
const make=()=>new Engine({getContext:()=>({})} as any,patterns);
const run=(e:Engine,t:number)=>{for(let i=0;i<t*120;i++)e.step(1/120)};
test('phase clear and awakening previews finish their full scenes without entering phase two combat',()=>{
 for(const kind of ['phase-clear','awakening'] as const){const e=make();startStoryPreview(e,kind);assert.equal(e.encounter.mode,kind==='phase-clear'?'false-clear':'awakening');run(e,85);assert.equal(e.encounter.mode,'preview-end');assert.equal(e.bossForm,2);assert.equal(e.hazards.length,0);assert.deepEqual(e.encounter.history,[]);const age=e.encounter.elapsed;run(e,2);assert.equal(e.encounter.elapsed,age);e.restart();assert.equal(e.encounter.preview,kind);assert.equal(e.encounter.mode,kind==='phase-clear'?'false-clear':'awakening');}
});
test('final victory preview directly reaches clear and can restart or open the card',()=>{
 const e=make();startStoryPreview(e,'victory');assert.equal(e.encounter.mode,'victory');run(e,40);assert.equal(e.encounter.mode,'complete');e.restart();assert.equal(e.encounter.mode,'victory');startStoryPreview(e,'complete');assert.equal(e.encounter.mode,'complete');assert.equal(e.bossHp,0);assert.equal(e.bossForm,2);run(e,10);assert.equal(e.hazards.length,0);
});
test('skipping a preview cannot accidentally start combat and lab selection exits preview cleanly',()=>{
 const e=make();startStoryPreview(e,'phase-clear');for(let i=0;i<4;i++)skipStoryScene(e);assert.equal(e.encounter.mode,'preview-end');e.select(patterns.findIndex(p=>p.id==='flowers'));assert.equal(e.encounter.enabled,false);assert.equal(e.encounter.preview,null);e.startEncounter();assert.equal(e.encounter.preview,null);
});
