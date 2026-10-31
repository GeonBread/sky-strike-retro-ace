import type {Engine} from './engine';
import {smooth} from './core';

export const FLIGHT_DEPART_SECONDS=.65;
export const FLIGHT_RETURN_SECONDS=.7;
export type FlightPresence={state:'depart'|'hidden'|'return'|'visible';age:number;opacity:number};
export const freshFlightPresence=(flight=false):FlightPresence=>({state:flight?'depart':'visible',age:0,opacity:1});

/** Keep the boss absent until the last flight obstacle has actually left. */
export function tickFlightPresence(e:Engine,dt:number){
 if(e.pattern.id!=='flight')return;
 const f=e.flightPresence;
 const ending=e.phase==='outro'||e.continuity.closing&&!e.hazards.length;
 if(ending&&(f.state==='hidden'||f.state==='depart')){f.state='return';f.age=0;}
 f.age+=dt;
 if(f.state==='depart'){
  f.opacity=1-smooth(f.age/FLIGHT_DEPART_SECONDS);
  if(f.age>=FLIGHT_DEPART_SECONDS){f.state='hidden';f.age=0;f.opacity=0;}
 }else if(f.state==='return'){
  f.opacity=smooth(f.age/FLIGHT_RETURN_SECONDS);
  if(f.age>=FLIGHT_RETURN_SECONDS){f.state='visible';f.age=0;f.opacity=1;}
 }
}

/** A short collapsing rift on departure and an expanding rift on return. */
export function drawFlightPresence(e:Engine,c:CanvasRenderingContext2D){
 if(e.pattern.id!=='flight')return;
 const f=e.flightPresence;
 if(f.state!=='depart'&&f.state!=='return')return;
 const k=smooth(f.age/(f.state==='depart'?FLIGHT_DEPART_SECONDS:FLIGHT_RETURN_SECONDS));
 const radius=f.state==='depart'?112*(1-k)+12:24+116*k;
 c.save();c.translate(e.boss.x,e.boss.y);c.globalAlpha=Math.sin(k*Math.PI)*.9;
 c.strokeStyle='#e8c7ff';c.shadowColor='#ae68ff';c.shadowBlur=18;c.lineWidth=3;
 for(let i=0;i<2;i++){
  c.beginPath();c.ellipse(0,0,radius*(1+i*.15),radius*.4,e.bossAnimClock*.4+i*Math.PI/2,0,Math.PI*2);c.stroke();
 }
 c.fillStyle='#eecfff';c.shadowBlur=8;
 for(let i=0;i<10;i++){const a=i*Math.PI/5+k*.8,r=radius*(.65+i%3*.2);c.fillRect(Math.cos(a)*r-2,Math.sin(a)*r-2,4,4);}
 c.restore();
}
