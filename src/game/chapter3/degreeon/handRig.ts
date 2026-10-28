import type {Engine} from './engine';
import type {Hand} from './unseenSpecials';
import type {Vec} from './core';
import {smooth,pointInPolygon,segmentDistance,PLAYER_HIT_RADIUS} from './core';
type Part={kind:'palm'|'arm'|'finger'|'thumb';points:Vec[];joints:Vec[];nail?:Vec[]};
/** The same sampled organic outlines drive drawing, warnings and collision. */
function curve(start:Vec,segments:number[][]):Vec[]{let p=start;const out=[p];for(const s of segments){const [ax,ay,bx,by,x,y]=s;for(let i=1;i<=8;i++){const t=i/8,u=1-t;out.push({x:u*u*u*p.x+3*u*u*t*ax+3*u*t*t*bx+t*t*t*x,y:u*u*u*p.y+3*u*u*t*ay+3*u*t*t*by+t*t*t*y});}p={x,y};}return out;}
const at=(p:Vec,y:number,flip=1):Vec=>({x:p.x*flip,y:p.y+y});
export function handFrame(e:Engine,h:Hand){const span=h.side%2?e.fieldH:e.fieldW,depth=h.side%2?e.fieldW:e.fieldH,t=Math.max(0,h.age-h.warn),stir=h.mode==='stir',offset=h.mode==='sweep'?(-.22+.44*smooth(t/1.15))*span:stir?Math.sin(t/h.life*Math.PI*2)*span*.21:0,a=h.side*Math.PI/2+(stir?Math.sin(t/h.life*Math.PI*4)*.3:0),base=h.side*Math.PI/2,along=h.u*span+offset;return{a,x:along*Math.cos(base)+depth/2*Math.sin(base),y:along*Math.sin(base)-depth/2*Math.cos(base),depth};}
function progress(h:Hand){const t=h.age-h.warn;if(t<0)return 0;if(h.mode==='flurry'){if(t>=2.34)return 0;const q=t%.78;return q<.18?smooth(q/.18):q<.34?1:q<.58?1-smooth((q-.34)/.24):0;}return t<.26?smooth(t/.26):t<h.life-.45?1:1-smooth((t-h.life+.45)/.45);}
export function handParts(e:Engine,h:Hand,k=progress(h)):Part[]{
 const depth=handFrame(e,h).depth,py=-300+(h.mode==='cage'?depth/2+160:h.mode==='deep'?depth*.88+140:h.mode==='stir'?depth*.73+90:h.mode==='flurry'?depth*.68+100:Math.min(depth*.57,540))*k,flip=h.side===3?-1:1;
 const palm=curve({x:-48,y:-105},[[ -63,-78,-96,-63,-111,-26],[-132,4,-130,31,-106,57],[-86,85,-51,86,-18,82],[24,85,76,91,103,63],[120,39,122,9,110,-21],[99,-53,65,-75,48,-105],[23,-111,-25,-111,-48,-105]]).map(p=>at(p,py,flip));
 const arm=curve({x:-77,y:-390},[[-72,-300,-49,py-170,-48,py-104],[-17,py-97,22,py-97,48,py-104],[54,py-180,78,-300,79,-390],[30,-402,-30,-402,-77,-390]]);
 const parts:Part[]=[{kind:'palm',points:palm,joints:[]},{kind:'arm',points:arm.map(p=>({x:p.x*flip,y:p.y})),joints:[]}];
 const lengths=[110,154,170,130],widths=[32,35,35,30],bases=[-84,-28,28,84];
 for(let i=0;i<4;i++){
  const x=bases[i],len=lengths[i]*(h.mode==='cage'?1.06:1),w=widths[i],fan=[-17,-7,5,18][i],base=48+Math.abs(i-1.5)*5;
  const p=curve({x:x-w/2,y:base},[[x-w*.62,base+len*.19,x+fan*.12-w*.58,base+len*.37,x+fan*.35-w*.46,base+len*.52],[x+fan*.58-w*.45,base+len*.7,x+fan-w*.4,base+len*.84,x+fan-w*.18,base+len*.94],[x+fan+w*.12,base+len+10,x+fan+w*.48,base+len*.85,x+fan+w*.42,base+len*.75],[x+fan*.55+w*.55,base+len*.48,x+w*.6,base+len*.21,x+w/2,base],[x+w*.28,base-8,x-w*.3,base-8,x-w/2,base]]).map(p=>at(p,py,flip));
  const tip={x:x+fan,y:base+len},nail=curve({x:tip.x-w*.3,y:tip.y-len*.26},[[tip.x-w*.1,tip.y-len*.32,tip.x+w*.3,tip.y-len*.29,tip.x+w*.35,tip.y-len*.17],[tip.x+w*.3,tip.y-5,tip.x+w*.2,tip.y+2,tip.x,tip.y+2],[tip.x-w*.17,tip.y-7,tip.x-w*.34,tip.y-len*.16,tip.x-w*.3,tip.y-len*.26]]).map(p=>at(p,py,flip));
  parts.push({kind:'finger',points:p,joints:[{x:x+fan*.16,y:base+len*.30},{x:x+fan*.55,y:base+len*.62}].map(p=>at(p,py,flip)),nail});
 }
 const thumb=curve({x:-100,y:0},[[-130,-5,-156,22,-172,52],[-191,79,-193,99,-175,118],[-164,121,-150,109,-140,92],[-132,74,-112,64,-101,47],[-89,33,-88,10,-100,0]]).map(p=>at(p,py,flip));
 const nail=curve({x:-183,y:88},[[-183,103,-178,115,-174,118],[-159,112,-152,100,-151,94],[-165,85,-171,84,-183,88]]).map(p=>at(p,py,flip));
 parts.push({kind:'thumb',points:thumb,joints:[at({x:-149,y:52},py,flip)],nail});return parts;
}
export function handRects(e:Engine,h:Hand,k=progress(h)){return handParts(e,h,k).map(p=>{const xs=p.points.map(v=>v.x),ys=p.points.map(v=>v.y),l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...ys),b=Math.max(...ys);return{x:(l+r)/2,y:(t+b)/2,w:r-l,h:b-t};});}
export function handHits(e:Engine,h:Hand,p:Vec){if(h.age<h.warn||h.age>=h.warn+h.life)return false;const f=handFrame(e,h),x=p.x-f.x,y=p.y-f.y,q={x:x*Math.cos(f.a)+y*Math.sin(f.a),y:-x*Math.sin(f.a)+y*Math.cos(f.a)};return handParts(e,h).some(part=>pointInPolygon(q,part.points)||part.points.some((a,i)=>segmentDistance(q,a,part.points[(i+1)%part.points.length])<PLAYER_HIT_RADIUS));}
function path(c:CanvasRenderingContext2D,p:Vec[]){c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)c.lineTo(p[i].x,p[i].y);c.closePath();}
function stroke(c:CanvasRenderingContext2D,p:Vec[]){c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)c.lineTo(p[i].x,p[i].y);c.stroke();}
function drawSkin(c:CanvasRenderingContext2D,part:Part){
 const p=part.points,xs=p.map(v=>v.x),ys=p.map(v=>v.y),l=Math.min(...xs),r=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),g=c.createLinearGradient(l,top,r,bottom);
 g.addColorStop(0,'#1c132b');g.addColorStop(.25,'#59416e');g.addColorStop(.48,'#9b79ad');g.addColorStop(.7,'#513363');g.addColorStop(1,'#21152d');c.fillStyle=g;c.strokeStyle='#100c1b';c.lineWidth=6;c.lineJoin='round';c.beginPath();path(c,p);c.fill();c.stroke();
 c.save();c.beginPath();path(c,p);c.clip();c.strokeStyle='#dbc0e7';c.globalAlpha=.42;c.lineWidth=2;stroke(c,p.map(v=>({x:v.x+3,y:v.y+2})));c.globalAlpha=1;
 if(part.kind==='arm'){c.strokeStyle='#20132d';c.lineWidth=10;for(const side of [-1,1])stroke(c,[{x:side*46,y:top+20},{x:side*35,y:bottom-50},{x:side*20,y:bottom}]);c.strokeStyle='#ad7fd0';c.lineWidth=2;stroke(c,[{x:0,y:top},{x:-13,y:top+(bottom-top)*.43},{x:10,y:top+(bottom-top)*.61},{x:-7,y:bottom}]);}
 for(const j of part.joints){c.fillStyle='#36233f';c.beginPath();c.ellipse(j.x,j.y,12,8,.1,0,Math.PI*2);c.fill();c.strokeStyle='#d0a2d3';c.lineWidth=2;c.beginPath();c.ellipse(j.x-1,j.y-3,10,4,.1,Math.PI,Math.PI*2);c.stroke();c.strokeStyle='#26192f';stroke(c,[{x:j.x-9,y:j.y+5},{x:j.x,y:j.y+8},{x:j.x+9,y:j.y+6}]);}
 if(part.kind==='palm'){
  const y=(top+bottom)/2;c.strokeStyle='#32213e';c.lineWidth=5;for(const s of [-1,1]){stroke(c,[{x:s*37,y:top+20},{x:s*49,y:y-3},{x:s*76,y:y+35}]);stroke(c,[{x:s*12,y:y-20},{x:s*18,y:y+20},{x:s*38,y:bottom-8}]);}
  c.strokeStyle='#db75eb';c.shadowColor='#c350f2';c.shadowBlur=9;c.lineWidth=2.5;stroke(c,[{x:-12,y:top+32},{x:5,y:y-15},{x:-9,y:y+4},{x:9,y:y+26},{x:-1,y:bottom-12}]);c.shadowBlur=0;
  for(const x of [-83,-27,28,82]){c.fillStyle='#6c4678';c.strokeStyle='#c496cf';c.lineWidth=2;c.beginPath();c.ellipse(x,bottom-31,17,12,-.1,0,Math.PI*2);c.fill();c.stroke();}
 }
 c.restore();
 if(part.nail){const ng=c.createLinearGradient(l,top,r,bottom);ng.addColorStop(0,'#3c174f');ng.addColorStop(.5,'#aa63cc');ng.addColorStop(1,'#e4a7ff');c.fillStyle=ng;c.strokeStyle='#26172d';c.lineWidth=3;c.beginPath();path(c,part.nail);c.fill();c.stroke();c.strokeStyle='#edc5ff';c.lineWidth=1;stroke(c,[part.nail[2],part.nail[Math.floor(part.nail.length*.55)]]);}
}
export function drawHands(e:Engine,c:CanvasRenderingContext2D){for(const h of e.unseen.hands.hands){
 if(h.age<h.warn){c.save();c.beginPath();const samples=h.mode==='stir'?36:h.mode==='flurry'?30:18;
  for(let i=0;i<=samples;i++){const future={...h,age:h.warn+h.life*i/samples},f=handFrame(e,future);for(const p of handParts(e,future))path(c,p.points.map(v=>({x:f.x+v.x*Math.cos(f.a)-v.y*Math.sin(f.a),y:f.y+v.x*Math.sin(f.a)+v.y*Math.cos(f.a)})));}
  c.fillStyle='#da9dff20';c.fill();const future={...h,age:h.warn+.3},f=handFrame(e,future);c.strokeStyle='#e6bbff99';c.lineWidth=2;c.setLineDash([7,8]);c.beginPath();for(const p of handParts(e,future))path(c,p.points.map(v=>({x:f.x+v.x*Math.cos(f.a)-v.y*Math.sin(f.a),y:f.y+v.x*Math.sin(f.a)+v.y*Math.cos(f.a)})));c.stroke();c.restore();
 }else{const f=handFrame(e,h);c.save();c.translate(f.x,f.y);c.rotate(f.a);const parts=handParts(e,h);c.save();c.translate(5,9);c.beginPath();for(const p of parts)path(c,p.points);c.fillStyle='#07030b99';c.shadowColor='#0a030d';c.shadowBlur=17;c.fill();c.restore();for(const p of [parts[1],parts[0],...parts.slice(2)])drawSkin(c,p);c.restore();}
}}
