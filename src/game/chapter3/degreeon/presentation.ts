import {CANVAS_W,CANVAS_H} from './core';
/** Cinematics use the same logical rectangle and uniform scale as normal combat. */
export function fitBossPresentation(canvas:HTMLCanvasElement,scale:number){
 if(canvas.width!==CANVAS_W)canvas.width=CANVAS_W;
 if(canvas.height!==CANVAS_H)canvas.height=CANVAS_H;
 const plane=canvas.parentElement;
 if(plane){plane.style.width=CANVAS_W*scale+'px';plane.style.height=CANVAS_H*scale+'px';plane.style.aspectRatio=CANVAS_W+'/'+CANVAS_H;plane.style.transform='translate(-50%, -50%)';plane.style.border='0';plane.style.borderRadius='0';}
 return {w:CANVAS_W,h:CANVAS_H};
}
