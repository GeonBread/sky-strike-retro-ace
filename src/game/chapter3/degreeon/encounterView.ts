import {drawAwakening} from './awakeningCinema';
import {drawBossCinema,ARRIVAL_SECONDS} from './bossCinema';
import type {Engine} from './engine';
import {clamp,smooth,BASE_FIELD_W,BASE_FIELD_H} from './core';
import {sprite,playerSprite,drawBattleMap} from './resources';
import {fitBossPresentation} from './presentation';
import {drawHpBar,HP_BAR_WIDTH} from './hpBar';
export function drawEncounterScene(e:Engine){const c=e.ctx,s=e.encounter,{w,h}=fitBossPresentation(e.canvas,e.presentationScale);
 c.clearRect(0,0,w,h);c.fillStyle='#070611';c.fillRect(0,0,w,h);c.save();c.translate(w/2,h/2);
 const still=s.mode==='threat'&&s.line===2,age=s.mode==='complete'?5:still?0:s.age,awaken=s.mode==='awakening',t=awaken?s.age:0,after=s.phase===2||['threat','last-warning','victory','complete'].includes(s.mode),clear=s.mode==='false-clear',win=s.mode==='victory'||s.mode==='complete';
 const k=clear?smooth(age/.9):1,fw=clear?s.sceneFrom.w+(BASE_FIELD_W-s.sceneFrom.w)*k:BASE_FIELD_W,fh=clear?s.sceneFrom.h+(BASE_FIELD_H-s.sceneFrom.h)*k:BASE_FIELD_H;
 const hit=awaken&&t>=3.2?Math.exp(-(t-3.2)*3)*8:0;c.translate(Math.sin(t*107)*hit,Math.cos(t*89)*hit*.65);c.rotate(clear?s.sceneFrom.angle*(1-k):0);
 c.fillStyle='#191025';c.fillRect(-fw/2,-fh/2,fw,fh);drawBattleMap(e,c,fw,fh);
 if(s.mode==='complete'){c.save();c.globalAlpha=clear?smooth(age/3.8)*.7:smooth(age/3);sprite(c,'pure',0,0,fw,fh);c.restore();}
 c.fillStyle='#08061244';c.fillRect(-fw/2,-fh/2,fw,fh);c.strokeStyle=after?'#ce87f566':'#a6a0ca55';c.lineWidth=2;c.strokeRect(-fw/2,-fh/2,fw,fh);
 if(clear||s.mode==='victory'||s.mode==='complete'||s.mode==='opening'&&s.age<ARRIVAL_SECONDS){drawBossCinema(e,c,clear?'clear':s.mode==='victory'||s.mode==='complete'?'defeat':'arrival',s.mode==='complete'?16:s.age);c.restore();return;}
 if(awaken){drawAwakening(e,c,s.age);c.restore();return;}
 const glow=c.createRadialGradient(0,-140,5,0,-140,awaken?540:390);glow.addColorStop(0,awaken?'#c164ed55':after?'#af64dc22':'#8a6cc20b');glow.addColorStop(1,'#a153de00');c.fillStyle=glow;c.fillRect(-fw/2,-fh/2,fw,fh);
 let bossAlpha=clear?1-smooth(age/1.1):s.mode==='taunt'?0:win?1-smooth(age/2.4):1,bossSize=after?302:268,bossY=-300,bossId:'boss1'|'boss2'=after?'boss2':'boss1';
 if(clear)bossY+=smooth(age/1.1)*70;
 if(after){const post=awaken?t-3.2:age;for(let i=0;i<3;i++){c.save();c.translate(0,bossY);c.scale(1,.42);c.rotate(post*.17*(i%2?1:-1));c.strokeStyle=i===0?'#e8c68a88':'#c579e77a';c.lineWidth=2;c.setLineDash([26,17,5,17]);c.beginPath();c.arc(0,0,174+i*31+Math.sin(post*1.2)*4,0,Math.PI*2);c.stroke();c.restore();}
 }
 c.save();c.globalAlpha=clamp(bossAlpha,0,1);c.shadowColor=after||awaken?'#c474ef':'#9d7ae5';c.shadowBlur=awaken?35:18;if(!sprite(c,bossId,0,bossY,bossSize,bossSize)){c.fillStyle='#b494dd';c.beginPath();c.arc(0,bossY,bossSize*.25,0,Math.PI*2);c.fill();}c.restore();
 for(let i=0;i<34;i++){const a=i*2.399,r=clear?age*(35+i%5*13):130+i%8*33,x=Math.cos(a)*r,y=clear?-270+Math.sin(a)*r+age*age*18:bossY+Math.sin(a+age*.12)*r*.68;c.save();c.translate(x,y);c.rotate(a+age*.3);c.globalAlpha=clear?clamp(1-age/3.8,0,1):.25;c.fillStyle=i%3?'#d19bf2':'#ffe1aa';c.fillRect(-2,-5,4,10);c.restore();}
 const playerX=clear?s.sceneFrom.x*(1-k):0,playerY=clear?s.sceneFrom.y*(1-k)+404*k:404;c.save();c.globalAlpha=win?1:.82;playerSprite(c,playerX,playerY);c.restore();
 // The health display participates in the awakening rather than resetting as an ordinary pattern.
 c.save();c.translate(0,-fh/2+62);c.scale(Math.min(1,(fw-36)/HP_BAR_WIDTH),1);let hp=clear||s.mode==='taunt'?0:awaken?smooth((t-3.2)/2):e.bossHp/e.bossHpMax;drawHpBar(c,hp,after||awaken?1:0);c.restore();
 c.restore();
}
