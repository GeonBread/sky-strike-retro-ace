/** FIX19 chapterGamePauseDialog: shared by real ESC and hostile windows. */
export const PAUSE_WINDOW_W=560,PAUSE_WINDOW_H=330;
const font='"Noto Sans KR", sans-serif';
export const pauseActions=[{x:-236,y:65,w:229,h:58},{x:7,y:65,w:229,h:58}];
export function drawPauseWindow(c:CanvasRenderingContext2D){
 const x=-280,y=-165;c.save();c.setLineDash([]);c.shadowBlur=0;
 c.fillStyle='#ffffff47';c.fillRect(x-5,y-5,570,340);c.fillStyle='#6b0000';c.fillRect(x-2,y-2,564,334);
 const g=c.createLinearGradient(0,y,0,-y);g.addColorStop(0,'#16171d');g.addColorStop(1,'#030407');c.fillStyle=g;c.fillRect(x,y,560,330);
 const red=c.createLinearGradient(x,y,x+210,y+210);red.addColorStop(0,'#e600001f');red.addColorStop(1,'#e6000000');c.fillStyle=red;c.fillRect(x,y,560,330);
 c.lineWidth=4;c.strokeStyle='#050506';c.strokeRect(x+2,y+2,556,326);c.lineWidth=2;c.strokeStyle='#e60000';c.strokeRect(x+8,y+8,544,314);
 for(const [bx,by] of [[x-6,y-6],[266,151]]){c.fillStyle='#cccccc';c.fillRect(bx-1,by-1,22,22);c.fillStyle='#050506';c.fillRect(bx,by,20,20);c.fillStyle='#e60000';c.fillRect(bx+3,by+3,14,14);}
 c.textAlign='center';c.textBaseline='middle';c.fillStyle='#ff3b3b';c.font='1000 13px ui-monospace, monospace';c.letterSpacing='3.64px';c.fillText('GAME PAUSED',0,y+53);c.letterSpacing='0px';
 c.shadowColor='#000';c.shadowOffsetX=3;c.shadowOffsetY=3;c.fillStyle='#fff';c.font=`1000 48px ${font}`;c.fillText('일시 정지',0,y+100);c.shadowOffsetX=c.shadowOffsetY=0;
 c.fillStyle='#b8c0cd';c.font=`800 17px ${font}`;c.fillText('현재 전투가 일시 정지되었습니다.',0,y+151);
 for(const [i,r] of pauseActions.entries()){
  const bg=c.createLinearGradient(0,r.y,0,r.y+r.h);bg.addColorStop(0,i?'#1a1c22':'#bd0014');bg.addColorStop(1,i?'#0b0c10':'#700009');c.fillStyle=bg;c.fillRect(r.x,r.y,r.w,r.h);
  c.lineWidth=3;c.strokeStyle='#050506';c.strokeRect(r.x,r.y,r.w,r.h);c.lineWidth=1;c.strokeStyle=i?'#797977':'#ff5353';c.strokeRect(r.x+7,r.y+7,r.w-14,r.h-14);
  c.fillStyle='#fff';c.font=`1000 21px ${font}`;c.fillText(i?'메인화면':'계속하기',r.x+r.w/2,r.y+r.h/2);
 }c.restore();
}
