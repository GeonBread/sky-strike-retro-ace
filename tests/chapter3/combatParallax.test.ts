import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {CombatParallax,type ParallaxScene} from '../../src/game/render/combatParallax';
const rng=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const runtime=(scene:ParallaxScene,seed=1)=>new CombatParallax(scene,rng(seed),()=>null);
test('day scenes keep exactly one small-cloud variant and one gold variant, with depth-ordered transparent clouds',()=>{
 const clouds=new Set(),gold=new Set(),speeds=new Set();
 for(let seed=0;seed<100;seed++){
  const p=runtime('wave12',seed),a=p.sample(0),b=p.sample(1000);
  assert.equal(a.length,3);assert.equal(a[0].speed,14);assert.equal(a[1].speed,24);assert.ok(8<a[0].speed&&a[0].speed<a[1].speed);
  for(const frame of a)assert.ok(frame.opacity>0&&frame.opacity<1);
  assert.deepEqual(a.map(f=>f.asset),b.map(f=>f.asset));clouds.add(a[1].asset);gold.add(a[2].asset);speeds.add(a[2].speed);assert.ok(a[2].speed>=19&&a[2].speed<=43);
 }
 assert.equal(clouds.size,2);assert.equal(gold.size,2);assert.ok(speeds.size>90);
});
test('night always has one of all three base clouds, and may add exactly one different faster cloud',()=>{
 const variants=new Set(),counts=new Set();let debris=false,debrisGap=false;
 for(let seed=0;seed<24;seed++){
  const p=runtime('wave3',seed);
  for(let t=0;t<=300;t+=2){
   const a=p.sample(t),base=a.filter(f=>f.id==='night-cloud'),near=a.filter(f=>f.id==='near-night-cloud');
   assert.equal(base.length,1);assert.ok(near.length<=1);variants.add(base[0].asset);counts.add(near.length);
   if(near.length){assert.notEqual(near[0].asset,base[0].asset);assert.ok(near[0].speed>base[0].speed);}
   if(a.some(f=>f.id==='corruption'&&f.opacity>0))debris=true;else debrisGap=true;
  }
 }
 assert.equal(variants.size,3);assert.equal(counts.size,2);assert.ok(debris&&debrisGap);
});
test('boss clouds and fragments appear independently, while CH3 relics stay faster than the base map',()=>{
 const cloudCounts=new Set(),fragmentCounts=new Set(),relics=new Set();
 for(let seed=0;seed<20;seed++){
  const two=runtime('boss2',seed),three=runtime('boss3',seed);
  for(let t=0;t<180;t+=2){
   const a=two.sample(t),cloud=a.find(f=>f.id==='boss-cloud'),fragment=a.find(f=>f.id==='boss-fragments');
   cloudCounts.add(!!cloud);fragmentCounts.add(!!fragment);if(cloud&&fragment)assert.ok(cloud.speed<fragment.speed);
   for(const f of three.sample(t)){relics.add(f.asset);assert.ok(f.speed>=195&&f.speed<=270);assert.ok(f.speed>122);}
  }
 }
 assert.equal(cloudCounts.size,2);assert.equal(fragmentCounts.size,2);assert.equal(relics.size,2);
});
test('scheduling is independent of frame rate and repeated draws never reroll a visible layer',()=>{
 for(const scene of ['wave12','wave3','boss2','boss3'] as const){
  const slow=runtime(scene,99),fast=runtime(scene,99);let prior;
  for(let t=0;t<=600;t++)prior=fast.sample(t);
  const a=slow.sample(600);assert.deepEqual(a,prior);assert.deepEqual(slow.sample(600),a);
 }
});
test('an appearance fades through zero at both edges and a restarted boss uses its current clock as origin',()=>{
 const p=runtime('boss3',5);let visible=false,gap=false;
 for(let t=0;t<200;t+=.1){for(const f of p.sample(t)){if(f.opacity>.2)visible=true;if(f.opacity<.01)gap=true;}}
 assert.ok(visible&&gap);
 const day=runtime('wave12');day.sample(300);day.reset(300);for(const f of day.sample(300))assert.equal(f.distance,0);
 for(const f of day.sample(301))assert.equal(f.distance,f.speed);
});
test('rendering preserves full PNG proportions, downward displacement and the caller alpha',()=>{
 const im={complete:true,naturalWidth:724,naturalHeight:2172} as HTMLImageElement;
 const p=new CombatParallax('wave12',rng(10),()=>im);
 const make=()=>{const c:any={draws:[],globalAlpha:.4,stack:[],save(){this.stack.push(this.globalAlpha)},restore(){this.globalAlpha=this.stack.pop()},beginPath(){},rect(){},clip(){},drawImage(...a:any[]){this.draws.push({args:a,alpha:this.globalAlpha})}};return c;};
 const a=make(),b=make();p.draw(a,922,960,0);p.draw(b,922,960,1);assert.equal(a.draws.length,9);
 for(let i=0;i<9;i++){
  const x=a.draws[i],y=b.draws[i],frame=p.sample(1)[Math.floor(i/3)];assert.ok(Math.abs(x.args[4]/x.args[3]-3)<1e-10);assert.ok(x.alpha<.4);
  assert.ok(Math.abs(y.args[2]-x.args[2]-frame.speed)<1e-8);
 }
 assert.equal(a.globalAlpha,.4);
 const missing=new CombatParallax('wave3',rng(1),()=>null),c=make();missing.draw(c,922,960,1);assert.equal(c.draws.length,0);
});
test('the embedded wave uses the identical runtime and random schedule as native chapters',()=>{
 const js=readFileSync(new URL('../../public/assets/runtime/combatParallax.js',import.meta.url),'utf8');const global:any={};runInNewContext(js,global);
 for(const scene of ['wave12','wave3','boss2','boss3'] as const){
  const ts=runtime(scene,31),embedded=new global.HobanuCombatParallax.CombatParallax(scene,rng(31),()=>null);
  for(const t of [0,1,20,100,1000])assert.deepEqual(JSON.parse(JSON.stringify(embedded.sample(t))),ts.sample(t));
 }
});
test('all original overlay PNGs and the replacement boss map are delivered without modification',()=>{
 const entries=JSON.parse(readFileSync(new URL('../../docs/combat-parallax-assets.json',import.meta.url),'utf8'));
 assert.equal(entries.length,16);
 for(const {target,sha256} of entries){const bytes=readFileSync(new URL('../../'+target,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256,target);assert.equal(bytes[25],target.includes('chapter3_boss_map')?2:6);}
});
