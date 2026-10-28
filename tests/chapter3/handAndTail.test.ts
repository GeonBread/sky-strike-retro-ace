import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {handParts,handHits,handFrame} from '../../src/game/chapter3/degreeon/handRig';
const run=(e:Engine,t:number)=>{for(let i=0;i<Math.ceil(t*120);i++)e.step(1/120);};
const active=(id:string,stage=0)=>{const e=new Engine({getContext:()=>({})}as any,patterns);e.selectedSupports.clear();e.begin(patterns.findIndex(p=>p.id===id),stage);e.skip();run(e,.025);e.invincible=true;return e;};
test('hands have a palm, wrist, four articulated fingers and an independent thumb with bounded proportions',()=>{
 const e=active('outside-hands'),h={side:0,u:0,mode:'slam'as const,age:1.4,warn:1,life:1.6,impacted:false};
 for(const mode of ['slam','sweep','cage']as const){const p=handParts(e,{...h,mode}),f=p.filter(p=>p.kind==='finger');assert.equal(p.length,7);assert.equal(f.length,4);assert.ok(p.some(p=>p.kind==='thumb'));assert.ok(p.some(p=>p.kind==='arm'));assert.ok(f.every(p=>p.joints.length===2&&p.nail!.length>15));for(const part of f){const ys=part.points.map(p=>p.y);assert.ok(Math.max(...ys)-Math.min(...ys)<200);}}
});
test('organic outlines collide consistently after every edge rotation and preserve the gaps between fingers',()=>{
 const e=active('outside-hands');for(let side=0;side<4;side++){const h={side,u:0,mode:'slam'as const,age:1.4,warn:1,life:1.6,impacted:false},f=handFrame(e,h),p=handParts(e,h).find(p=>p.kind==='finger')!,j=p.joints[0],world={x:f.x+j.x*Math.cos(f.a)-j.y*Math.sin(f.a),y:f.y+j.x*Math.sin(f.a)+j.y*Math.cos(f.a)};assert.equal(handHits(e,h,world),true);h.age=.9;assert.equal(handHits(e,h,world),false);}
 const h={side:1,u:0,mode:'cage'as const,age:1.4,warn:1,life:2,impacted:false};assert.equal(handHits(e,h,{x:0,y:0}),false);assert.equal(handHits(e,h,{x:0,y:-48}),true);
});
test('tail salvos continuously emit two comets at sub-second intervals in every stage',()=>{
 for(let stage=0;stage<4;stage++){const e=active('tail-shed',stage),times:number[]=[];const add=e.add.bind(e);e.add=v=>{if(v.tag==='꼬리 분리 대형탄')times.push(e.t);return add(v);};run(e,8);assert.ok(times.length>=24);for(let i=0;i<times.length;i+=2){assert.equal(times[i],times[i+1]);if(i>0)assert.ok(times[i]-times[i-2]<=.66);}}
});
test('released tail bullets descend through the lower battlefield and punish standing still',()=>{
 const e=active('tail-shed');run(e,5.5);assert.ok(e.hazards.some(h=>h.tag==='꼬리를 벗는 소형탄'&&h.y>e.fieldH*.23&&h.vy>150));const target=active('tail-shed');target.invincible=false;target.cooldown=0;run(target,8);assert.ok(target.hits>0,'continuous aimed tails must reach a stationary player');
});
test('tail target locks at detachment, then frozen bullets give a full local warning before launch',()=>{
 const e=active('tail-shed');run(e,2.05);const c=e.extraNormal.chains.find(c=>c.detached)!;assert.ok(c);assert.equal(c.released,0);assert.ok(c.tails.every(p=>p.vx===0&&p.vy===0));const target={...c.target};e.player=e.screen({x:350,y:200});run(e,.2);assert.deepEqual(c.target,target);run(e,.4);assert.ok(c.released>0);
});
test('bombed tail bullets never reappear from retained chain state',()=>{
 const e=active('tail-shed');run(e,2.2);e.beat=100;e.smartBombActive=true;e.smartBombWorldOrigin={x:0,y:0};e.smartBombRadius=5000;e.applySmartBombDamage();e.smartBombActive=false;assert.equal(e.hazards.length,0);run(e,2);assert.equal(e.hazards.length,0);assert.equal(e.extraNormal.chains.length,0);
});
