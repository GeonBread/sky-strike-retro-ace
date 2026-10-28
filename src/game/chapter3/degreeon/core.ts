import type { Engine } from './engine';
import type { Category } from './advanced';
export type Vec = { x: number; y: number };
export type BombParticle = Vec & { vx:number; vy:number; age:number; life:number; size:number; color:string };
export const CANVAS_W=922, CANVAS_H=960, CANVAS_CX=461, CANVAS_CY=480;
export const PLAYER_MOVE_SPEED=480, PLAYER_HIT_RADIUS=4, MAX_HP=3, MAX_BOMBS=3;
export const BASE_FIELD_W=CANVAS_W, BASE_FIELD_H=CANVAS_H;
export const BOMBARD_FIELD_W=CANVAS_W, BOMBARD_FIELD_H=CANVAS_H;
export const SMART_BOMB_SPEED=1200, SMART_BOMB_INNER_SCALE=.86, SMART_BOMB_EDGE_MARGIN=80, SMART_BOMB_BOSS_DAMAGE=40;
export type Phase = 'intro' | 'active' | 'outro' | 'bombard' | 'restore';
export type CutPiece = {
  id:number; verts:Vec[]; center:Vec; offset:Vec; velocity:Vec;
  angle:number; angular:number; age:number; settled:boolean;
};
export type CutTelegraph = { point:Vec; normal:Vec; tangent:Vec; age:number; duration:number };
export type Entity = Vec & {
  id: number; kind: 'orb'|'rect'|'rocket'|'spike'|'note'|'bomb'|'seed'|'petal';
  vx: number; vy: number; r: number; w: number; h: number;
  age: number; warn: number; life: number; color: string; tag: string;
  trail: Vec[]; lane: number; hold: number; fired: boolean;
  hp?:number;petals?:number;rotation?:number;petalIndex?:number;petalTimer?:number;group?:number;vertex?:number;vertices?:number;origin?:Vec;seedFrom?:Vec;seedTarget?:Vec;
  recycled?:boolean;edgeSeen?:boolean;portalCooldown?:number;
  motion?:BulletMotion;
  visual?:'drop'|'shard'|'core'|'needle'|'spear';
};
export type BulletMotion={kind:'jump'|'stop'|'fork'|'curve'|'edge-burst'|'cross'|'contract'|'slide'|'twins'|'spear';stage?:number;timer?:number;trigger?:number;speed?:number;direction?:Vec;anchor?:Vec;target?:Vec;side?:number;offset?:number;};
export type Shot = Vec & { native?: import('../../entities').Bullet; beamNextHit?:number; heading?:number; vx?: number; vy: number; age: number; phase?: number;portalCooldown?:number };
export type WorldActor=Vec&{id:number;vx:number;vy:number;age:number;life:number;r:number;hp:number;color:string;fireTimer:number;firePeriod:number;item:'life'|'bomb'|'energy';value:number;};
export type Effect = Vec & { age: number; life: number; radius: number; color: string; kind: 'ring'|'lane'|'burst'|'bomb'; lane: number };
export type Link = { a: Entity; b: Entity; age: number; strength: number; active: boolean };
export type Laser = { age: number; aim: number; paths: Vec[][]; count: number; fired: boolean; lastReflect: number; reflections: string[];headTime?:number;tailTime?:number; };
export interface Pattern {
  id: string; name: string; english: string; subtitle: string; orientation: number; category:Category;
  stages: string[]; duration: number;
  enter(e: Engine): void; update(e: Engine, dt: number): void; render(e: Engine, c: CanvasRenderingContext2D): void; exit(e: Engine): void;
}
export const modes = ['세로', '가로', '역세로', '역가로'];
export const clamp = (x:number,a:number,b:number) => Math.max(a,Math.min(b,x));
export const smooth = (x:number) => { x=clamp(x,0,1); return x*x*(3-2*x); };
export const distance = (a:Vec,b:Vec) => Math.hypot(a.x-b.x,a.y-b.y);
export const dot = (a:Vec,b:Vec) => a.x*b.x+a.y*b.y;
export function polygonArea(poly:Vec[]){
  let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p.x*q.y-q.x*p.y;}return a/2;
}
export function polygonCentroid(poly:Vec[]):Vec{
  const area=polygonArea(poly);if(Math.abs(area)<1e-7){const n=Math.max(1,poly.length);return poly.reduce((s,p)=>({x:s.x+p.x/n,y:s.y+p.y/n}),{x:0,y:0});}
  let x=0,y=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],f=p.x*q.y-q.x*p.y;x+=(p.x+q.x)*f;y+=(p.y+q.y)*f;}const k=1/(6*area);return{x:x*k,y:y*k};
}
export function pointInPolygon(p:Vec,poly:Vec[]){
  let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];if(((a.y>p.y)!==(b.y>p.y))&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }return inside;
}
/** Clips a convex polygon against dot(p-point, normal) <= 0 (or >= 0 for keepPositive). */
export function clipPolygon(poly:Vec[],point:Vec,normal:Vec,keepPositive=false){
  const out:Vec[]=[];if(poly.length<3)return out;
  const side=(p:Vec)=>dot({x:p.x-point.x,y:p.y-point.y},normal)*(keepPositive?1:-1)>=-1e-7;
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],ia=side(a),ib=side(b);
    if(ia)out.push({...a});
    if(ia!==ib){const da=dot({x:a.x-point.x,y:a.y-point.y},normal),db=dot({x:b.x-point.x,y:b.y-point.y},normal),t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
  }return out;
}
export function constrainToPolygon(prev:Vec,next:Vec,poly:Vec[]){
  if(poly.length<3||pointInPolygon(next,poly))return next;
  if(!pointInPolygon(prev,poly))return polygonCentroid(poly);
  let lo=0,hi=1;for(let i=0;i<18;i++){const m=(lo+hi)/2,p={x:prev.x+(next.x-prev.x)*m,y:prev.y+(next.y-prev.y)*m};if(pointInPolygon(p,poly))lo=m;else hi=m;}
  const p={x:prev.x+(next.x-prev.x)*lo,y:prev.y+(next.y-prev.y)*lo},cent=polygonCentroid(poly),d=Math.hypot(cent.x-p.x,cent.y-p.y)||1;
  return{x:p.x+(cent.x-p.x)/d*3,y:p.y+(cent.y-p.y)/d*3};
}
export function segmentDistance(p:Vec,a:Vec,b:Vec) {
  const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
  const t=l ? clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1) : 0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function circleRect(p:Vec,r:number,h:Vec&{w:number;h:number}) {
  return Math.hypot(p.x-clamp(p.x,h.x-h.w/2,h.x+h.w/2),p.y-clamp(p.y,h.y-h.h/2,h.y+h.h/2)) < r;
}
/** Includes exact wall impacts and at most maxBounces reflected segments. */
export function reflectedPath(start:Vec,angle:number,w:number,h:number,maxBounces=5):Vec[] {
  let p={...start},d={x:Math.cos(angle),y:Math.sin(angle)};
  const path=[{...p}];
  for(let i=0;i<=maxBounces;i++) {
    const tx=Math.abs(d.x)<1e-8?Infinity:((d.x>0?w/2:-w/2)-p.x)/d.x;
    const ty=Math.abs(d.y)<1e-8?Infinity:((d.y>0?h/2:-h/2)-p.y)/d.y;
    const t=Math.min(tx,ty);
    if(!Number.isFinite(t)||t<0) break;
    p={x:p.x+d.x*t,y:p.y+d.y*t};path.push({...p});
    if(Math.abs(tx-ty)<1e-5){d.x=-d.x;d.y=-d.y;}else if(tx<ty)d.x=-d.x;else d.y=-d.y;
    p={x:p.x+d.x*.001,y:p.y+d.y*.001};
  }
  return path;
}

export function linkEndpoints(a:Vec,b:Vec,strength:number):[Vec,Vec]{const k=(1-clamp(strength,0,1))/2;return [{x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k},{x:b.x+(a.x-b.x)*k,y:b.y+(a.y-b.y)*k}];}
