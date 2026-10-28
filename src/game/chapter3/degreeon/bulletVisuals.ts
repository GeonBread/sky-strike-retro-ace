import type { Entity } from './core';

const TAU=Math.PI*2;
type Art=NonNullable<Entity['visual']>;
const cache=new Map<string,{canvas:HTMLCanvasElement;extent:number}>();
function polygon(c:CanvasRenderingContext2D,points:number[][]){
 c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
}
function gem(c:CanvasRenderingContext2D,points:number[][],r:number,color:string){
 const body=c.createLinearGradient(-r*.45,-r,r*.6,r);
 body.addColorStop(0,'#ffffff');body.addColorStop(.19,'#f9dfff');body.addColorStop(.42,color);body.addColorStop(.72,'#784290');body.addColorStop(1,'#27113e');
 polygon(c,points);c.fillStyle=body;c.fill();c.strokeStyle='#180e2a';c.lineWidth=r<9?2.3:3;c.lineJoin='round';c.stroke();
 polygon(c,points.map(([x,y])=>[x*.86,y*.86]));c.strokeStyle='#ffe8fb';c.lineWidth=1;c.stroke();
}
function spark(c:CanvasRenderingContext2D,x:number,y:number,r:number,color:string){
 c.fillStyle=color;polygon(c,[[x+r,y],[x,y-r*.65],[x-r,y],[x,y+r*.65]]);c.fill();
}
/** Every glow and inlay belongs to one projectile; no shared lines or trails. */
function spriteArt(c:CanvasRenderingContext2D,kind:Art,r:number,color:string){
 const radius=kind==='spear'?41:r*2.25;
 const glow=c.createRadialGradient(0,0,0,0,0,radius);
 glow.addColorStop(0,color+'b0');glow.addColorStop(.34,color+'65');glow.addColorStop(.7,color+'1c');glow.addColorStop(1,color+'00');
 c.fillStyle=glow;c.beginPath();c.arc(0,0,radius,0,TAU);c.fill();
 if(kind==='core'){
  const points=Array.from({length:8},(_,i)=>{const a=i*TAU/8+Math.PI/8;return [Math.cos(a)*r,Math.sin(a)*r];});
  gem(c,points,r,color);
  for(let i=0;i<8;i++){
   c.fillStyle=i<3?'#ffffff80':i<5?color+'80':'#27113e90';
   polygon(c,[[0,0],points[i],points[(i+1)%8]]);c.fill();
  }
  c.fillStyle='#251332';c.beginPath();c.arc(0,0,r*.72,0,TAU);c.fill();
  c.strokeStyle='#f9cd82';c.lineWidth=Math.max(1.1,r*.09);
  for(let i=0;i<8;i++){const a=i*TAU/8;c.beginPath();c.arc(0,0,r*.64,a+.09,a+TAU/8-.09);c.stroke();}
  const heart=c.createRadialGradient(-r*.16,-r*.16,0,0,0,r*.55);
  heart.addColorStop(0,'#ffffff');heart.addColorStop(.3,'#fff2b9');heart.addColorStop(.62,color);heart.addColorStop(1,'#5a277c');
  c.fillStyle=heart;c.beginPath();c.arc(0,0,r*.51,0,TAU);c.fill();
  c.fillStyle='#fffde7';polygon(c,[[0,-r*.45],[r*.16,0],[0,r*.45],[-r*.16,0]]);c.fill();
  for(let i=0;i<4;i++){const a=i*TAU/4+Math.PI/4;spark(c,Math.cos(a)*r*1.18,Math.sin(a)*r*1.18,r*.16,'#ffe9a8');}
 }else if(kind==='shard'){
  gem(c,[[r*1.3,0],[r*.1,-r*.85],[-r*.64,-r*.64],[-r,0],[-r*.64,r*.64],[r*.1,r*.85]],r,color);
  c.fillStyle='#fff7e5';polygon(c,[[r*1.12,0],[r*.1,-r*.68],[-r*.64,-r*.48],[-r*.2,-r*.06]]);c.fill();
  c.fillStyle='#472358';polygon(c,[[r*1.12,0],[r*.1,r*.68],[-r*.64,r*.48],[-r*.2,r*.06]]);c.fill();
  c.fillStyle=color;polygon(c,[[r*.81,0],[-r*.04,-r*.22],[-r*.7,0],[-r*.04,r*.22]]);c.fill();
  c.strokeStyle='#fff6eb';c.lineWidth=1.4;c.beginPath();c.moveTo(-r*.57,0);c.lineTo(r*.73,0);c.stroke();
  c.strokeStyle='#f5cf84';c.lineWidth=1;c.beginPath();c.moveTo(-r*.62,-r*.36);c.lineTo(-r*.2,-r*.25);c.lineTo(r*.02,-r*.43);c.moveTo(-r*.62,r*.36);c.lineTo(-r*.2,r*.25);c.lineTo(r*.02,r*.43);c.stroke();
 }else if(kind==='needle'){
  gem(c,[[r*1.45,0],[-r*.14,-r*.57],[-r*.92,-r*.76],[-r*.58,0],[-r*.92,r*.76],[-r*.14,r*.57]],r,color);
  c.fillStyle='#fffce9';polygon(c,[[r*1.24,0],[-r*.22,-r*.19],[-r*.69,0],[-r*.22,r*.19]]);c.fill();
  c.strokeStyle='#ffe7a0';c.lineWidth=1;c.beginPath();c.moveTo(-r*.7,-r*.49);c.lineTo(-r*.2,-r*.3);c.moveTo(-r*.7,r*.49);c.lineTo(-r*.2,r*.3);c.stroke();
 }else if(kind==='spear'){
  gem(c,[[37,0],[14,-6],[-13,-4],[-29,-9],[-23,-2],[-37,0],[-23,2],[-29,9],[-13,4],[14,6]],28,color);
  c.fillStyle='#fffde9';polygon(c,[[35,0],[13,-2.2],[-31,0],[13,2.2]]);c.fill();
  c.fillStyle='#f4ca81';polygon(c,[[11,-5],[4,-6],[-2,-3],[5,-3]]);c.fill();polygon(c,[[11,5],[4,6],[-2,3],[5,3]]);c.fill();
  c.strokeStyle='#f9edff';c.lineWidth=1;c.beginPath();c.moveTo(-26,-6);c.lineTo(-15,-3);c.moveTo(-26,6);c.lineTo(-15,3);c.stroke();
 }else{
  c.beginPath();c.moveTo(r*1.22,0);c.bezierCurveTo(r*.36,-r*1.05,-r*.99,-r*.94,-r*.99,0);c.bezierCurveTo(-r*.99,r*.94,r*.36,r*1.05,r*1.22,0);c.closePath();
  const shell=c.createLinearGradient(0,-r,0,r);shell.addColorStop(0,'#fff9ef');shell.addColorStop(.32,color);shell.addColorStop(.7,'#723a90');shell.addColorStop(1,'#21102f');
  c.fillStyle=shell;c.fill();c.strokeStyle='#1c1028';c.lineWidth=2.5;c.stroke();
  c.fillStyle='#281336';c.beginPath();c.ellipse(-r*.06,0,r*.67,r*.49,0,0,TAU);c.fill();
  c.lineWidth=1.4;
  for(let i=0;i<4;i++){c.strokeStyle=i%2?'#f2c982':'#efbdff';c.beginPath();c.ellipse(-r*.06,0,r*.71,r*.52,0,i*TAU/4+.12,(i+1)*TAU/4-.12);c.stroke();}
  const heart=c.createRadialGradient(r*.03,-r*.08,0,0,0,r*.5);heart.addColorStop(0,'#ffffff');heart.addColorStop(.45,'#fff2c2');heart.addColorStop(1,color);
  c.fillStyle=heart;c.beginPath();c.ellipse(0,0,r*.49,r*.3,0,0,TAU);c.fill();
  c.fillStyle='#fffcf0';polygon(c,[[r*.58,0],[0,-r*.1],[-r*.57,0],[0,r*.1]]);c.fill();
  c.fillStyle='#ffffffb0';c.beginPath();c.ellipse(-r*.3,-r*.43,r*.27,r*.08,-.2,0,TAU);c.fill();
 }
}
function art(h:Entity){
 const key=`${h.visual}:${h.r}:${h.color}`;const previous=cache.get(key);if(previous)return previous;
 if(typeof document==='undefined')return;
 const extent=h.visual==='spear'?52:h.r*2.4+4,canvas=document.createElement('canvas');
 canvas.width=canvas.height=Math.ceil(extent*4);const c=canvas.getContext('2d');if(!c)return;
 c.scale(2,2);c.translate(canvas.width/4,canvas.height/4);spriteArt(c,h.visual!,h.r,h.color);
 const value={canvas,extent:canvas.width/4};if(cache.size>=128)cache.delete(cache.keys().next().value!);cache.set(key,value);return value;
}
export function drawBulletVisual(c:CanvasRenderingContext2D,h:Entity,hitboxes=false){
 if(!h.visual)return;
 const warning=h.age<h.warn,stopped=Math.hypot(h.vx,h.vy)<1;
 const angle=stopped?Math.atan2(h.motion?.direction?.y??1,h.motion?.direction?.x??0):Math.atan2(h.vy,h.vx);
 c.save();c.translate(h.x,h.y);c.rotate(angle);c.setLineDash([]);c.shadowBlur=0;
 c.globalAlpha=warning?.35+.45*Math.min(1,h.age/Math.max(.001,h.warn)):1;
 if(warning){c.strokeStyle=h.color;c.lineWidth=1.5;c.beginPath();c.arc(0,0,h.r+7,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,h.age/h.warn));c.stroke();}
 if(h.visual==='core')c.rotate(h.age*.35+h.id*.71);
 const sprite=art(h);if(sprite)c.drawImage(sprite.canvas,-sprite.extent,-sprite.extent,sprite.extent*2,sprite.extent*2);else spriteArt(c,h.visual,h.r,h.color);
 if(hitboxes&&!warning){c.strokeStyle='#ffffff';c.lineWidth=1;c.beginPath();if(h.visual==='spear'){c.moveTo(-37,0);c.lineTo(37,0);c.lineWidth=h.r*2;}else c.arc(0,0,h.r,0,TAU);c.stroke();}
 c.restore();
}
