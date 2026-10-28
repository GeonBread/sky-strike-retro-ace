import type {Vec} from './core';
/** Far intersection of a forward ray with the current viewport, extended beyond its visible edge. */
export function viewportRayEnd(p:Vec,angle:number,w:number,h:number,overflow=64):Vec{
 const d={x:Math.cos(angle),y:Math.sin(angle)};let near=0,far=Infinity;
 for(const [origin,velocity,max] of [[p.x,d.x,w],[p.y,d.y,h]]){
  if(Math.abs(velocity)<1e-10){if(origin< -overflow||origin>max+overflow)return{...p};continue;}
  let a=(-overflow-origin)/velocity,b=(max+overflow-origin)/velocity;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);
 }
 if(!Number.isFinite(far)||far<near)return{...p};
 return{x:p.x+d.x*far,y:p.y+d.y*far};
}
