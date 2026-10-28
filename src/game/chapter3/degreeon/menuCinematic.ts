import type {Vec} from './core';
import {BASE_FIELD_W,BASE_FIELD_H,clamp,smooth} from './core';

export const MENU_GRAB_END=.55,ARENA_BREACH_TIME=1.05,MENU_SLIDE_START=1.7,MENU_SLIDE_END=2.95,MENU_LAND_TIME=3.25;
export const ARENA_BREACH_Y=-70;
const cameraAtBreach=BASE_FIELD_W*.28;
const easeOut=(x:number)=>1-Math.pow(1-clamp(x,0,1),3);
export const arenaExitX=(w:number)=>(w+BASE_FIELD_W)/2+140;
export const menuSlideX=(w:number,t:number)=>-w*1.2*(1-smooth((t-MENU_SLIDE_START)/(MENU_SLIDE_END-MENU_SLIDE_START)));
function outsidePlayer(w:number,t:number):Vec{
 const elapsed=Math.max(0,t-ARENA_BREACH_TIME),drag=1-Math.exp(-3*elapsed);
 return{x:cameraAtBreach-BASE_FIELD_W/2-w*.13*drag,y:ARENA_BREACH_Y+42*drag};
}
/** The moving menu's RIGHT edge physically crosses the left-flying player. */
export function menuBreachTime(w:number){
 let lo=MENU_SLIDE_START,hi=MENU_SLIDE_END;
 for(let i=0;i<30;i++){const t=(lo+hi)/2;if(menuSlideX(w,t)+w/2<outsidePlayer(w,t).x)lo=t;else hi=t;}
 return(lo+hi)/2;
}
export function sampleMenuCinematic(w:number,h:number,t:number,from:Vec,boss:Vec){
 const arenaX=Math.min(arenaExitX(w),cameraAtBreach*Math.pow(Math.max(0,(t-MENU_GRAB_END)/(ARENA_BREACH_TIME-MENU_GRAB_END)),2));
 const capture={x:boss.x-25,y:boss.y+55},entryTime=menuBreachTime(w),entry=outsidePlayer(w,entryTime);
 let player:Vec;
 if(t<MENU_GRAB_END){const k=smooth(t/MENU_GRAB_END);player={x:from.x+(capture.x-from.x)*k,y:from.y+(capture.y-from.y)*k};}
 else if(t<ARENA_BREACH_TIME){const k=clamp((t-MENU_GRAB_END)/(ARENA_BREACH_TIME-MENU_GRAB_END),0,1);player={x:arenaX+capture.x+(-BASE_FIELD_W/2-capture.x)*Math.pow(k,1.5),y:capture.y+(ARENA_BREACH_Y-capture.y)*k};}
 else if(t<entryTime)player=outsidePlayer(w,t);
 else{const k=easeOut((t-entryTime)/(MENU_LAND_TIME-entryTime)),landingX=Math.max(-w/2+90,entry.x-w*.07);player={x:entry.x+(landingX-entry.x)*k,y:entry.y*(1-k)};}
 return{
  player,
  arena:{x:arenaX,y:0,w:BASE_FIELD_W,h:BASE_FIELD_H,scale:1},
  menu:{x:menuSlideX(w,t),y:0,w,h,visible:t>=MENU_SLIDE_START},
  arenaBreach:{time:ARENA_BREACH_TIME,x:cameraAtBreach-BASE_FIELD_W/2,y:ARENA_BREACH_Y},
  menuBreach:{time:entryTime,x:entry.x,y:entry.y},
 };
}
