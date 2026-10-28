import {test} from 'node:test';
import assert from 'node:assert/strict';
import {viewportRayEnd} from '../../src/game/chapter3/degreeon/viewportRay';
test('warning and damage rays reach the current viewport edge at every angle, including ultra-wide and tall scenes',()=>{
 for(const [w,h] of [[1600,960],[3200,960],[6000,1200],[960,5000]])for(const p of [{x:25,y:40},{x:w/2,y:h/2},{x:w-50,y:h-30}])for(let i=0;i<72;i++){
  const a=i*Math.PI/36,end=viewportRayEnd(p,a,w,h),dx=end.x-p.x,dy=end.y-p.y;
  assert.ok(Number.isFinite(end.x)&&Number.isFinite(end.y));assert.ok(Math.abs(dx*Math.sin(a)-dy*Math.cos(a))<1e-6);assert.ok(dx*Math.cos(a)+dy*Math.sin(a)>=0);
  assert.ok(end.x>=-64-1e-6&&end.x<=w+64+1e-6&&end.y>=-64-1e-6&&end.y<=h+64+1e-6);assert.ok(Math.min(Math.abs(end.x+64),Math.abs(end.x-w-64),Math.abs(end.y+64),Math.abs(end.y-h-64))<1e-6);
 }
 const end=viewportRayEnd({x:40,y:80},0,3200,960);assert.equal(end.x,3264);assert.equal(end.y,80);assert.ok(end.x-40>1200);
});
test('resizing immediately changes the far endpoint, and an entering ray crosses the entire visible scene',()=>{
 assert.equal(viewportRayEnd({x:-100,y:100},0,1600,960).x,1664);assert.equal(viewportRayEnd({x:-100,y:100},0,3200,960).x,3264);assert.deepEqual(viewportRayEnd({x:-100,y:100},Math.PI,3200,960),{x:-100,y:100});
 const p={x:100,y:100},a=Math.PI/4,small=viewportRayEnd(p,a,1600,960),large=viewportRayEnd(p,a,3200,3200);assert.ok(Math.hypot(large.x-p.x,large.y-p.y)>3*Math.hypot(small.x-p.x,small.y-p.y));
});
