import {clamp} from './core';
// Exact 566 × 38 outer geometry is shared with the HP-sword collision model.
export const HP_BAR_WIDTH=566,HP_BAR_HEIGHT=38;
function hull(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){c.beginPath();c.moveTo(x+12,y);c.lineTo(x+w-12,y);c.lineTo(x+w,y+h/2);c.lineTo(x+w-12,y+h);c.lineTo(x+12,y+h);c.lineTo(x,y+h/2);c.closePath();}
export function drawHpBar(c:CanvasRenderingContext2D,ratio:number,stage:number,label:{phase?:string;health?:string}={}){
 c.save();c.translate(-HP_BAR_WIDTH/2,-HP_BAR_HEIGHT/2);ratio=clamp(ratio,0,1);
 const awakened=stage>=1;
 const frame=c.createLinearGradient(0,0,0,38);frame.addColorStop(0,'#fff1c5');frame.addColorStop(.32,'#c5a273');frame.addColorStop(.5,'#6d526c');frame.addColorStop(.7,'#e6c695');frame.addColorStop(1,'#877052');
 hull(c,0,0,566,38);c.fillStyle='#090812';c.fill();c.lineWidth=4;c.strokeStyle='#08070e';c.stroke();c.lineWidth=2;c.strokeStyle=frame;c.stroke();
 hull(c,8,5,550,28);c.fillStyle='#0b1027';c.fill();c.strokeStyle='#78608c';c.lineWidth=1;c.stroke();
 c.save();hull(c,13,8,540,22);c.clip();
 const fill=c.createLinearGradient(13,0,553,0);fill.addColorStop(0,awakened?'#592b9e':'#6b52ab');fill.addColorStop(.5,awakened?'#bb59f2':'#a77ee3');fill.addColorStop(.86,awakened?'#ecafff':'#d5bdff');fill.addColorStop(1,'#fff0c9');
 c.fillStyle=fill;c.fillRect(13,8,540*ratio,22);
 const gloss=c.createLinearGradient(0,8,0,30);gloss.addColorStop(0,'#ffffff55');gloss.addColorStop(.45,'#ffffff08');gloss.addColorStop(1,'#07041244');c.fillStyle=gloss;c.fillRect(13,8,540*ratio,22);
 c.strokeStyle='#12092166';for(let i=1;i<12;i++){const x=13+i*45;c.beginPath();c.moveTo(x+7,8);c.lineTo(x,30);c.stroke();}
 if(ratio>0){c.fillStyle='#ffedca';c.fillRect(11+540*ratio,8,2,22);}c.restore();
 // Six stars echo the story's six recovered seals, inside the physical bar bounds.
 for(let i=0;i<6;i++){const x=246+i*15;c.beginPath();c.moveTo(x,13);c.lineTo(x+2,17);c.lineTo(x+5,19);c.lineTo(x+2,21);c.lineTo(x,25);c.lineTo(x-2,21);c.lineTo(x-5,19);c.lineTo(x-2,17);c.closePath();c.fillStyle=i/6<ratio?'#ffe3ac':'#695274';c.fill();}
 c.font='900 11px system-ui,sans-serif';c.textBaseline='middle';c.fillStyle='#fff0da';c.textAlign='left';c.fillText(label.phase??(awakened?'PHASE II · AWAKENED':'PHASE I · DEGREEON'),24,19);c.textAlign='right';c.fillText(label.health??`${(ratio*100).toFixed(1)}%`,542,19);c.restore();
}
