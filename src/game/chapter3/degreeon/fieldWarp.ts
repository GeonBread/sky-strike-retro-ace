import type {Engine} from './engine';
import {BASE_FIELD_W,BASE_FIELD_H,clamp,smooth} from './core';
export type FieldShape='base'|'tall'|'flat'|'full'|'wide'|'tiny';
export const fieldShapes:FieldShape[]=['base','tall','flat','full','wide','tiny'];
export type FieldWarpState={mode:'hold'|'warn'|'morph';age:number;current:FieldShape;target:FieldShape;from:{w:number;h:number};bag:FieldShape[];changes:number;full:boolean;preview:{w:number;h:number}|null};
export const freshFieldWarp=():FieldWarpState=>({mode:'hold',age:0,current:'base',target:'base',from:{w:BASE_FIELD_W,h:BASE_FIELD_H},bag:[],changes:0,full:false,preview:null});
export const shapeNames:Record<FieldShape,string>={base:'기본 전장',tall:'길쭉한 전장',flat:'납작한 전장',full:'전체 화면',wide:'가로 확장',tiny:'초소형 전장'};
/** Fit a physical rotating rectangle, keeping character and projectile sizes unchanged. */
export function fieldShapeSize(e:Engine,tag:FieldShape){
 const v=e.gridSize(),quarter=Math.sin(e.angle)**2;
 let w=BASE_FIELD_W,h=BASE_FIELD_H;
 if(tag==='full'){w=v.w+(v.h-v.w)*quarter;h=v.h+(v.w-v.h)*quarter;}
 if(tag==='tall'){w=BASE_FIELD_W*.58;h=v.h*.96;}
 if(tag==='flat'){w=v.w*.94;h=Math.min(BASE_FIELD_H*.43,v.h*.48);}
 if(tag==='wide'){w=BASE_FIELD_W*1.25;h=BASE_FIELD_H*.9;}
 if(tag==='tiny'){w=BASE_FIELD_W*.46;h=BASE_FIELD_H*.46;}
 const c=Math.abs(Math.cos(e.angle)),s=Math.abs(Math.sin(e.angle)),fit=Math.min(1,v.w/(w*c+h*s),v.h/(w*s+h*c));
 return{w:Math.max(310,w*fit),h:Math.max(320,h*fit)};
}
export function syncFieldWarp(e:Engine){
 if(!e.fieldWarpEnabled)return;const f=e.fieldWarp,to=fieldShapeSize(e,f.mode==='hold'?f.current:f.target),k=f.mode==='morph'?smooth(f.age/1.2):f.mode==='hold'?1:0;
 let w=f.mode==='hold'?to.w:f.from.w+(to.w-f.from.w)*k,h=f.mode==='hold'?to.h:f.from.h+(to.h-f.from.h)*k;
 const v=e.gridSize(),c=Math.abs(Math.cos(e.angle)),s=Math.abs(Math.sin(e.angle)),fit=Math.min(1,v.w/(w*c+h*s),v.h/(w*s+h*c));w*=fit;h*=fit;
 const p=e.localPlayer();e.fieldW=w;e.fieldH=h;f.preview=f.mode==='hold'?null:to;
 f.full=(f.mode==='hold'?f.current:f.mode==='morph'&&k>.5?f.target:f.current)==='full';
 const clone=e.split*92,mx=13+Math.abs(Math.cos(e.angle))*clone,my=13+Math.abs(Math.sin(e.angle))*clone;
 p.x=clamp(p.x,-w/2+mx,w/2-mx);p.y=clamp(p.y,-h/2+my,h/2-my);e.player=e.screen(p);
 e.boss.x=clamp(e.boss.x,-w/2+70,w/2-70);if(!e.encounter.enabled)e.boss.y=-h/2+Math.min(145,h*.24);
 for(const wall of e.advanced.walls)wall.cellW=w/wall.cols;
}
export function updateFieldWarp(e:Engine,dt:number){
 if(!e.fieldWarpEnabled||e.phase!=='active'||e.gameOver||e.dead>0)return;const f=e.fieldWarp;f.age+=dt;
 if(e.emitting&&f.mode==='hold'&&f.age>=2.6){
  if(!f.bag.length){f.bag=[...fieldShapes];for(let i=f.bag.length-1;i>0;i--){const j=Math.floor(e.random()*(i+1));[f.bag[i],f.bag[j]]=[f.bag[j],f.bag[i]];}}
  // No immediate repeat; retain skipped entries for later cycles.
  let index=f.bag.findIndex(t=>t!==f.current);if(index<0){f.bag=[...fieldShapes].filter(t=>t!==f.current);index=0;}
  f.target=f.bag.splice(index,1)[0];f.from={w:e.fieldW,h:e.fieldH};f.mode='warn';f.age=0;e.log(`전장 변형 예고 · ${shapeNames[f.target]}`);
 }else if(f.mode==='warn'&&f.age>=.8){f.mode='morph';f.age=0;}
 else if(f.mode==='morph'&&f.age>=1.2){f.current=f.target;f.mode='hold';f.age=0;f.changes++;}
 syncFieldWarp(e);
}
export function fieldWarpCanvasSize(e:Engine){
 const p=e.fieldWarp.preview;return{w:Math.ceil(Math.max(e.fieldW,p?.w??0)),h:Math.ceil(Math.max(e.fieldH,p?.h??0))};
}
export function drawFieldWarpWarning(e:Engine,c:CanvasRenderingContext2D){
 if(!e.fieldWarpEnabled||!e.fieldWarp.preview)return;const f=e.fieldWarp,p=f.preview!;
 c.save();c.strokeStyle='#ffe59a';c.lineWidth=2;c.setLineDash([18,9]);c.globalAlpha=f.mode==='warn'?.35+.35*clamp(f.age/.8,0,1):.5;
 c.strokeRect(-p.w/2,-p.h/2,p.w,p.h);c.setLineDash([]);c.lineWidth=4;
 for(const sx of [-1,1])for(const sy of [-1,1]){const x=sx*p.w/2,y=sy*p.h/2;c.beginPath();c.moveTo(x-sx*28,y);c.lineTo(x,y);c.lineTo(x,y-sy*28);c.stroke();}
 c.restore();
}
