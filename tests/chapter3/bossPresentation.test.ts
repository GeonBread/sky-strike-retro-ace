import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {startStoryPreview} from '../../src/game/chapter3/degreeon/encounter';
import {images,playerSprite} from '../../src/game/chapter3/degreeon/resources';
import {fitBossPresentation} from '../../src/game/chapter3/degreeon/presentation';
import {BOSS_MAP_SPEED} from '../../src/game/render/bossMapScroll';
const engine=()=>new Engine({getContext:()=>({})} as any,patterns);
test('arrival keeps the combat rectangle and equal X/Y scale after a fullscreen or rhythm pattern',()=>{
 for(const [vw,vh] of [[1440,900],[800,1100],[390,844]]){
  const scale=Math.min(vw,vh)/960,canvas={width:1600,height:1600,parentElement:{style:{}}};
  const result=fitBossPresentation(canvas as any,scale),style=canvas.parentElement.style as any;
  assert.deepEqual(result,{w:922,h:960});assert.equal(canvas.width,922);assert.equal(canvas.height,960);
  assert.ok(Math.abs(parseFloat(style.width)/922-parseFloat(style.height)/960)<1e-12);
  assert.ok(parseFloat(style.width)<=vw);assert.ok(parseFloat(style.height)<=vh);
 }
});
test('cinematic Hobanwoo has the same width as combat and retains its source 2:3 aspect ratio',()=>{
 const prior=images.player;try{
  images.player={complete:true,naturalWidth:1024,naturalHeight:1536} as HTMLImageElement;
  const draws:any[][]=[],ctx={drawImage:(...a:any[])=>draws.push(a)};
  assert.equal(playerSprite(ctx as any,0,404),true);
  const a=draws[0];assert.equal(a[3],48*2.85);assert.equal(a[4]/a[3],1.5);assert.equal(a[2]+a[4]/2,404);
 }finally{images.player=prior;}
});
test('phase changes keep accumulated background position while matching the CH1 phase speeds',()=>{
 const e=engine();e.startEncounter();
 assert.equal(e.bossMapStage,'phase1');e.step(.5);assert.equal(e.bossMapScroll,BOSS_MAP_SPEED.phase1*.5);
 const first=e.bossMapScroll;e.encounter.mode='awakening';e.step(.5);assert.equal(e.bossMapScroll,first+BOSS_MAP_SPEED.awakening*.5);
 const second=e.bossMapScroll;e.encounter.mode='threat';e.encounter.phase=2;e.step(.5);assert.equal(e.bossMapScroll,second+BOSS_MAP_SPEED.phase2*.5);
 const third=e.bossMapScroll;e.encounter.mode='victory';e.step(.5);assert.equal(e.bossMapScroll,third+BOSS_MAP_SPEED.defeated*.5);
});
test('background pauses with the scene and only a new encounter resets its position',()=>{
 const e=engine();startStoryPreview(e,'arrival');e.step(1);const offset=e.bossMapScroll;e.paused=true;e.step(5);assert.equal(e.bossMapScroll,offset);
 e.paused=false;e.step(.5);assert.equal(e.bossMapScroll,offset+43);e.startEncounter();assert.equal(e.bossMapScroll,0);
});
