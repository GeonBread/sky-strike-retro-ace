// Resource-only adapter. Physics, warning timings and pattern sequencing stay in the supplied engine.
import type {Engine} from './engine';
const root='/';
export const assetPaths={
 player:'assets/common/player/hobanu_player.png',
 boss1:'assets/chapter3/story/characters/digrion_phase1.png',
 boss2:'assets/chapter3/story/characters/digrion_phase2_final.png',
 bg:'assets/chapter3/story/backgrounds/digrion_core.png',
 pure:'assets/chapter3/story/backgrounds/graduation_core_purified.png',
};
export const images:Partial<Record<keyof typeof assetPaths,HTMLImageElement>>={};
if(typeof Image!=='undefined')for(const [id,path] of Object.entries(assetPaths)){const im=new Image();im.src=root+path;images[id as keyof typeof assetPaths]=im;}
export function sprite(c:CanvasRenderingContext2D,id:keyof typeof assetPaths,x:number,y:number,w:number,h:number){const im=images[id];if(!im?.complete||!im.naturalWidth)return false;c.drawImage(im,x-w/2,y-h/2,w,h);return true;}
export function background(e:Engine,c:CanvasRenderingContext2D){
 if(!e.useResources)return;c.save();sprite(c,'bg',0,0,e.fieldW,e.fieldH);
 // Retain original warning/effect contrast without replacing the original FX passes.
 c.fillStyle='rgba(6,7,22,.32)';c.fillRect(-e.fieldW/2,-e.fieldH/2,e.fieldW,e.fieldH);
 if(e.purification>=0){c.globalAlpha=Math.min(1,e.purification/3.5);sprite(c,'pure',0,0,e.fieldW,e.fieldH);}c.restore();
}
