export const assetRoot=typeof location!=='undefined'&&location.protocol==='file:'?'./public/':'./';
export const uiAsset=(path:string)=>assetRoot+path.replace(/^\//,'');
export const menuArt=[
 {id:'story',path:'assets/common/ui/buttons/main_menu_story_mode_v11.png',label:'스토리 모드',w:330,ratio:344/857},
 {id:'settings',path:'assets/common/ui/buttons/main_menu_settings_v11.png',label:'설정',w:252,ratio:344/645},
 {id:'ship',path:'assets/common/ui/buttons/main_menu_ship_select_v11.png',label:'기체 선택',w:310,ratio:327/804},
 {id:'production',path:'assets/common/ui/buttons/main_menu_production_info_v11.png',label:'제작 정보',w:282,ratio:330/705},
 {id:'game-logo',path:'assets/common/story/ui/game_logo.png',label:'호반우의 졸업 대작전',w:120,ratio:1212/1010},
 {id:'site-logo',path:'assets/common/ui/logos/site-logo.png',label:'호반우 게임 사이트',w:96,ratio:1006/978},
] as const;
const cache=new Map<string,HTMLImageElement>();
export function uiImage(path:string){if(typeof Image==='undefined')return null;let im=cache.get(path);if(!im){im=new Image();im.src=uiAsset(path);cache.set(path,im);}return im;}
export function drawUiImage(c:CanvasRenderingContext2D,path:string,x:number,y:number,w:number,h:number){const im=uiImage(path);if(!im?.complete||!im.naturalWidth)return false;c.drawImage(im,x-w/2,y-h/2,w,h);return true;}
export function menuBackgroundPath(date=new Date()){
 const h=date.getHours();return h>=7&&h<17?'assets/common/backgrounds/main_menu_campus_bg.png':h>=17&&h<20?'assets/common/backgrounds/main_menu_campus_evening.png':h>=4&&h<7?'assets/common/backgrounds/main_menu_campus_dawn.png':'assets/chapter3/story/backgrounds/campus_night.png';
}
/** Original menu-open positions on its 1600×900 uniformly scaled UI stage. */
export function menuLayout(w:number,h:number){
 const scale=Math.min(w/1600,h/900);let y=158;
 return menuArt.map((a,i)=>{const ah=a.w*a.ratio;const p=i<4?{x:800,y:y+ah/2}:i===4?{x:800,y:12+ah/2}:{x:28+a.w/2,y:20+ah/2};if(i<4)y+=ah+9;
  return{...a,x:(p.x-800)*scale,y:(p.y-450)*scale,w:a.w*scale,h:ah*scale};});
}
export function drawMenuBackground(c:CanvasRenderingContext2D,w:number,h:number,path:string){
 const im=uiImage(path);c.fillStyle='#12253c';c.fillRect(-w/2,-h/2,w,h);
 if(im?.complete&&im.naturalWidth){const k=Math.max(w/im.naturalWidth,h/im.naturalHeight),iw=im.naturalWidth*k,ih=im.naturalHeight*k;c.drawImage(im,-iw/2,-ih/2,iw,ih);}
 const shade=c.createLinearGradient(0,-h/2,0,h/2);shade.addColorStop(0,'rgba(0,27,67,.16)');shade.addColorStop(.42,'rgba(0,94,210,.03)');shade.addColorStop(1,'rgba(0,0,0,.22)');c.fillStyle=shade;c.fillRect(-w/2,-h/2,w,h);
 const light=c.createRadialGradient(0,-h*.38,0,0,-h*.38,h*.3);light.addColorStop(0,'#ffffff38');light.addColorStop(1,'#ffffff00');c.fillStyle=light;c.fillRect(-w/2,-h/2,w,h);
}
if(typeof Image!=='undefined'){for(const a of menuArt)uiImage(a.path);for(const h of [2,5,12,18])uiImage(menuBackgroundPath(new Date(2026,0,1,h)));for(const n of ['panels/notification-panel.png','buttons/confirm.png','buttons/cancel.png'])uiImage('assets/common/ui/'+n);}
