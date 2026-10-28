import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine,MAX_HP,CANVAS_W,CANVAS_H,PLAYER_MOVE_SPEED} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {STORM_CONTROL_TIME,STORM_WARN_TIME,stormAnchor,stormFlightSpeed,stormScreenShake,stormWindowHits} from '../../src/game/chapter3/degreeon/pauseStorm';
const run=(e:Engine,s:number)=>{for(let i=0;i<Math.ceil(s*120);i++)e.step(1/120);};
function active(stage=0){const e=new Engine({getContext:()=>({})} as any,patterns);e.begin(patterns.findIndex(p=>p.id==='pause-storm'),stage);e.invincible=true;return e;}
test('fake ESC is gameplay rather than a real pause, with 12–18 windows and a centered locked avatar',()=>{
 for(let stage=0;stage<4;stage++){
  const e=active(stage);assert.equal(e.pattern.category,'special');assert.equal(e.phase,'active');assert.equal(e.paused,false);assert.equal(e.pauseStorm.total,12+stage*2);assert.equal(e.pauseStorm.windows.length,12+stage*2);
  assert.equal(new Set(e.pauseStorm.windows.map(w=>w.id)).size,12+stage*2);assert.deepEqual(e.localPlayer(),{x:0,y:0});
  e.keys=new Set(['ArrowLeft','ArrowUp',' ']);e.bomb();run(e,STORM_CONTROL_TIME-.1);
  assert.deepEqual(e.localPlayer(),{x:0,y:0});assert.equal(e.shots.length,0);assert.equal(e.bombs,3);assert.equal(e.hp,MAX_HP);assert.equal(e.pauseStorm.cursor,0);
 }
});
test('multiplication precedes scatter and the actual full-size arena is ready before controls unlock',()=>{
 const e=active();run(e,.9);assert.equal(e.pauseStorm.phase,'fake');assert.equal(e.fieldW,CANVAS_W);assert.equal(e.fieldH,CANVAS_H);
 run(e,.8);assert.equal(e.pauseStorm.phase,'multiply');assert.ok(e.fieldW>CANVAS_W);assert.ok(e.pauseStorm.windows.every(w=>w.scale<1&&w.scale>.34));
 run(e,1.6);assert.equal(e.pauseStorm.phase,'scatter');assert.deepEqual({w:e.fieldW,h:e.fieldH},e.gridSize());assert.equal(new Set(e.pauseStorm.windows.map(w=>w.corner)).size,4);
 e.keys.add('ArrowRight');run(e,.4);assert.equal(e.pauseStorm.phase,'attack');assert.ok(e.localPlayer().x>0);
});
test('all eight directions move at the same speed and facing follows then persists without input',()=>{
 for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
  const e=active();run(e,3.65);e.player=e.screen({x:0,y:0});e.keys=new Set([...(x>0?['d']:x<0?['a']:[]),...(y>0?['s']:y<0?['w']:[])]);run(e,.45);
  assert.ok(Math.abs(Math.hypot(e.localPlayer().x,e.localPlayer().y)-PLAYER_MOVE_SPEED*.45)<.001);
  const target=Math.atan2(y,x)+Math.PI/2;assert.ok(Math.abs(Math.sin(e.playerFacing-target))<.025);const facing=e.playerFacing;e.keys.clear();run(e,.25);assert.ok(Math.abs(Math.sin(e.playerFacing-target))<=Math.abs(Math.sin(facing-target))+.001);
 }
});
test('randomly ordered windows shake in warning without damage and lock their aim before flying',()=>{
 const e=active();run(e,3.63);const s=e.pauseStorm,w=s.windows[s.order[0]],origin={x:w.x,y:w.y};assert.equal(w.state,'warn');
 assert.notDeepEqual(s.order,Array.from({length:s.total},(_,i)=>i));const aim={...w.aim};e.invincible=false;e.cooldown=0;e.player=e.screen(origin);run(e,.3);assert.equal(e.hp,MAX_HP);assert.equal(w.state,'warn');assert.deepEqual(w.aim,aim);
 e.player=e.screen({x:300,y:100});run(e,STORM_WARN_TIME);assert.equal(w.state,'fly');assert.ok(Math.abs(w.vx*aim.y-w.vy*aim.x)<1e-8);assert.ok(w.age>0);
});
test('launches are continuous, every window flies once, and wall impacts stay embedded',()=>{
 for(let stage=0;stage<4;stage++){
  const e=active(stage),s=e.pauseStorm,seen=new Set<number>();let first:any,position:any;
  for(let i=0;i<120*27&&e.phase==='active';i++){
   e.step(1/120);for(const w of s.windows){if(w.state==='fly'||w.state==='stuck')seen.add(w.id);if(w.state==='stuck'&&!first){first=w;position={x:w.x,y:w.y};}else if(w===first&&w.state==='stuck')assert.deepEqual({x:w.x,y:w.y},position);}
   if(s.cursor<s.total&&s.age>STORM_CONTROL_TIME)assert.ok(s.nextWarning-(s.age-STORM_CONTROL_TIME)<.7);
  }
  assert.equal(seen.size,12+stage*2);assert.equal(s.cursor,s.total);assert.equal(e.phase,'outro');assert.ok(first?.edge);assert.equal(first.vx,0);assert.equal(first.vy,0);
 }
});
test('live and embedded windows damage with their real rectangular body; idle corners remain safe',()=>{
 const e=active();run(e,3.65);e.invincible=false;e.cooldown=0;const idle=e.pauseStorm.windows.find(w=>w.state==='idle')!;e.player=e.screen(idle);run(e,.01);assert.equal(e.hp,3);
 const w=e.pauseStorm.windows.find(w=>w.state==='warn')!;w.state='fly';w.x=0;w.y=0;w.vx=w.vy=0;e.player=e.screen({x:w.w/2-2,y:w.h/2-2});run(e,.01);assert.equal(e.hp,2);
 e.cooldown=0;w.state='stuck';w.edge='left';w.along=.5;const p={x:-e.fieldW/2+w.w*.22,y:e.fieldH*.25};e.player=e.screen({x:p.x+w.w/2-2,y:p.y});run(e,.01);assert.equal(e.hp,1);
});
test('real pause freezes the attack, selection clears it, and rotation cannot disturb the fullscreen frame',()=>{
 const e=active();run(e,5);e.rotate();assert.equal(e.rotation,0);const state=JSON.stringify(e.pauseStorm);e.paused=true;run(e,2);assert.equal(JSON.stringify(e.pauseStorm),state);
 e.selectedSupports=new Set(['time','shape','clones']);e.select(patterns.findIndex(p=>p.id==='pause-storm'));run(e,4);assert.equal(e.fieldWarpEnabled,false);assert.equal(e.advanced.zones.length,0);assert.equal(e.bodies().length,1);
 e.select(patterns.findIndex(p=>p.id==='volley-core'));assert.equal(e.pauseStorm.windows.length,0);assert.equal(e.stormInputLocked,false);assert.equal(e.phase,'intro');
});
test('directional fire and purification bombs work after unlock and do not cancel pending windows',()=>{
 const e=active();run(e,3.65);e.keys.add('d');run(e,.6);e.nativeWeapon.style='humanities';e.keys.add(' ');run(e,.2);assert.ok(e.shots.length>0);assert.ok(e.shots.every(s=>(s.vx??0)>500&&Math.abs(s.vy)<20));
 e.keys.clear();e.shots=[];const w=e.pauseStorm.windows.find(w=>w.state==='fly')!;w.x=0;w.y=0;w.vx=w.vy=0;e.player=e.screen({x:0,y:0});e.bomb();run(e,.15);assert.equal(w.state,'cleared');assert.equal(e.bombs,2);assert.ok(e.pauseStorm.windows.some(w=>w.state==='idle'||w.state==='warn'));
});

test('every perimeter slot is disjoint and all four edges are populated in wide and tall viewports',()=>{
 for(const viewport of [{w:1600,h:960},{w:960,h:1707},{w:960,h:960},{w:3200,h:960}])for(let stage=0;stage<4;stage++){
  const e=active(stage);e.gridSize=()=>viewport;run(e,3.65);const ws=e.pauseStorm.windows;
  for(const w of ws)Object.assign(w,stormAnchor(e,w));assert.equal(new Set(ws.map(w=>w.corner)).size,4);
  for(let i=0;i<ws.length;i++)for(let j=i+1;j<ws.length;j++){const a=ws[i],b=ws[j];assert.ok(Math.abs(a.x-b.x)>=(a.w+b.w)/2+10||Math.abs(a.y-b.y)>=(a.h+b.h)/2+10,`${stage}: ${i},${j}`);}
 }
});
test('faster wall impacts generate inward fragments and a short camera jolt that fully decays',()=>{
 const e=active();run(e,4.45);const w=e.pauseStorm.windows.find(w=>w.state==='fly')!;assert.ok(Math.hypot(w.vx,w.vy)>550);run(e,.2);assert.ok(Math.hypot(w.vx,w.vy)>=800-.001);
 const edges=['left','right','top','bottom'];
 for(const edge of edges){w.state='fly';w.x=edge==='left'?-e.fieldW/2+w.w*.22+1:edge==='right'?e.fieldW/2-w.w*.22-1:0;w.y=edge==='top'?-e.fieldH/2+w.h*.22+1:edge==='bottom'?e.fieldH/2-w.h*.22-1:0;w.vx=edge==='left'?-800:edge==='right'?800:0;w.vy=edge==='top'?-800:edge==='bottom'?800:0;
  const before=e.pauseStorm.impacts;e.step(1/120);assert.equal(w.state,'stuck');assert.equal(e.pauseStorm.impacts,before+1);assert.equal(e.pauseStorm.impactShake,.18);assert.ok(e.pauseStorm.shards.length>=18);
  const shards=e.pauseStorm.shards.slice(-18);assert.ok(shards.every(p=>edge==='left'?p.vx>0:edge==='right'?p.vx<0:edge==='top'?p.vy>0:p.vy<0));assert.ok(Math.hypot(stormScreenShake(e).x,stormScreenShake(e).y)>0);
 }
 const shard=e.pauseStorm.shards[0],p={...shard};run(e,.1);assert.ok(Math.hypot(shard.x-p.x,shard.y-p.y)>10);run(e,.15);assert.equal(e.pauseStorm.impactShake,0);assert.deepEqual(stormScreenShake(e),{x:0,y:0});assert.ok(stormFlightSpeed(3)>stormFlightSpeed(0));
});

test('flying windows accelerate, tumble and retain only a short trail with matching rotated collision',()=>{
 const e=active();run(e,4.43);const w=e.pauseStorm.windows.find(w=>w.state==='fly')!,start=Math.hypot(w.vx,w.vy);run(e,.2);assert.ok(Math.hypot(w.vx,w.vy)>start);assert.ok(Math.abs(w.angle)>.1);assert.equal(w.trail.length,5);
 w.angle=Math.PI/2;assert.equal(stormWindowHits(w,{x:w.x,y:w.y+w.w*.45}),true);assert.equal(stormWindowHits(w,{x:w.x+w.w*.45,y:w.y}),false);
});
