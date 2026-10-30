import type {Engine} from './engine';
import {sprite,cinematicPlayer,drawBattleMap} from './resources';
import {drawHpBar,HP_BAR_WIDTH} from './hpBar';
import {clamp,smooth,BASE_FIELD_W as W,BASE_FIELD_H as H} from './core';
export const AWAKEN_SECONDS=12,AWAKEN_REVEAL=5.2;
export function awakeningPose(t:number){const land=smooth((t-7.7)/3.3);return{size:580-278*land,y:-105-195*land,hp:smooth((t-8)/3),visible:smooth((t-AWAKEN_REVEAL)/.6),land};}
export function drawAwakening(e:Engine,c:CanvasRenderingContext2D,t:number){
 const fullW=e.canvas.width,fullH=e.canvas.height,p=awakeningPose(t),burst=Math.max(0,t-AWAKEN_REVEAL),dark=1-smooth((t-5.4)/3);
 c.fillStyle=`rgba(2,1,9,${.78*dark})`;c.fillRect(-fullW/2,-fullH/2,fullW,fullH);
 // The arena breaks into radial glass plates: use the real background inside each shard.
 if(t>4.2&&t<8.6){const k=smooth((t-4.2)/3.7);for(let i=0;i<12;i++){const a=i*Math.PI/6,b=a+Math.PI/6,drift=k*(80+i%3*40);c.save();c.translate(Math.cos(a+.25)*drift,Math.sin(a+.25)*drift*.6);c.globalAlpha=(1-smooth((t-6.2)/2.4))*.65;c.beginPath();c.moveTo(0,-140);c.lineTo(Math.cos(a)*1000,-140+Math.sin(a)*1000);c.lineTo(Math.cos(b)*1000,-140+Math.sin(b)*1000);c.closePath();c.clip();drawBattleMap(e,c,W,H);c.strokeStyle='#c8a3ef';c.lineWidth=2;c.stroke();c.restore();}}
 const shake=t>=AWAKEN_REVEAL?10*Math.exp(-burst*1.6):t>3?Math.min(2,(t-3)*.9):0;
 c.save();c.translate(Math.sin(t*101)*shake,Math.cos(t*129)*shake*.6);
 // Falling remnants reverse their velocity and spiral into the extinguished core.
 for(let i=0;i<110;i++){const a=i*2.399963+t*.28,r=(180+i%11*38)*(1-smooth((t-i%5*.1)/3.6)),x=Math.cos(a)*r,y=-160+Math.sin(a)*r*.72;c.save();c.translate(x,y);c.rotate(a-t*.8);c.globalAlpha=(1-smooth((t-3.4)/.7))*.8;c.fillStyle=i%5?'#b086d7':'#ffe4a3';c.fillRect(-3-i%3,-7,6+i%5,14+i%4*4);c.restore();}
 if(t<5.4){const pressure=smooth(t/4.7),pulse=1+Math.sin(t*(5+pressure*8))*.08;const aura=c.createRadialGradient(0,-160,1,0,-160,240);aura.addColorStop(0,'#fbd9ffbb');aura.addColorStop(.15,'#c05df488');aura.addColorStop(1,'#7b29b900');c.fillStyle=aura;c.fillRect(-W/2,-420,W,600);
  for(let i=0;i<4;i++){const r=(130+i*35)*(1-pressure*.75)*pulse;c.save();c.translate(0,-160);c.rotate(t*(i%2?-.6:.45));c.strokeStyle=i%2?'#d28eff':'#ffdfa0';c.lineWidth=i?2:4;c.globalAlpha=.5+.5*pressure;c.setLineDash([18,6,3,6]);c.beginPath();for(let j=0;j<=6;j++){const a=j*Math.PI/3;j?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.stroke();c.restore();}
  c.save();c.translate(0,-160);c.rotate(t);c.fillStyle='#fff5dd';c.shadowColor='#da76ff';c.shadowBlur=24;c.beginPath();c.moveTo(0,-22*pulse);c.lineTo(16*pulse,0);c.lineTo(0,22*pulse);c.lineTo(-16*pulse,0);c.closePath();c.fill();c.restore();
 }
 // One widening rupture, then a towering light column, reveals the original final form.
 if(t>4.3&&t<8){const q=smooth((t-4.3)/1.6),opacity=1-smooth((t-6.1)/1.9);c.save();c.globalAlpha=opacity;c.strokeStyle='#f4cfff';c.lineWidth=2;c.shadowColor='#b948e4';c.shadowBlur=20;c.beginPath();for(let j=0;j<=20;j++){const y=-H/2+j*H/20,x=Math.sin(j*4.7)*15*q;j?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();const beam=c.createLinearGradient(-120*q,0,120*q,0);beam.addColorStop(0,'#8a37ce00');beam.addColorStop(.42,'#b563e9aa');beam.addColorStop(.5,'#fff5de');beam.addColorStop(.58,'#b563e9aa');beam.addColorStop(1,'#8a37ce00');c.fillStyle=beam;c.fillRect(-120*q,-fullH/2,240*q,fullH);c.restore();}
 if(t>=AWAKEN_REVEAL){
  // Expanding crown/seal behind the sprite, with gold blades instead of plain rings.
  c.save();c.translate(0,p.y);c.rotate(burst*.065);c.globalAlpha=p.visible*(.65-.2*p.land);for(let i=0;i<16;i++){c.save();c.rotate(i*Math.PI/8);const r=200-65*p.land;c.fillStyle=i%2?'#c3a0e25a':'#ffe0a877';c.strokeStyle=i%2?'#d5a9f2':'#ffdfa5';c.lineWidth=1.6;c.beginPath();c.moveTo(r,-7);c.lineTo(r+62,0);c.lineTo(r,7);c.lineTo(r-15,0);c.closePath();c.fill();c.stroke();c.restore();}for(const sign of [-1,1]){c.save();c.scale(1,.65);c.rotate(sign*burst*.18);c.strokeStyle=sign===1?'#e5bdff88':'#ffdf9c99';c.lineWidth=2;c.setLineDash([28,9,4,9]);c.beginPath();c.arc(0,0,230-60*p.land,0,Math.PI*2);c.stroke();c.restore();}c.restore();
  c.save();c.globalAlpha=p.visible;c.shadowColor='#be5ef0';c.shadowBlur=25;sprite(c,'boss2',0,p.y,p.size,p.size);c.restore();
  for(let i=0;i<4;i++){const age=burst-i*.18;if(age<0||age>2.1)continue;c.save();c.globalAlpha=(1-smooth(age/2.1))*.8;c.strokeStyle=i%2?'#c181f0':'#fff2c6';c.lineWidth=i?3:9;c.beginPath();c.ellipse(0,-120,age*680,age*420,0,0,Math.PI*2);c.stroke();c.restore();}
  // Debris and speed streaks travel out across the whole viewport, not just the arena.
  for(let i=0;i<90;i++){const a=i*2.399963,r=burst*(170+i%8*35);c.save();c.globalAlpha=(1-smooth(burst/4))*.65;c.strokeStyle=i%4?'#c69ce4':'#ffe7b2';c.lineWidth=1+i%2;c.beginPath();c.moveTo(Math.cos(a)*r,-120+Math.sin(a)*r*.7);c.lineTo(Math.cos(a)*(r+35),-120+Math.sin(a)*(r+35)*.7);c.stroke();c.restore();}
 }
 c.restore();
 // Restrained letterboxing and a title that vanishes before the fourth-wall dialogue.
 const bars=1-smooth((t-10)/2);c.fillStyle='#020109ee';c.fillRect(-fullW/2,-fullH/2,fullW,52*bars);c.fillRect(-fullW/2,fullH/2-52*bars,fullW,52*bars);
 if(t>6.2&&t<10.7){c.save();c.globalAlpha=smooth((t-6.2)/.6)*(1-smooth((t-9.8)/.9));c.textAlign='center';c.font='24px "Degreeon Black Han"';c.fillStyle='#d4b4ed';c.fillText('규칙의 지배자',0,195);c.font='46px "Degreeon Black Han"';c.fillStyle='#ffe9b8';c.fillText('각성 디그리온',0,253);c.restore();}
 c.save();c.translate(0,-H/2+62);c.scale(Math.min(1,(W-36)/HP_BAR_WIDTH),1);drawHpBar(c,p.hp,1);c.restore();cinematicPlayer(e,c,0,404);
 if(t>=AWAKEN_REVEAL&&burst<.24){c.fillStyle=`rgba(255,239,219,${.26*(1-burst/.24)})`;c.fillRect(-fullW/2,-fullH/2,fullW,fullH);}
}
