/** CH2's actual emission, cadence, bullet metadata, motion and artwork. */
import {firePlayerWeaponBulletPatternSystem,addPlayerBulletEntitySystem} from '../../player/playerWeaponBulletPatternSystem';
import {getHobanuPlayerFireInterval,canHobanuPlayerShootNow} from '../../player/playerMovementRespawnAndSatelliteSystem';
import {updatePlayerWeaponBulletMotionSystem} from '../../player/playerWeaponBulletMotionSystem';
import {renderPlayerBulletByStyle} from '../../render/playerBulletRenderer';
import type {Bullet,PlayerWeaponStyle} from '../../entities';
import type {Engine} from './engine';
import type {Shot,Vec} from './core';
export type NativeWeapon={style:PlayerWeaponStyle;color:string;power:number;shotIndex:number};
export const freshNativeWeapon=():NativeWeapon=>({style:'science',color:'blue',power:1,shotIndex:0});
function runtime(e:Engine,p:Vec,bullets:Bullet[]=[]){
 const size=48;
 const outside=e.pattern.id==='exile'&&e.advanced.exile.detached;
 const menu=e.pattern.id.startsWith('menu-deception');
 const targets=outside?e.advanced.exile.enemies.map(a=>({...a,r:24})):menu?(e.menuDeception.wave?.snapshot??[]).map(a=>({...a,r:24})):e.enemies;
 const r:any={player:{x:p.x-size/2,y:p.y-size/2,width:size,height:size,powerLevel:e.nativeWeapon.power,weaponStyle:e.nativeWeapon.style,color:e.nativeWeapon.color},bullets,playerWeaponShotIndex:e.nativeWeapon.shotIndex,enemies:targets.map(a=>({active:a.hp>0,x:a.x-a.r,y:a.y-a.r,width:a.r*2,height:a.r*2})),bossEntity:{active:!outside&&!menu&&!e.storyInputLocked&&e.bossVisibility>.1,x:e.boss.x-52,y:e.boss.y-52,width:104,height:104}};
 r.addPlayerBlt=(...args:any[])=>addPlayerBulletEntitySystem(r,...args as [number,number,number,number,number,number,string,number,any]);
 return r;
}
export function nativeFireInterval(e:Engine){return getHobanuPlayerFireInterval(runtime(e,e.localPlayer()));}
export function nativeCanFire(e:Engine){return canHobanuPlayerShootNow(runtime(e,e.localPlayer()));}
export function emitNativeShots(e:Engine,p:Vec,heading=0):Shot[]{
 const r=runtime(e,p);firePlayerWeaponBulletPatternSystem(r);e.nativeWeapon.shotIndex=r.playerWeaponShotIndex;
 const c=Math.cos(heading),s=Math.sin(heading);
 return r.bullets.map((b:Bullet)=>{
  const dx=b.x+b.width/2-p.x,dy=b.y+b.height/2-p.y,x=p.x+dx*c-dy*s,y=p.y+dx*s+dy*c,vx=b.vx*c-b.vy*s,vy=b.vx*s+b.vy*c;
  b.x=x-b.width/2;b.y=y-b.height/2;b.vx=vx;b.vy=vy;
  return {x,y,vx,vy,age:0,native:b,heading};
 });
}
export function moveNativeShot(e:Engine,s:Shot,dt:number){
 if(!s.native)return;
 const b=s.native;b.x=s.x-b.width/2;b.y=s.y-b.height/2;b.vx=s.vx??0;b.vy=s.vy;
 updatePlayerWeaponBulletMotionSystem(runtime(e,e.localPlayer(),[b]),dt);
 s.vx=b.vx;s.vy=b.vy;if(!b.active)s.age=100;
}
export function drawNativeShot(e:Engine,c:CanvasRenderingContext2D,s:Shot){
 const b=s.native;if(!b)return;
 b.x=s.x-b.width/2;b.y=s.y-b.height/2;
 const r=runtime(e,e.pattern.id==='exile'?e.advanced.exile.world:e.localPlayer());r.ctx=c;
 renderPlayerBulletByStyle(r,b,s.x,s.y,b.width/2,b.height/2);
}
export const shotDamage=(s:Shot)=>Math.max(0,s.native?.damage??1);
export const isNativeBeam=(s:Shot)=>s.native?.playerBulletKind==='musicBeam';
