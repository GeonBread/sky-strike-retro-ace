import type {Engine} from './engine';
import type {Pattern,Vec} from './core';
import {CANVAS_H,clamp,dot,smooth,polygonCentroid,polygonArea,pointInPolygon,clipPolygon,constrainToPolygon} from './core';
const purple='#b795ff';
const rectPoly=(e:Engine):Vec[]=>[{x:-e.fieldW/2,y:-e.fieldH/2},{x:e.fieldW/2,y:-e.fieldH/2},{x:e.fieldW/2,y:e.fieldH/2},{x:-e.fieldW/2,y:e.fieldH/2}];
const sizes=new WeakMap<Engine,{w:number;h:number}>();
export function initSpaceCut(e:Engine){sizes.set(e,{w:e.fieldW,h:e.fieldH});if(!e.cutEnabled)return;e.cutPolygon=rectPoly(e);e.cutPieces=[];e.cutTelegraph=null;e.cutCount=0;e.cutLimit=[2,3,4,4][e.stage];e.cutTimer=1.15;}
export function syncSpaceCut(e:Engine){
 if(!e.cutEnabled)return;if(e.cutPolygon.length<3){initSpaceCut(e);return;}
 const old=sizes.get(e)??{w:e.fieldW,h:e.fieldH};const sx=e.fieldW/old.w,sy=e.fieldH/old.h;if(Math.abs(sx-1)<1e-8&&Math.abs(sy-1)<1e-8)return;
 const scale=(p:Vec)=>{p.x*=sx;p.y*=sy;};e.cutPolygon.forEach(scale);for(const p of e.cutPieces){p.verts.forEach(scale);scale(p.center);scale(p.offset);scale(p.velocity);}
 const q=e.cutTelegraph;if(q){scale(q.point);const x=q.normal.x/sx,y=q.normal.y/sy,d=Math.hypot(x,y);q.normal={x:x/d,y:y/d};q.tangent={x:-q.normal.y,y:q.normal.x};}sizes.set(e,{w:e.fieldW,h:e.fieldH});
}
export function updateSpaceCut(e:Engine,dt:number){if(!e.cutEnabled)return;syncSpaceCut(e);updateCutPhysics(e,dt);if(e.cutTelegraph){e.cutTelegraph.age+=dt;if(e.cutTelegraph.age>=e.cutTelegraph.duration)executeCut(e);}else if(e.emitting&&e.cutCount<e.cutLimit){e.cutTimer-=dt;if(e.cutTimer<=0)beginCut(e);}}
function inset(e:Engine,split:number){
 let poly=e.cutPolygon.map(p=>({...p}));const original=e.cutPolygon,sign=polygonArea(original)>=0?1:-1,span=92*split,dx=Math.cos(e.angle),dy=-Math.sin(e.angle);
 for(let i=0;i<original.length;i++){const a=original[i],b=original[(i+1)%original.length],len=Math.hypot(b.x-a.x,b.y-a.y)||1,n={x:sign*(b.y-a.y)/len,y:-sign*(b.x-a.x)/len},m=5+span*Math.abs(n.x*dx+n.y*dy);poly=clipPolygon(poly,{x:a.x-n.x*m,y:a.y-n.y*m},n);if(poly.length<3)return [];}return poly;
}
export function constrainCutPlayer(e:Engine,before:Vec,next:Vec){
 if(!e.cutEnabled||e.cutPolygon.length<3)return next;let poly=inset(e,e.split);if(poly.length<3){let lo=0,hi=e.split;for(let i=0;i<18;i++){const mid=(lo+hi)/2;if(inset(e,mid).length>=3)lo=mid;else hi=mid;}e.split=lo;poly=inset(e,lo);}
 return constrainToPolygon(before,next,poly.length>=3?poly:e.cutPolygon);
}
function cutVertex(piece:Engine['cutPieces'][number],v:Vec){const c=Math.cos(piece.angle),s=Math.sin(piece.angle),x=v.x-piece.center.x,y=v.y-piece.center.y;return{x:piece.center.x+piece.offset.x+x*c-y*s,y:piece.center.y+piece.offset.y+x*s+y*c};}
function beginCut(e:Engine){
  if(e.cutCount>=e.cutLimit||e.cutTelegraph)return;const poly=e.cutPolygon,center=polygonCentroid(poly),player=e.localPlayer();let nx=player.x-center.x,ny=player.y-center.y,d=Math.hypot(nx,ny);
  if(d<55){const a=.75+e.cutCount*1.91+e.stage*.37;nx=Math.cos(a);ny=Math.sin(a);d=1;}nx/=d;ny/=d;
  const n={x:nx,y:ny},t={x:-ny,y:nx},proj=poly.map(p=>dot({x:p.x-center.x,y:p.y-center.y},n)),max=Math.max(...proj),playerProj=dot({x:player.x-center.x,y:player.y-center.y},n);
  const lineProj=clamp(Math.max(playerProj-34,max*.48),Math.max(38,max*.34),max-38),point={x:center.x+n.x*lineProj,y:center.y+n.y*lineProj};
  e.cutTelegraph={point,normal:n,tangent:t,age:0,duration:Math.max(.78,1.22-e.stage*.09)};e.log(`공간 절단 예고 · ${e.cutCount+1}/${e.cutLimit} · 플레이어 위치 추적`);
}
function executeCut(e:Engine){
  const cut=e.cutTelegraph;if(!cut)return;const old=e.cutPolygon,keep=clipPolygon(old,cut.point,cut.normal,false),drop=clipPolygon(old,cut.point,cut.normal,true);
  if(keep.length<3||drop.length<3||Math.abs(polygonArea(keep))<Math.abs(polygonArea(old))*.52){e.cutTelegraph=null;e.cutTimer=.6;return;}
  const player=e.localPlayer(),fell=dot({x:player.x-cut.point.x,y:player.y-cut.point.y},cut.normal)>0;
  e.cutPolygon=keep;const center=polygonCentroid(drop),t=cut.tangent,spread=(e.random()-.5)*55;
  e.cutPieces.push({id:e.cutCount+1,verts:drop,center,offset:{x:0,y:0},velocity:{x:cut.normal.x*52+t.x*spread,y:cut.normal.y*52+t.y*spread},angle:0,angular:(e.random()-.5)*1.8,age:0,settled:false});
  if(!pointInPolygon(e.boss,keep)){const core=polygonCentroid(keep),candidate={x:core.x,y:core.y-90};e.boss=pointInPolygon(candidate,keep)?candidate:core;}
  e.cutCount++;e.cutTelegraph=null;e.cutTimer=Math.max(1.65,2.85-e.stage*.22);e.shake=.14;e.fx(cut.point,'burst',72,purple,.72);e.log(`공간 분리 · 잔여 면적 ${Math.round(Math.abs(polygonArea(keep))/Math.abs(polygonArea(rectPoly(e)))*100)}%`);
  if(fell)e.hit('절단된 공간 낙하');e.player=e.screen(constrainCutPlayer(e,player,player));
}
function updateCutPhysics(e:Engine,dt:number){
  const g=e.gravityLocal(),floor=CANVAS_H-24;
  for(const p of e.cutPieces){p.age+=dt;if(p.settled)continue;p.velocity.x+=g.x*610*dt;p.velocity.y+=g.y*610*dt;p.offset.x+=p.velocity.x*dt;p.offset.y+=p.velocity.y*dt;p.angle+=p.angular*dt;
    let maxY=-Infinity;for(const v of p.verts)maxY=Math.max(maxY,e.screen(cutVertex(p,v)).y);
    if(maxY>floor){const corr=(maxY-floor)/Math.max(.2,e.zoom);p.offset.x-=g.x*corr;p.offset.y-=g.y*corr;const vn=dot(p.velocity,g),tan={x:g.y,y:-g.x},vt=dot(p.velocity,tan);
      if(vn>0){p.velocity.x-=g.x*vn*1.18;p.velocity.y-=g.y*vn*1.18;}p.velocity.x-=tan.x*vt*.2;p.velocity.y-=tan.y*vt*.2;p.angular*=.78;
      if(p.age>1.2&&Math.abs(vn)<32&&Math.abs(vt)<35&&Math.abs(p.angular)<.18){p.settled=true;p.velocity={x:0,y:0};p.angular=0;}
    }
  }
}

export function drawSpaceCut(e:Engine,c:CanvasRenderingContext2D){if(!e.cutEnabled)return;

    if(e.cutTelegraph){const q=e.cutTelegraph,k=clamp(q.age/q.duration,0,1),flash=.4+.4*k,span=900;c.save();
const danger=clipPolygon(e.cutPolygon,q.point,q.normal,true);
c.beginPath();danger.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();
c.fillStyle=`rgba(164,48,235,${.18+.2*k})`;c.fill();
c.save();c.clip();c.strokeStyle='#efaaff';c.globalAlpha=.55;c.lineWidth=3;
for(let x=-1200;x<1200;x+=38){c.beginPath();c.moveTo(x,-700);c.lineTo(x+1400,700);c.stroke();}
c.restore();
c.strokeStyle='#f0a5ff';c.shadowColor='#c66eff';c.shadowBlur=18;c.lineWidth=2.5;c.globalAlpha=.45+flash*.45;c.setLineDash([13,8]);c.beginPath();c.moveTo(q.point.x-q.tangent.x*span,q.point.y-q.tangent.y*span);c.lineTo(q.point.x+q.tangent.x*span,q.point.y+q.tangent.y*span);c.stroke();c.setLineDash([]);c.globalAlpha=.16+.18*k;c.lineWidth=16;c.beginPath();c.moveTo(q.point.x-q.tangent.x*span,q.point.y-q.tangent.y*span);c.lineTo(q.point.x+q.tangent.x*span,q.point.y+q.tangent.y*span);c.stroke();c.globalAlpha=1;c.shadowBlur=0;c.restore();}
    c.save();c.strokeStyle='#d6a4ff99';c.lineWidth=2;c.beginPath();e.cutPolygon.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();c.restore();

}
export const spaceCutPattern:Pattern={id:'cut',name:'공간 절단',english:'SEVERED ARENA',subtitle:'일반 공격을 피하면서 절단 예고의 중심 쪽으로 이동하세요.',orientation:0,category:'support',stages:['2회 절단','3회 연속 절단','4회 복합 절단','4회 고속 절단'],duration:29,enter:()=>{},update:()=>{},render:()=>{},exit:()=>{}};
