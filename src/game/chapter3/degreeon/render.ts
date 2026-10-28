import {drawNativeShot} from './nativeWeapon';
import {isMenuDeception,drawMenuScene} from './menuDeception';
import { drawAdvanced, drawSeed, exileOverlay, activeLaserSegments } from './advanced';
import { drawExile, exileOutside } from './exile';
import { drawBombEffects } from './bomb';
import { drawHpBar, HP_BAR_WIDTH } from './hpBar';
import { drawBulletVisual } from './bulletVisuals';
import { drawFieldWarpWarning } from './fieldWarp';
import { drawPauseWindow } from './pauseWindow';
import { drawPauseStormOverlay } from './pauseStorm';
import {sprite,background} from './resources';
import type { Engine, Vec } from './engine';
import { clamp, smooth, distance, CANVAS_W, CANVAS_H, CANVAS_CX, CANVAS_CY, PLAYER_HIT_RADIUS, MAX_HP, MAX_BOMBS, linkEndpoints } from './core';
const font='"Noto Sans KR", sans-serif';
let playerImage:HTMLImageElement|null=null;
let playerImageReady=false;
if(typeof Image!=='undefined'){
  playerImage=new Image();
  playerImage.onload=()=>{playerImageReady=true;};
  playerImage.onerror=()=>{playerImageReady=false;};
  // Final integrated game path. Standalone build keeps a vector fallback if this asset is absent.
  playerImage.src='/assets/common/player/hobanu_player.png';
}
function line(c:CanvasRenderingContext2D,a:Vec,b:Vec){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
function ring(c:CanvasRenderingContext2D,p:Vec,r:number){c.beginPath();c.arc(p.x,p.y,Math.max(.1,r),0,Math.PI*2);c.stroke();}
function poly(c:CanvasRenderingContext2D,points:Vec[]){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();}
function rounded(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  const q=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+q,y);c.arcTo(x+w,y,x+w,y+h,q);c.arcTo(x+w,y+h,x,y+h,q);c.arcTo(x,y+h,x,y,q);c.arcTo(x,y,x+w,y,q);c.closePath();
}
function shield(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){
  poly(c,[{x:x+w*.5,y},{x:x+w*.94,y:y+h*.18},{x:x+w*.86,y:y+h*.72},{x:x+w*.5,y:y+h},{x:x+w*.14,y:y+h*.72},{x:x+w*.06,y:y+h*.18}]);
}
function drawCutPieces(e:Engine,c:CanvasRenderingContext2D){
  for(const piece of e.cutPieces){c.save();if(e.encounter.enabled&&e.continuity.closing)c.globalAlpha=1-smooth(e.continuity.cutAge/1.1);c.translate(piece.center.x+piece.offset.x,piece.center.y+piece.offset.y);c.rotate(piece.angle);const pts=piece.verts.map(v=>({x:v.x-piece.center.x,y:v.y-piece.center.y}));
    c.shadowColor='#7e4cac';c.shadowBlur=18;c.fillStyle='#161326';c.strokeStyle='#bd8ef4';c.lineWidth=2;poly(c,pts);c.fill();c.save();c.clip();c.translate(-piece.center.x,-piece.center.y);background(e,c);c.restore();c.fillStyle=`rgba(167,42,242,${.35})`;poly(c,pts);c.fill();c.stroke();c.shadowBlur=0;c.globalAlpha=.22;c.strokeStyle='#d5b8ff';c.lineWidth=1;
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],mx=(a.x+b.x)/2,my=(a.y+b.y)/2;c.beginPath();c.moveTo(mx,my);c.lineTo(mx*.78+Math.sin(i*9+piece.id)*10,my*.78);c.stroke();}c.restore();}
}
function drawBoss(e:Engine,c:CanvasRenderingContext2D,bossScale:number){
  if(e.phase==='bombard'||e.phase==='restore')return;
  if(!e.encounter.enabled&&e.pattern.id==='outside-hands'&&e.phase==='active'){bossScale*=1-smooth(e.unseen.hands.age/.65);if(bossScale<.01)return;}
  if(!e.encounter.enabled&&e.pattern.id==='graduation-gate'&&e.phase==='active'&&e.unseen.gate.phase!=='expose')return;
  if(e.encounter.enabled)bossScale*=e.bossVisibility;
  if(e.useResources){
    c.save();c.translate(e.boss.x,e.boss.y);c.scale(bossScale,bossScale);c.rotate(Math.sin(e.bossAnimClock*.8)*.035);
    c.shadowColor='#a678ed';c.shadowBlur=22;
    const desired=e.encounter.enabled?e.bossVisualSize:(e.pattern.id==='split8'?138:268)*(e.bossForm===2?1.12:1);
    const size=Math.min(desired,Math.max(110,(e.fieldH/2-Math.abs(e.boss.y)-6)*2));
    c.globalAlpha=e.purification>=0?Math.max(0,1-e.purification/2):1;
    const ok=sprite(c,e.bossForm===1?'boss1':'boss2',0,0,size,size);
    c.restore();if(ok)return;
  }
  const visual=e.pattern.id==='split8'?1.65:3.65;
  c.save();c.translate(e.boss.x,e.boss.y);c.scale(bossScale*visual,bossScale*visual);c.rotate(Math.sin(e.bossAnimClock*.8)*.035);c.strokeStyle='#ccafff';c.fillStyle='#33234b';c.shadowColor='#a678ed';c.shadowBlur=12;c.lineWidth=.8;
  poly(c,[{x:0,y:-33},{x:32,y:-12},{x:23,y:26},{x:0,y:36},{x:-23,y:26},{x:-32,y:-12}]);c.fill();c.stroke();
  c.strokeStyle='#8961ad';c.lineWidth=.7;ring(c,{x:0,y:0},44+Math.sin(e.bossAnimClock*2)*2);c.fillStyle='#f2e0ff';c.fillRect(-13,-3,9,3);c.fillRect(4,-3,9,3);c.restore();
}
function drawPlayerFallback(c:CanvasRenderingContext2D,clone:boolean){
  c.fillStyle=clone?'#b6bdc9':'#e8fff9';c.strokeStyle='#050506';c.lineWidth=4;
  poly(c,[{x:0,y:-67},{x:38,y:-18},{x:55,y:38},{x:20,y:27},{x:0,y:55},{x:-20,y:27},{x:-55,y:38},{x:-38,y:-18}]);c.fill();c.stroke();
  c.fillStyle=clone?'#727985':'#58d9c7';poly(c,[{x:0,y:-48},{x:20,y:-10},{x:0,y:15},{x:-20,y:-10}]);c.fill();
  c.fillStyle='#11141a';c.beginPath();c.arc(0,-16,8,0,Math.PI*2);c.fill();
}
function drawPlayer(e:Engine,c:CanvasRenderingContext2D,p:Vec,clone:boolean,clock=e.playerAnimClock){
  const bob=Math.sin(clock*4)*3.8,side=Math.sin(clock*12)*1.15;
  const idleRot=Math.sin(clock*3)*.02;
  const facing=e.angle+e.playerFacing;
  c.save();c.translate(p.x+side,p.y+bob);c.rotate(facing+idleRot);c.globalAlpha=clone?.48:1;
  if(e.pattern.id==='exile'&&e.advanced.exile.state==='return'){const k=smooth(e.advanced.exile.age/1.25);c.globalAlpha*=k;c.scale(.5+.5*k,.5+.5*k);}
  if(e.cooldown>0&&!(e.pattern.id==='exile'&&e.advanced.exile.state!=='explore'))c.globalAlpha*=.35+.65*Math.abs(Math.sin(e.playerAnimClock*15));
  c.shadowColor='rgba(255,255,255,.75)';c.shadowBlur=10;
  const w=(e.useResources?48*2.85:108)*(clone?.82:1);
  if(e.useResources&&playerImageReady&&playerImage&&playerImage.naturalWidth>0){
    const h=w*(playerImage.naturalHeight/playerImage.naturalWidth);c.drawImage(playerImage,-w/2,-h/2,w,h);
  }else{
    const sc=w/137;c.scale(sc,sc);drawPlayerFallback(c,clone);
  }
  c.restore();
  if(e.hitboxes){c.save();c.strokeStyle='#fff';c.lineWidth=1.5;c.shadowColor='#000';c.shadowBlur=4;ring(c,p,PLAYER_HIT_RADIUS);c.restore();}
}
function drawSmartBomb(e:Engine,c:CanvasRenderingContext2D){
  c.save();c.translate(CANVAS_CX,CANVAS_CY);c.rotate(e.angle);drawBombEffects(e,c);c.restore();
}
function drawLife(c:CanvasRenderingContext2D,e:Engine){
  for(let i=0;i<MAX_HP;i++){
    const x=766+i*44+(e.canvas.width-CANVAS_W)/2,y=(e.canvas.width<660?86:16)-(e.canvas.height-CANVAS_H)/2,w=36,h=38,active=i<e.hp;c.save();c.fillStyle='#050506';c.shadowColor='rgba(0,0,0,.9)';c.shadowBlur=5;shield(c,x,y,w,h);c.fill();c.shadowBlur=0;
    const ix=x+5,iy=y+4,iw=26,ih=28;shield(c,ix,iy,iw,ih);
    if(active){const g=c.createLinearGradient(0,iy,0,iy+ih);g.addColorStop(0,'#ff4a4a');g.addColorStop(.48,'#ff4a4a');g.addColorStop(.481,'#c70016');g.addColorStop(1,'#c70016');c.fillStyle=g;}else c.fillStyle='#34373d';c.fill();
    if(active){c.globalAlpha=.22;c.fillStyle='#4b0009';c.fillRect(ix+4,iy+ih-7,iw-8,5);}c.restore();
  }
}
function drawBombs(c:CanvasRenderingContext2D,e:Engine){
  for(let i=0;i<MAX_BOMBS;i++){
    const x=760+i*47+(e.canvas.width-CANVAS_W)/2,y=900+(e.canvas.height-CANVAS_H)/2,active=i<e.bombs;c.save();c.lineWidth=4;c.strokeStyle='#050506';c.shadowColor=active?'rgba(255,205,71,.46)':'rgba(0,0,0,.48)';c.shadowBlur=active?12:0;
    const g=c.createLinearGradient(x,y,x+38,y+38);if(active){g.addColorStop(0,'#ffe56b');g.addColorStop(1,'#bf7c26');c.fillStyle=g;}else c.fillStyle='#34373d';
    c.beginPath();c.arc(x+19,y+19,17,0,Math.PI*2);c.fill();c.stroke();
    c.shadowBlur=0;c.beginPath();c.moveTo(x+27,y+4);c.quadraticCurveTo(x+35,y-4,x+35,y-10);c.stroke();
    c.fillStyle='rgba(255,255,255,.28)';c.beginPath();c.arc(x+12,y+12,4,0,Math.PI*2);c.fill();c.restore();
  }
}
function drawBossHud(c:CanvasRenderingContext2D,e:Engine){
  c.save();c.translate(0,-(e.canvas.height-CANVAS_H)/2);
  const top=c.createLinearGradient(0,0,0,118);top.addColorStop(0,'rgba(2,6,23,.8)');top.addColorStop(1,'rgba(2,6,23,0)');c.fillStyle=top;c.fillRect((CANVAS_W-e.canvas.width)/2,0,e.canvas.width,118);
  const titleW=Math.min(332,e.canvas.width-40),compact=e.canvas.width<660;
  rounded(c,CANVAS_CX-titleW/2,6,titleW,32,14);c.fillStyle='rgba(5,16,44,.88)';c.fill();c.lineWidth=4;c.strokeStyle='#0a0a0d';c.stroke();
  c.fillStyle='#f4f0f6';c.font=`900 ${compact?16:18}px ${font}`;c.textAlign='center';c.textBaseline='middle';c.fillText('미졸업의 군주 디그리온',CANVAS_CX,22,titleW-16);
  if(!(e.pattern.id==='hp-sword'&&e.phase==='active')){c.save();c.translate(CANVAS_CX,62);const scale=Math.min(1,(e.canvas.width-36)/HP_BAR_WIDTH);c.scale(scale,scale);drawHpBar(c,e.bossHp/e.bossHpMax,e.encounter.enabled?e.encounter.phase-1:e.stage,e.finalStand.started&&e.bossHp>0?{phase:'LAST STAND',health:e.finalStand.complete?'1 HP':'1%'}:undefined);c.restore();
  }c.restore();drawLife(c,e);drawBombs(c,e);
}
function drawFinalStandHud(c:CanvasRenderingContext2D,e:Engine){
  if(!e.finalStand.started||e.purification>=0)return;
  const f=e.finalStand,w=240,x=24,y=96;
  c.save();c.translate(0,-(e.canvas.height-CANVAS_H)/2);c.fillStyle='#130b20eb';rounded(c,x-12,y-12,w+24,48,6);c.fill();
  c.textAlign='center';c.font=`700 12px ${font}`;c.fillStyle=f.complete?'#b4ffe8':'#ffd3ed';
  c.fillText(f.complete?'사격 해제 · 마지막 한 발':`사격·폭탄 봉인   ${(40-f.elapsed).toFixed(1)}초`,x+w/2,y+1);
  c.fillStyle='#48304f';c.fillRect(x,y+12,w,5);c.fillStyle='#d49aff';c.fillRect(x,y+12,w*clamp(f.elapsed/40,0,1),5);
  c.fillStyle='#130b20';for(let i=1;i<4;i++)c.fillRect(x+i*w/4-1,y+11,2,7);
  c.restore();
}
function drawTransition(e:Engine,c:CanvasRenderingContext2D){
  if(e.encounter.enabled)return;
  if(e.phase==='intro')return;
  if((e.pattern.id==='pause-storm'||isMenuDeception(e))&&e.phase==='outro')return;
  const overlay=e.phase==='outro'||e.phase==='restore'||e.phase==='bombard'&&e.phaseTime<1.8;if(!overlay)return;
  let title=e.banner,desc=e.pattern.subtitle;

  if(e.phase==='outro'){title=e.pattern.id==='clones'?'세 기체가 하나로 합쳐집니다':'전장 복귀';desc=e.pendingBombard?'예약된 오염 폭격이 이어집니다.':'다음 단계로 이동합니다.';}
  if(e.phase==='bombard'){title=`오염 폭격 · ${e.bombTotal}발`;desc='전장 전체 확장 · 착탄 경고원을 피하세요.';}
  if(e.phase==='restore'){title='폭격 종료';desc='원래 전장 크기를 복구합니다.';}
  c.fillStyle='#0b0d1ee8';c.fillRect(46,419,830,122);c.textAlign='center';c.fillStyle='#97f4df';c.font=`10px ${font}`;c.fillText('DEGREEON / RULE TRANSITION',CANVAS_CX,443);c.fillStyle='#efe7fa';c.font=`bold 24px ${font}`;c.fillText(title,CANVAS_CX,481);c.font=`12px ${font}`;c.fillStyle='#b4a7c5';c.fillText(desc,CANVAS_CX,513);
}
function drawPause(e:Engine,c:CanvasRenderingContext2D){
  if(!e.paused||e.gameOver||e.hostPauseDialog)return;c.save();c.translate(CANVAS_CX,CANVAS_CY);c.fillStyle='rgba(0,0,0,.78)';c.fillRect(-e.canvas.width/2,-e.canvas.height/2,e.canvas.width,e.canvas.height);drawPauseWindow(c);c.restore();
}
function drawGameOver(e:Engine,c:CanvasRenderingContext2D){
  if(!e.gameOver)return;c.fillStyle='rgba(0,0,0,.82)';c.fillRect(0,0,CANVAS_W,CANVAS_H);c.textAlign='center';c.fillStyle='#ff4858';c.font=`900 42px ${font}`;c.fillText('GAME OVER',CANVAS_CX,438);c.fillStyle='#fff';c.font=`800 20px ${font}`;c.fillText('호반우가 쓰러졌습니다',CANVAS_CX,481);c.fillStyle='#c2b7c5';c.font=`14px ${font}`;c.fillText('R 키로 다시 도전할 수 있습니다',CANVAS_CX,520);
}
function drawExiledArena(e:Engine,c:CanvasRenderingContext2D){
  c.save();c.fillStyle='#080b17';c.fillRect(-CANVAS_CX,-CANVAS_CY,CANVAS_W,CANVAS_H);background(e,c);drawBoss(e,c,1);
  c.strokeStyle='#d3a2ed';c.lineWidth=3;c.strokeRect(-CANVAS_CX,-CANVAS_CY,CANVAS_W,CANVAS_H);
  // The hole and loose edge stay visible as this frame retreats to the right.
  c.clearRect(-CANVAS_CX-3,e.advanced.exile.breakAt.y-64,8,128);
  c.translate(-CANVAS_CX,-CANVAS_CY);const top=c.createLinearGradient(0,0,0,118);top.addColorStop(0,'rgba(2,6,23,.8)');top.addColorStop(1,'rgba(2,6,23,0)');c.fillStyle=top;c.fillRect(0,0,CANVAS_W,118);
  rounded(c,295,6,332,32,14);c.fillStyle='rgba(5,16,44,.88)';c.fill();c.lineWidth=4;c.strokeStyle='#0a0a0d';c.stroke();c.fillStyle='#f4f0f6';c.font=`900 18px ${font}`;c.textAlign='center';c.textBaseline='middle';c.fillText('미졸업의 군주 디그리온',CANVAS_CX,22);
  c.translate(CANVAS_CX,62);drawHpBar(c,e.bossHp/e.bossHpMax,e.stage);c.restore();
}
export function drawScene(e:Engine){
  const c=e.ctx;c.clearRect(0,0,e.canvas.width,e.canvas.height);c.fillStyle='#080b17';c.fillRect(0,0,e.canvas.width,e.canvas.height);
  if(isMenuDeception(e)){
    drawMenuScene(e,c,p=>drawPlayer(e,c,p,false),()=>{const fw=e.fieldW,fh=e.fieldH;e.fieldW=CANVAS_W;e.fieldH=CANVAS_H;c.save();c.fillStyle='#080b17';c.fillRect(-CANVAS_CX,-CANVAS_CY,CANVAS_W,CANVAS_H);background(e,c);drawBoss(e,c,1);c.strokeStyle='#d3a2ed';c.lineWidth=3;c.strokeRect(-CANVAS_CX,-CANVAS_CY,CANVAS_W,CANVAS_H);c.restore();e.fieldW=fw;e.fieldH=fh;});
    c.save();c.translate((e.canvas.width-CANVAS_W)/2,(e.canvas.height-CANVAS_H)/2);drawLife(c,e);drawBombs(c,e);drawPause(e,c);drawGameOver(e,c);c.restore();return;
  }
  if(exileOutside(e)){
    drawExile(e,c,p=>drawPlayer(e,c,p,false),()=>drawExiledArena(e,c));
    if(e.damageFlash>0){c.fillStyle=`rgba(210,0,24,${.24*clamp(e.damageFlash/.85,0,1)})`;c.fillRect(0,0,e.canvas.width,e.canvas.height);}
    if(e.paused||e.gameOver){c.fillStyle='#0008';c.fillRect(0,0,e.canvas.width,e.canvas.height);}
    c.save();c.translate((e.canvas.width-CANVAS_W)/2,(e.canvas.height-CANVAS_H)/2);drawLife(c,e);drawBombs(c,e);drawPause(e,c);drawGameOver(e,c);c.restore();return;
  }
  // Expand the actual world at unchanged sprite scale; never stretch the bitmap.
  c.save();c.translate((e.canvas.width-CANVAS_W)/2,(e.canvas.height-CANVAS_H)/2);
  // World physics still use screen-space coordinates. Undo their projection on the
  // canvas because the DOM plane now supplies that exact rotation once.
  c.save();c.translate(CANVAS_CX,CANVAS_CY);c.rotate(-e.angle);c.translate(-CANVAS_CX,-CANVAS_CY);
  c.save();
  if(e.shake>0){const amp=e.damageFlash>0?3.5:1.2;c.translate(Math.sin(e.clock*90)*amp,Math.cos(e.clock*74)*amp*.72);}
  c.translate(CANVAS_CX,CANVAS_CY);c.rotate(e.angle);c.scale(e.zoom,e.zoom);
  if(e.cutEnabled)drawCutPieces(e,c);
  const fieldGradient=c.createRadialGradient(0,-80,20,0,0,470);fieldGradient.addColorStop(0,'#26203e');fieldGradient.addColorStop(1,'#0b0e1c');c.fillStyle=fieldGradient;
  if(e.cutEnabled&&e.cutPolygon.length>=3){poly(c,e.cutPolygon);c.fill();c.strokeStyle='#ba9add77';c.lineWidth=2;c.stroke();}
  else{c.fillRect(-e.fieldW/2,-e.fieldH/2,e.fieldW,e.fieldH);c.strokeStyle='#ba9add44';c.lineWidth=2;c.strokeRect(-e.fieldW/2,-e.fieldH/2,e.fieldW,e.fieldH);}
  c.strokeStyle=e.rotation?'#d0b2ff':'#9788b2';c.lineWidth=3;
  if(!e.cutEnabled)for(const sx of [-1,1])for(const sy of [-1,1]){const x=sx*e.fieldW/2,y=sy*e.fieldH/2;c.beginPath();c.moveTo(x-sx*22,y);c.lineTo(x,y);c.lineTo(x,y-sy*22);c.stroke();}
  drawFieldWarpWarning(e,c);
  c.save();if(e.cutEnabled&&e.cutPolygon.length>=3)poly(c,e.cutPolygon);else{c.beginPath();c.rect(-e.fieldW/2,-e.fieldH/2,e.fieldW,e.fieldH);}c.clip();
  background(e,c);
  c.strokeStyle='#ac92e412';c.lineWidth=1;const drift=e.bossAnimClock*20%40;for(let x=-e.fieldW/2;x<e.fieldW/2;x+=40)line(c,{x,y:-e.fieldH/2},{x,y:e.fieldH/2});for(let y=-e.fieldH/2+drift;y<e.fieldH/2;y+=40)line(c,{x:-e.fieldW/2,y},{x:e.fieldW/2,y});
  c.save();if(e.phase==='outro'&&e.pattern.id!=='split8')c.globalAlpha=1-smooth(e.phaseTime/1.6);if(e.phase!=='bombard'&&e.phase!=='restore'){if(e.pattern.category==='support')e.combatPattern.render(e,c);c.save();if(e.encounter.enabled&&['inspection','graduation-gate','split8','path-fold'].includes(e.pattern.id))c.globalAlpha*=1-smooth(e.continuity.settledAge/.5);e.pattern.render(e,c);c.restore();if(e.phase==='active'||e.encounter.enabled&&e.continuity.bridge)drawAdvanced(e,c);}c.restore();
  for(const link of e.links){const [a,b]=linkEndpoints(link.a,link.b,link.strength);c.save();c.strokeStyle=link.active?'#d2afff':'#da91ff';c.shadowColor='#ba73ff';c.shadowBlur=link.active?16:0;c.lineWidth=link.active?3:1.5;if(!link.active)c.setLineDash([7,7]);line(c,a,b);if(link.active){c.strokeStyle='#f4dfff';c.lineWidth=1;c.beginPath();const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;for(let i=0;i<=18;i++){const f=i/18,j=i===0||i===18?0:Math.sin(i*2.4+link.age*52)*3;const x=a.x+dx*f-dy/len*j,y=a.y+dy*f+dx/len*j;i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}if(e.hitboxes&&link.active){c.shadowBlur=0;c.strokeStyle='#fff6';c.lineWidth=6;line(c,a,b);}c.restore();}
  for(const h of e.hazards){const warning=h.age<h.warn;c.save();c.strokeStyle=h.color;c.fillStyle=h.color;c.shadowColor=h.color;c.shadowBlur=warning?0:15;c.lineWidth=2;
    if(h.motion?.kind==='spear'&&warning){const m=h.motion;if(m.anchor&&m.target){c.setLineDash([10,8]);c.globalAlpha=.25+.5*h.age/h.warn;c.lineWidth=14;line(c,m.anchor,m.target);c.lineWidth=2;c.strokeStyle='#ffe1ff';line(c,m.anchor,m.target);ring(c,m.target,22);}c.restore();continue;}
    if(h.motion?.kind==='edge-burst'&&h.motion.stage===1){c.translate(Math.sin(h.age*70)*3,Math.cos(h.age*65)*3);}
    if(h.visual){drawBulletVisual(c,h,e.hitboxes);c.restore();continue;}
    if(h.kind==='seed'){drawSeed(c,h);c.restore();continue;}
    if(h.kind==='petal'){drawPetal(c,h);c.restore();continue;}
    if(h.kind==='bomb'){const blink=h.age>h.warn-.3?(.45+.55*Math.abs(Math.sin(h.age*45))):.7;c.globalAlpha=blink;c.setLineDash([5,6]);ring(c,h,34);line(c,{x:h.x-42,y:h.y},{x:h.x+42,y:h.y});line(c,{x:h.x,y:h.y-42},{x:h.x,y:h.y+42});c.setLineDash([]);if(!warning){const f=clamp((h.age-h.warn)/.35,0,1),y=h.y-(1-f)*220;c.globalAlpha=1;c.shadowBlur=25;c.fillStyle='#ddbdff';c.fillRect(h.x-5,y-18,10,28);c.globalAlpha=.25;c.fillRect(h.x-4,y-75,8,60);}c.restore();continue;}
    if(h.kind==='rocket'){if(warning){c.globalAlpha=.35+.45*clamp(h.age/h.warn,0,1);c.setLineDash([9,7]);const a={x:clamp(h.x,-e.fieldW/2+6,e.fieldW/2-6),y:clamp(h.y,-e.fieldH/2+6,e.fieldH/2-6)};const b={x:h.vx?(-Math.sign(h.x)*e.fieldW/2):h.x,y:h.vy?(-Math.sign(h.y)*e.fieldH/2):h.y};line(c,a,b);c.setLineDash([]);c.translate(a.x,a.y);c.rotate(Math.atan2(h.vy,h.vx));poly(c,[{x:13,y:0},{x:-5,y:-8},{x:-5,y:8}]);c.fill();}else{c.translate(h.x,h.y);c.rotate(Math.atan2(h.vy,h.vx));const len=Math.max(h.w,h.h),thick=Math.min(h.w,h.h);c.scale(len/38,thick/16);c.fillStyle=h.color;poly(c,[{x:19,y:0},{x:5,y:-8},{x:-16,y:-7},{x:-12,y:0},{x:-16,y:7},{x:5,y:8}]);c.fill();c.stroke();c.globalAlpha=.5;c.fillStyle='#b073ff';poly(c,[{x:-14,y:-4},{x:-40-Math.sin(h.age*40)*8,y:0},{x:-14,y:4}]);c.fill();}c.restore();continue;}
    if(h.kind==='note'){c.globalAlpha=warning?.45:1;if(h.hold){c.globalAlpha=.3;c.fillRect(h.x-12,h.y-95,24,95);c.globalAlpha=.9;c.strokeRect(h.x-12,h.y-95,24,95);}c.beginPath();c.arc(h.x,h.y,h.r,0,Math.PI*2);c.fill();c.strokeStyle='#fff7';c.stroke();c.restore();continue;}
    c.globalAlpha=warning?.25+.35*Math.abs(Math.sin(h.age*9)):.9;if(warning)c.setLineDash([6,5]);
    if(h.kind==='rect'){c.globalAlpha=warning?.18:.32;c.fillRect(h.x-h.w/2,h.y-h.h/2,h.w,h.h);c.globalAlpha=warning?.7:.85;c.strokeRect(h.x-h.w/2,h.y-h.h/2,h.w,h.h);}else if(h.kind==='spike'){const s=h.vx>=0?1:-1;poly(c,[{x:h.x+s*h.w/2,y:h.y},{x:h.x-s*h.w/2,y:h.y-h.h/2},{x:h.x-s*h.w/2,y:h.y+h.h/2}]);c.fill();c.stroke();}else{const jitter=e.links.some(l=>!l.active&&(l.a===h||l.b===h))?Math.sin(h.age*55)*3:0;c.beginPath();c.arc(h.x+jitter,h.y,h.r,0,Math.PI*2);warning?c.stroke():c.fill();if(warning){c.setLineDash([]);c.beginPath();c.arc(h.x,h.y,h.r+9,-Math.PI/2,-Math.PI/2+Math.PI*2*h.age/h.warn);c.stroke();}}if(e.hitboxes&&!warning){c.shadowBlur=0;c.strokeStyle='#fff';c.lineWidth=1;if(h.kind==='orb')ring(c,h,h.r);else if(h.kind==='rect')c.strokeRect(h.x-h.w/2,h.y-h.h/2,h.w,h.h);}c.restore();
  }
  for(const laser of e.lasers){const active=laser.age>=2.4;c.save();c.strokeStyle=active?'#d2a1ff':'#c08eff';c.shadowColor='#aa65ff';c.shadowBlur=active?15:0;c.lineWidth=active?5:1.4;if(!active){c.setLineDash([7,7]);c.globalAlpha=.35+.45*clamp(laser.age/2.4,0,1);}for(const path of laser.paths){const segments=active?activeLaserSegments(e,laser,path):path.slice(1).map((b,i)=>[path[i],b] as [Vec,Vec]);for(const [a,b] of segments){line(c,a,b);if(active){c.save();c.strokeStyle='#f9d9ff';c.lineWidth=1.3;c.globalAlpha=.8;line(c,a,b);c.restore();}}}c.restore();}
  for(const shot of e.shots)drawNativeShot(e,c,shot);c.shadowBlur=0;
  for(const a of e.enemies){c.save();c.translate(a.x,a.y);c.rotate(Math.sin(a.age*2)*.15);c.fillStyle=a.color;c.strokeStyle='#f0dcff';c.shadowColor=a.color;c.shadowBlur=12;poly(c,[{x:0,y:-a.r},{x:a.r,y:0},{x:0,y:a.r},{x:-a.r,y:0}]);c.fill();c.stroke();c.restore();}
  for(const a of e.items){c.save();c.translate(a.x,a.y);c.rotate(a.age);c.strokeStyle=a.color;c.fillStyle=a.color+'44';c.lineWidth=2;poly(c,[{x:0,y:-a.r},{x:a.r,y:0},{x:0,y:a.r},{x:-a.r,y:0}]);c.fill();c.stroke();c.rotate(-a.age);c.fillStyle=a.color;c.font='bold 13px '+font;c.textAlign='center';c.fillText(a.item==='life'?'L':a.item==='bomb'?'B':'E',0,5);c.restore();}
  const bossScale=e.encounter.enabled?1:e.phase==='intro'?smooth(e.phaseTime/.9):e.phase==='outro'?1-smooth(e.phaseTime/1.8):1;drawBoss(e,c,bossScale);
  for(const f of e.effects){const k=f.age/f.life;c.save();c.strokeStyle=f.color;c.fillStyle=f.color;c.globalAlpha=1-k;c.shadowColor=f.color;c.shadowBlur=15;c.lineWidth=2;if(f.kind==='lane'){ring(c,f,10+k*f.radius);c.globalAlpha=(1-k)*.25;c.fillRect(f.x-e.fieldW/10+5,-e.fieldH/2,e.fieldW/5-10,e.fieldH);c.globalAlpha=1-k;c.lineWidth=4;line(c,{x:f.x,y:f.y-k*220},{x:f.x,y:f.y+k*220});c.lineWidth=1;line(c,{x:f.x-12,y:f.y-k*180},{x:f.x-12,y:f.y+k*180});line(c,{x:f.x+12,y:f.y-k*180},{x:f.x+12,y:f.y+k*180});}else if(f.kind==='burst'){ring(c,f,8+f.radius*k);for(let i=0;i<9;i++){const a=i*2.399+f.x*.1,d=f.radius*k;c.fillRect(f.x+Math.cos(a)*d-2,f.y+Math.sin(a)*d-2,4,4);}}else{ring(c,f,5+f.radius*k);ring(c,f,3+f.radius*k*.65);if(f.kind==='bomb'){c.globalAlpha=(1-k)*.16;c.beginPath();c.arc(f.x,f.y,f.radius*k,0,Math.PI*2);c.fill();}}c.restore();}
  c.restore();c.restore();
  const outside=exileOverlay(e,c);
  if(!outside&&e.dead<=0&&!e.gameOver){e.bodies().forEach((p,i)=>drawPlayer(e,c,p,e.bodies().length===3&&i!==1,e.bodyAnimClocks[e.bodies().length===3?i:1]));}
  if(!outside)drawSmartBomb(e,c);
  c.restore(); // HUD and title cards are part of the physical rotating screen.
  drawTransition(e,c);
  if(e.rotation&&e.phase==='active'){c.fillStyle='#141324df';c.fillRect(211,91,500,38);c.fillStyle='#d7b7ff';c.font=`13px ${font}`;c.textAlign='center';c.fillText(e.rotationLive?'전장 회전 · 공격 유지 · 화면 기준 이동':'전장 회전 · 공격 일시 정지',CANVAS_CX,116);}
  if(e.damageFlash>0){c.fillStyle=`rgba(210,0,24,${.24*clamp(e.damageFlash/.85,0,1)})`;c.fillRect(0,0,CANVAS_W,CANVAS_H);}
  drawBossHud(c,e);drawFinalStandHud(c,e);drawPauseStormOverlay(e,c);drawPause(e,c);drawGameOver(e,c);c.restore();
}

function drawPetal(c:CanvasRenderingContext2D,h:Engine['hazards'][number]){
 c.translate(h.x,h.y);c.rotate(Math.atan2(h.vy,h.vx));c.shadowBlur=0;
 c.fillStyle='#c47fff22';c.beginPath();c.ellipse(0,0,22,12,0,0,Math.PI*2);c.fill();
 c.fillStyle='#d7a9ff';c.strokeStyle=h.color;c.lineWidth=2;c.beginPath();c.ellipse(0,0,17,8,0,0,Math.PI*2);c.fill();c.stroke();
}
