import {freshLearning,startLearning,hasLearningStep,type Learning} from './learning';
import {AWAKEN_SECONDS,AWAKEN_REVEAL} from './awakeningCinema';
import {ARRIVAL_SECONDS,CLEAR_SECONDS,DEFEAT_SECONDS} from './bossCinema';
import {freshContinuity} from './continuity';
import type {Engine} from './engine';
import {BASE_FIELD_W,BASE_FIELD_H,MAX_HP,MAX_BOMBS,clamp} from './core';
export type StoryPreview='arrival'|'phase-clear'|'awakening'|'victory'|'complete';
export type StoryMode='opening'|'combat'|'false-clear'|'taunt'|'awakening'|'threat'|'last-warning'|'victory'|'complete'|'preview-end';
export type StorySound='glyph'|'weight'|'resolve'|'charge'|'awaken'|'victory';
export type DialogueLine={text:string;emphasis?:string;still?:boolean};
export type EncounterCue={id:string;seconds:number;stage:number;supports:string[];full?:boolean};
type LabState={index:number;stage:number;supports:string[];full:boolean;expert:boolean;autoplay:boolean;missCap:number};
export type EncounterState={learning:Learning;trainingOnly:boolean;learningOverride?:'first'|'expert';preview:StoryPreview|null;enabled:boolean;mode:StoryMode;phase:1|2;age:number;elapsed:number;line:number;lineAge:number;revealed:boolean;weighted:boolean;glyphs:number;cue:number;loop:number;practice:boolean;lab:LabState|null;sceneFrom:{w:number;h:number;angle:number;x:number;y:number};history:string[]};
export const freshEncounter=():EncounterState=>({learning:freshLearning(),trainingOnly:false,preview:null,enabled:false,mode:'opening',phase:1,age:0,elapsed:0,line:0,lineAge:0,revealed:false,weighted:false,glyphs:0,cue:0,loop:0,practice:false,lab:null,sceneFrom:{w:BASE_FIELD_W,h:BASE_FIELD_H,angle:0,x:0,y:404},history:[]});
export const PHASE_HP={1:3200,2:5200};
const cue=(id:string,seconds:number,stage=0,supports:string[]=[],full=false):EncounterCue=>({id,seconds,stage,supports,full});
export const phaseOneScore:EncounterCue[]=[
 cue('volley-rhythm',10),cue('triple-wave',9),cue('flowers',11,0,['erosion']),cue('rockets',10),cue('inspection',18),
 cue('volley-cross',10),cue('volley-gap',10),cue('corridor-vertical',10,1,['magnet']),cue('split8',18,0),
 cue('mirror',11,1),cue('lightning',10,1,['wall']),cue('graduation-gate',30,0),cue('graduation-stamp',11,1),cue('corridor-horizontal',10,1,['erosion'])
];
export const phaseTwoScore:EncounterCue[]=[
 cue('hp-sword',19,2),cue('corridor-vertical',11,2,['rotation']),cue('exile',Infinity,2),cue('tail-shed',11,2,['magnet']),
 cue('pause-storm',34,2),cue('volley-core',11,2,['recycle']),cue('menu-deception',34,2),cue('graduation-stamp',13,2,['shape'],true),
 cue('outside-hands',32,2),cue('flowers',11,2,['clones']),cue('path-fold',34,2),cue('volley-cross',11,2,['portals']),
 cue('tile-stream',23,3),cue('volley-curve',11,3,['cut']),cue('fluid',22,3),cue('volley-gap',11,3,['time']),
 cue('menu-deception-mobs',30,3),cue('link',12,3,['recycle','time']),cue('flight',21,3),cue('corridor-horizontal',13,3,['miss']),
 cue('rhythm',26,3),cue('tail-shed',11,3,['magnet'])
];
export const storyLines:Partial<Record<StoryMode,DialogueLine[]>>={
 opening:[{text:'마지막까지 왔군.'},{text:'하지만 여기서는……'},{text:'네가 배운 규칙이\n통하지 않을 수도 있다.',emphasis:'규칙'}],
 taunt:[{text:'……끝났다고 생각했나?',emphasis:'끝났다고'}],
 threat:[{text:'아니.'},{text:'내가 부르는 건\n네가 아니다.'},{text:'그 뒤에서 방향키를\n누르고 있는 너.',emphasis:'너',still:true},{text:'화면 안에만 있으면\n안전할 줄 알았나?',emphasis:'화면'},{text:'이제 네가 믿는 규칙부터\n무너뜨리겠다.',emphasis:'무너뜨리겠다'}],
 'last-warning':[{text:'아직 끝나지 않았다.'},{text:'마지막까지……\n버틸 수 있겠나?',emphasis:'마지막'}],
};
export function revealDialogue(line:DialogueLine,age:number,all=false){
 const chars=Array.from(line.text);let time=.35,count=0;const mark=line.emphasis?line.text.lastIndexOf(line.emphasis):-1;
 for(let i=0;i<chars.length;i++){if(i===mark)time+=.5;time+=chars[i]==='\n'?.35:chars[i]==='…'?.16:.09;if(time<=age||all)count=i+1;}
 return{text:chars.slice(0,count).join(''),count,total:chars.length,finished:count===chars.length,duration:time};
}
export const storyCinematic=(e:Engine)=>e.encounter.enabled&&e.encounter.mode!=='combat';
export const currentStoryCue=(e:Engine)=>(e.encounter.phase===1?phaseOneScore:phaseTwoScore)[e.encounter.cue];
function scene(e:Engine,mode:StoryMode){const s=e.encounter,p=e.localPlayer();s.sceneFrom={w:e.fieldW,h:e.fieldH,angle:e.angle,x:p.x,y:p.y};s.mode=mode;s.age=0;s.line=0;s.lineAge=0;s.revealed=false;s.weighted=false;s.glyphs=0;
 if(mode==='threat'){s.phase=2;e.bossForm=2;e.bossHpMax=PHASE_HP[2];e.bossHp=e.bossHpMax;}
 e.continuity=freshContinuity();e.clearAttack();e.enemies=[];e.items=[];e.effects=[];e.advanced.zones=[];e.smartBombActive=false;e.bombParticles=[];e.keys.clear();e.rotation=0;e.pendingBombard=false;e.queuedIndex=null;e.miss=0;e.missTimer=0;e.playerFacing=0;e.playStorySound(mode==='false-clear'?'resolve':mode==='awakening'?'charge':mode==='victory'?'victory':'weight');e.log(`보스전 연출 · ${mode}`);e.notify();}
export function startEncounter(e:Engine,practice=false){
 e.bossMapScroll=0;
 const old=e.encounter,lab=old.enabled?old.lab:{index:e.index,stage:e.stage,supports:[...e.selectedSupports],full:e.fullField,expert:e.expert,autoplay:e.autoplay,missCap:e.missCap};
 e.encounter={...freshEncounter(),enabled:true,practice,lab,phase:practice?2:1};e.paused=false;e.keys.clear();e.seed=314159;e.speed=1;e.angle=e.targetAngle=e.fromAngle=0;e.orientation=0;e.rotation=0;e.fullField=false;e.selectedSupports.clear();e.autoplay=false;e.expert=false;e.missCap=120;e.begin(e.patterns.findIndex(p=>p.id==='flowers'),0);
 e.hp=MAX_HP;e.bombs=MAX_BOMBS;e.bossHpMax=PHASE_HP[practice?2:1];e.bossHp=e.bossHpMax;e.bossForm=practice?2:1;e.hits=0;e.deaths=0;e.bossHits=0;e.gameOver=false;
 scene(e,practice?'threat':'opening');
}
export function startStoryPreview(e:Engine,kind:StoryPreview){
 startEncounter(e,kind==='victory'||kind==='complete');e.encounter.preview=kind;
 e.bossHp=kind==='arrival'?e.bossHpMax:0;scene(e,kind==='arrival'?'opening':kind==='phase-clear'?'false-clear':kind);e.notify();
}
export function leaveEncounter(e:Engine,restore=true){const lab=e.encounter.lab;e.encounter=freshEncounter();if(lab){e.selectedSupports=new Set(lab.supports);e.fullField=lab.full;e.expert=lab.expert;e.autoplay=lab.autoplay;e.missCap=lab.missCap;e.bossHpMax=240;if(restore)e.begin(lab.index,lab.stage);}e.keys.clear();e.notify();}
export function enterEncounterCue(e:Engine,continuous=false,continueLearning=false){
 const s=e.encounter,c=currentStoryCue(e);if(!c)throw new Error('Missing encounter cue');const index=e.patterns.findIndex(p=>p.id===c.id);if(index<0)throw new Error('Missing pattern '+c.id);
 const hp=e.hp,bombs=e.bombs,boss=e.bossHp,stats={hits:e.hits,deaths:e.deaths,bossHits:e.bossHits};
 if(!continuous)e.keys.clear();e.selectedSupports=new Set(c.supports);e.fullField=!!c.full;if(!continuous){e.angle=e.fromAngle=e.targetAngle=0;e.orientation=0;e.rotation=0;}e.pendingBombard=false;e.miss=0;e.missTimer=0;e.missCap=c.supports.includes('miss')?50:120;if(!continuous)e.effects=[];e.queuedIndex=null;e.begin(index,continueLearning?s.learning.stages[s.learning.step]:startLearning(s.learning,c.id,s.learningOverride),continuous);
 e.hp=hp;e.bombs=bombs;e.bossHp=boss;e.bossForm=s.phase;e.bossHpMax=PHASE_HP[s.phase];Object.assign(e,stats);if(!continuous){e.cooldown=Math.max(e.cooldown,.8);e.shotTimer=.15;e.bombCooldown=.15;}
 if(c.supports.includes('shape')&&c.full){e.fieldWarp.current='full';e.fieldWarp.target='full';e.fieldWarp.from=e.gridSize();e.fieldWarp.bag=['wide','base','tiny','flat','tall','full'];}
 if(e.phase==='intro'&&!continuous)e.phaseTime=1.55;s.mode='combat';s.age=0;if(!continueLearning){s.history.push(c.id);s.history=s.history.slice(-100);}e.log(`보스전 ${s.phase}페이즈 · ${c.id}${c.supports.length?' + '+c.supports.join(', '):''}`);e.notify();
}
export function advanceEncounterCue(e:Engine){
 const s=e.encounter;
 // Dedicated return/portal patterns finish their physical sequence before raising difficulty.
 if(hasLearningStep(s.learning)){s.learning.step++;enterEncounterCue(e,true,true);return;}
 if(s.trainingOnly){enterEncounterCue(e,true);return;}
 const list=s.phase===1?phaseOneScore:phaseTwoScore;s.cue++;if(s.cue>=list.length){s.cue=0;s.loop++;}enterEncounterCue(e,true);
}
export function encounterDamage(e:Engine,amount:number){if(storyCinematic(e)||e.phase!=='active')return false;const s=e.encounter;if(s.trainingOnly)return true;const next=Math.max(0,e.bossHp-amount),floor=Math.max(1,e.bossHpMax*.01);
 if(s.phase===2&&!e.finalStand.started&&next<=floor){e.bossHp=floor;e.finalStand.pending=true;}else e.bossHp=next;return true;}
function finishDialogue(e:Engine){const s=e.encounter;if(s.mode==='opening'&&s.preview){s.mode='preview-end';s.age=0;e.notify();}else if(s.mode==='opening'){s.cue=0;enterEncounterCue(e);}else if(s.mode==='taunt')scene(e,'awakening');else if(s.mode==='threat'&&s.preview){s.mode='preview-end';s.age=0;e.notify();}else if(s.mode==='threat'){s.phase=2;s.cue=0;e.bossForm=2;e.bossHpMax=PHASE_HP[2];e.bossHp=e.bossHpMax;enterEncounterCue(e);}else if(s.mode==='last-warning'){
 s.mode='combat';e.selectedSupports.clear();e.fullField=false;e.startFinalStand();e.bossForm=2;e.log('최후의 1% · 40초 고정 순서');
 }else if(s.mode==='victory'){s.mode='complete';s.age=0;e.notify();}}
export function advanceStoryDialogue(e:Engine){if(e.paused||!storyCinematic(e))return;const s=e.encounter,lines=storyLines[s.mode];if(!lines)return;if(s.mode==='opening'&&s.age<ARRIVAL_SECONDS||s.mode==='victory'&&s.age<DEFEAT_SECONDS)return;const line=lines[s.line],r=revealDialogue(line,s.lineAge,s.revealed);
 if(!r.finished){s.revealed=true;s.lineAge=Math.max(s.lineAge,r.duration);e.notify();return;}
 s.line++;s.lineAge=0;s.revealed=false;s.weighted=false;s.glyphs=0;if(s.line>=lines.length)finishDialogue(e);else e.playStorySound('weight');e.notify();}
export function skipStoryScene(e:Engine){if(e.paused||!storyCinematic(e))return;const s=e.encounter;if(s.mode==='false-clear')scene(e,'taunt');else if(s.mode==='awakening'){e.bossForm=2;scene(e,'threat');}else if(s.mode==='victory'||storyLines[s.mode])finishDialogue(e);}
/** Return true while story presentation owns time, so combat physics never run behind dialogue. */
export function updateEncounter(e:Engine,dt:number){const s=e.encounter;if(!s.enabled)return false;if(e.gameOver||e.hp<=0||e.dead>0)return false;if(s.mode==='complete'||s.mode==='preview-end')return true;s.elapsed+=dt;
 if(s.mode==='combat'){
  if(e.bossHp<=0){if(s.phase===1)scene(e,'false-clear');else scene(e,'victory');return true;}
  if(s.phase===2&&(e.finalStand.pending||e.bossHp<=Math.max(1,e.bossHpMax*.01))&&!e.finalStand.started){scene(e,'last-warning');return true;}
  return false;
 }
 const previousAge=s.age;s.age+=dt;s.lineAge+=dt;
 if(s.mode==='opening'&&previousAge<ARRIVAL_SECONDS)s.lineAge=Math.max(0,s.age-ARRIVAL_SECONDS);if(s.mode==='victory'&&previousAge<DEFEAT_SECONDS)s.lineAge=Math.max(0,s.age-DEFEAT_SECONDS);
 if((s.mode==='false-clear'&&previousAge<2.6&&s.age>=2.6)||(s.mode==='victory'&&previousAge<5.4&&s.age>=5.4))e.playStorySound('awaken');if(s.mode==='victory'&&previousAge<10&&s.age>=10)e.playStorySound('victory');if(s.mode==='opening'&&previousAge<2.9&&s.age>=2.9)e.playStorySound('charge');
 if(s.mode==='victory'&&s.age>=DEFEAT_SECONDS){finishDialogue(e);return true;}
 if(s.mode==='false-clear'&&s.age>=CLEAR_SECONDS)scene(e,'taunt');
 else if(s.mode==='awakening'){
  if(s.age>=AWAKEN_REVEAL&&e.bossForm===1){e.bossForm=2;e.playStorySound('awaken');}
  if(previousAge<2.5&&s.age>=2.5)e.playStorySound('charge');if(previousAge<8&&s.age>=8)e.playStorySound('weight');
  if(s.age>=AWAKEN_SECONDS)scene(e,'threat');
 }else if(!(s.mode==='opening'&&s.age<ARRIVAL_SECONDS||s.mode==='victory'&&s.age<DEFEAT_SECONDS)){const lines=storyLines[s.mode],line=lines?.[s.line];if(line){const r=revealDialogue(line,s.lineAge,s.revealed);if(r.count>s.glyphs){s.glyphs=r.count;e.playStorySound('glyph');}if(r.finished&&!s.weighted){s.weighted=true;e.playStorySound('weight');}if(s.lineAge>=r.duration+2.3)advanceStoryDialogue(e);}}
 return true;
}
export function encounterCueExpired(e:Engine){return e.encounter.enabled&&e.encounter.mode==='combat'&&!e.finalStand.started&&e.t>=currentStoryCue(e).seconds/e.encounter.learning.stages.length;}

export function startCuePractice(e:Engine,phase:1|2,index:number,mode:'first'|'expert'='first'){
 const list=phase===1?phaseOneScore:phaseTwoScore;if(!list[index])return;
 startEncounter(e,phase===2);e.encounter.phase=phase;e.encounter.cue=index;e.encounter.trainingOnly=true;e.encounter.learningOverride=mode;enterEncounterCue(e);
}
export function skipEncounterPattern(e:Engine){
 if(e.storyInputLocked){skipStoryScene(e);return;}
 const s=e.encounter,list=s.phase===1?phaseOneScore:phaseTwoScore;
 if(!s.trainingOnly){s.cue=(s.cue+1)%list.length;}
 enterEncounterCue(e,false);
}
export function skipEncounterPhase(e:Engine){
 if(e.encounter.trainingOnly)return;
 scene(e,e.encounter.phase===1?'false-clear':'victory');
}
