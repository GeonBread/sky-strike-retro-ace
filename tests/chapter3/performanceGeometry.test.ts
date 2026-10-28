import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine,circleRect} from '../../src/game/chapter3/degreeon/engine';
import {patterns} from '../../src/game/chapter3/degreeon/patterns';
import {wallHit} from '../../src/game/chapter3/degreeon/advanced';
test('nearby-cell collision search matches every intact and eroded wall cell including edge tangencies',()=>{
 const e=new Engine({getContext:()=>({})} as any,patterns);let seed=123;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 for(const width of [424,922,1800]){e.fieldW=width;const cols=Math.ceil(width/28),w={y:120,vy:50,cols,rows:4,cellW:width/cols,cellH:28,cells:Array.from({length:cols*4},()=>rand()>.4?1:0),age:0};
 for(let i=0;i<2000;i++){const p={x:(rand()-.5)*(width+100),y:120+(rand()-.5)*220},r=i%3===0?4:18;const reference=w.cells.some((hp,j)=>hp>.08&&circleRect(p,r,{x:-width/2+(j%cols+.5)*w.cellW,y:w.y+(Math.floor(j/cols)+.5-w.rows/2)*w.cellH,w:w.cellW,h:w.cellH}));assert.equal(wallHit(e,w,p,r),reference);}}
});
