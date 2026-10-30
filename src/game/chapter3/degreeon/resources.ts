import {drawScrollingMapDown} from "../../render/scrollingMap";
// Resource-only adapter. Physics, warning timings and pattern sequencing stay in the supplied engine.
import type {Engine} from './engine';
const root='/';
export const assetPaths={
 player:'assets/common/player/hobanu_player.png',
 boss1:'assets/chapter3/story/characters/digrion_phase1.png',
 boss2:'assets/chapter3/story/characters/digrion_phase2_final.png',
 bg:'assets/chapter3/combat/boss/backgrounds/chapter3_boss_map.png',
 pure:'assets/chapter3/story/backgrounds/graduation_core_purified.png',
};
export const images:Partial<Record<keyof typeof assetPaths,HTMLImageElement>>={};
if(typeof Image!=='undefined')for(const [id,path] of Object.entries(assetPaths)){const im=new Image();im.src=root+path;images[id as keyof typeof assetPaths]=im;}
export function sprite(c:CanvasRenderingContext2D,id:keyof typeof assetPaths,x:number,y:number,w:number,h:number){const im=images[id];if(!im?.complete||!im.naturalWidth)return false;c.drawImage(im,x-w/2,y-h/2,w,h);return true;}
export function background(e:Engine,c:CanvasRenderingContext2D){
 if(!e.useResources)return;c.save();drawBattleMap(e,c);
 // Retain original warning/effect contrast without replacing the original FX passes.
 c.fillStyle='rgba(6,7,22,.32)';c.fillRect(-e.fieldW/2,-e.fieldH/2,e.fieldW,e.fieldH);
 if(e.purification>=0){c.globalAlpha=Math.min(1,e.purification/3.5);sprite(c,'pure',0,0,e.fieldW,e.fieldH);}c.restore();
}

/** The same moving map is shared by combat, arrival and awakening fragments. */
export function drawBattleMap(e:Engine,c:CanvasRenderingContext2D,w=e.fieldW,h=e.fieldH){
 c.save();c.translate(-w/2,-h/2);const ok=drawScrollingMapDown(c,images.bg,w,h,e.clock,8);c.restore();return ok;
}
