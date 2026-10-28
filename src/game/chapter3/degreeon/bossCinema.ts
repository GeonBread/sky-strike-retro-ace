import type {Engine} from './engine';
import {sprite} from './resources';
import {drawHpBar,HP_BAR_WIDTH} from './hpBar';
import {clamp,smooth,BASE_FIELD_W as W,BASE_FIELD_H as H} from './core';
export const ARRIVAL_SECONDS=6.5,CLEAR_SECONDS=6.4,DEFEAT_SECONDS=14;
export function cinemaHp(age:number){return smooth((age-2.9)/2.7);}
/** Deterministic cinematic geometry; all particles share one clock and pause together. */
export function drawBossCinema(e:Engine,c:CanvasRenderingContext2D,kind:'arrival'|'clear'|'defeat',t:number){
 const arrival=kind==='arrival',final=kind==='defeat',burst=final?5.4:2.6,release=Math.max(0,t-burst),fade=1-smooth((t-(final?9:4.3))/(final?4:2));
 if(final){c.save();c.globalAlpha=smooth((t-7)/5);sprite(c,'pure',0,0,W,H);c.restore();}
 const shake=arrival?Math.exp(-Math.abs(t-2.7)*7)*4:release>0?Math.exp(-release*2.1)*(final?12:7):Math.sin(t*3)**2*1.2;
 c.save();c.translate(Math.sin(t*89)*shake,Math.cos(t*113)*shake*.65);
 const y=arrival?-300-145*(1-smooth(t/2.7)):-260;
 const energy=arrival?smooth(t/2.4):1-smooth(release/2.5);
 // Segmented orbital seals, contracting lights, then a physical core rupture.
 for(let ring=0;ring<4;ring++){c.save();c.translate(0,y);c.rotate(t*(ring%2?-.22:.18)+ring*.5);c.scale(1,arrival?.4:.65);c.strokeStyle=ring%2?'#e5b9ff':'#ffe3ac';c.globalAlpha=energy*.45;c.lineWidth=ring===0?3:1.5;c.setLineDash([22+ring*8,12,4,12]);c.beginPath();c.arc(0,0,arrival?110+ring*34+100*(1-smooth(t/2.7)):110+ring*35-65*smooth(t/burst),0,Math.PI*2);c.stroke();c.restore();}
 const aura=c.createRadialGradient(0,y,2,0,y,320);aura.addColorStop(0,arrival?'#c88aff55':'#f7c7ff66');aura.addColorStop(1,'#a44aff00');c.fillStyle=aura;c.globalAlpha=fade;c.fillRect(-W/2,y-320,W,640);c.globalAlpha=1;
 let alpha=arrival?smooth((t-.5)/1.8):1-smooth(release/.8),size=arrival?310-42*smooth(t/2.7):(final?302:268)*(1-.12*smooth(t/burst));
 c.save();c.globalAlpha=alpha;c.shadowColor='#c17aff';c.shadowBlur=18;
 if(arrival)sprite(c,'boss1',0,y,size,size);
 else{
  // Separate real sprite slices along cracks instead of fading a whole intact body.
  for(let i=0;i<12;i++){const shift=Math.sin(i*7.7+t*12)*Math.min(9,t*1.5),drop=release*(18+i%4*12);c.save();c.beginPath();c.rect(-size/2-30,y-size/2+i*size/12+drop,size+60,size/12+1);c.clip();sprite(c,final?'boss2':'boss1',shift*(1+release*3),y+drop,size,size);c.restore();}
 }c.restore();
 if(!arrival&&t<burst+.5){c.save();c.globalAlpha=1-smooth(release/.5);c.strokeStyle='#fff1d4';c.lineWidth=2;for(let i=0;i<11;i++){const a=i*2.399,r=30+i%4*24;c.beginPath();c.moveTo(Math.cos(a)*r*.15,y+Math.sin(a)*r*.15);c.lineTo(Math.cos(a+.15)*r,y+Math.sin(a+.15)*r);c.lineTo(Math.cos(a)*r*1.6,y+Math.sin(a)*r*1.6);c.stroke();}c.restore();}
 for(let i=0;i<(final?130:78);i++){const a=i*2.399963,seed=i%9/9;
  const r=arrival?(380+i%6*30)*(1-smooth((t-seed)/2.6)):release>0?release*(75+i%7*26):180*(1-smooth(t/burst))+(i%5)*13;
  const x=Math.cos(a+t*(arrival?.12:.04))*r,py=y+Math.sin(a)*r*(arrival?.65:.85)+(arrival?0:release*release*10);c.save();c.translate(x,py);c.rotate(a+t*(i%2?1:-1));c.globalAlpha=arrival?(1-smooth((t-2.7)/1.1))*.75:fade*(release>0?.85:.5);c.fillStyle=i%4?'#c79bed':'#ffedb7';c.fillRect(-2-i%3,-5,4+i%4,10+i%5*2);c.restore();
 }
 if(!arrival&&release>0){
  for(let i=0;i<4;i++){const age=release-i*.15,r=age*(final?620:480);if(age<0||r>1500)continue;c.save();c.globalAlpha=(1-smooth(age/2))*(1-i*.15);c.strokeStyle=i%2?'#be78ed':'#fff1cb';c.lineWidth=i===0?10:3;c.beginPath();c.ellipse(0,y,r,r*.72,0,0,Math.PI*2);c.stroke();c.restore();}
  c.save();c.globalAlpha=(1-smooth(release/(final?2.4:1.3)))*.75;c.fillStyle='#fff5db';c.fillRect(-W/2,y-2,W,4);c.fillRect(-2,-H/2,4,H);c.restore();
 }
 const core=arrival?Math.max(0,1-smooth((t-2.4)/.7)):1-smooth(release/(final?3:1.8));
 c.save();c.globalAlpha=core;c.translate(0,y);c.rotate(t*.65);c.fillStyle='#fff4db';c.shadowColor='#e9a4ff';c.shadowBlur=24;c.beginPath();c.moveTo(0,-20);c.lineTo(14,0);c.lineTo(0,20);c.lineTo(-14,0);c.closePath();c.fill();c.restore();
 // Slow golden purification rises after final disintegration; darkness lingers after false defeat.
 if(final&&t>8){c.save();c.globalAlpha=smooth((t-8)/3)*.65;for(let i=0;i<45;i++){const x=Math.sin(i*6.3)*W*.45,py=H/2-((i*71+(t-8)*65)%H);c.fillStyle=i%3?'#ffe8b2':'#ffffff';c.fillRect(x,py,2,7);}c.restore();}
 c.restore();
 const bars=arrival?smooth(t/.65):final?1-smooth((t-10)/3):1;c.fillStyle='#02030be8';c.fillRect(-W/2,-H/2,W,46*bars);c.fillRect(-W/2,H/2-46*bars,W,46*bars);
 c.save();c.globalAlpha=arrival?smooth((t-2.6)/.5):1;c.translate(0,-H/2+62);c.scale(Math.min(1,(W-36)/HP_BAR_WIDTH),1);drawHpBar(c,arrival?cinemaHp(t):0,final?1:0);c.restore();
 c.save();sprite(c,'player',0,404,137,137);c.restore();
 if(arrival&&t>3&&t<5.8){c.save();c.globalAlpha=smooth((t-3)/.5)*(1-smooth((t-5.1)/.7));c.textAlign='center';c.fillStyle='#efd6ff';c.font='28px "Degreeon Black Han"';c.fillText('미졸업의 군주',0,-40);c.font='52px "Degreeon Black Han"';c.fillStyle='#fff0d3';c.fillText('디그리온',0,22);c.restore();}
 if(!arrival&&t>=burst&&release<.28){c.fillStyle=`rgba(255,237,215,${.27*(1-release/.28)})`;c.fillRect(-W/2,-H/2,W,H);}
}
