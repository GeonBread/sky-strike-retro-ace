import {freshNativeWeapon,emitNativeShots,nativeFireInterval,nativeCanFire,moveNativeShot,shotDamage,isNativeBeam} from './nativeWeapon';
import {bossMapSpeed,type BossMapStage} from '../../render/bossMapScroll';
import {freshContinuity,requestHandoff,tickHandoff,beginBridge,tickBridge,bossTarget,tickBossPresence,playerFireAllowed} from './continuity';
import {freshEncounter,startEncounter,startStoryPreview,leaveEncounter,updateEncounter,storyCinematic,advanceEncounterCue,encounterDamage,encounterCueExpired,skipStoryScene} from './encounter';
import type {StorySound} from './encounter';
import {drawEncounterScene} from './encounterView';
import {freshTileStream} from './tileStream';
import {freshFieldTricks,bendInMagnet,teleportProjectile} from './fieldTricks';
import {freshExtraNormal} from './extraNormals';
import {freshUnseen,shootGraduationLock,gateBlocksBoss,clearUnseenByBomb} from './unseenSpecials';
import {freshGraduationStamp,clearStampByBomb,stampScreenShake} from './graduationStamp';
import {freshPathFold,clearPathFoldByBomb} from './pathFold';
import {freshRecycle,collectRecycledBullets,clearRecycleByBomb} from './bulletRecycle';
import {initSpaceCut,syncSpaceCut,constrainCutPlayer} from './spaceCut';
import {freshMenuDeception,isMenuDeception,menuInputLocked,syncMenuField,moveMenuPlayer,beginMenuReturn,updateMenuReturn,clearMenuByBomb} from './menuDeception';
import { freshAdvanced, configureZones, timeScale, supports, updateSupports, attackDestructibles, updateSeed, moveExile, constrainWalls, Category } from './advanced';
import { exileOutside } from './exile';
import { timedMotion } from './time';
import { freshVolley, prepareBullet, finishBullet, bulletHarmless } from './normalBullets';
import { bombExitRadius, bombReaches } from './bomb';
import { drawScene } from './render';
import { freshFinalStand } from './finalStand';
import { freshCorridor,waveBeamPath,waveBeamBounds } from './waveLaser';
import { freshFieldWarp,syncFieldWarp,updateFieldWarp,fieldWarpCanvasSize } from './fieldWarp';
import { freshPauseStorm,syncPauseStormField,movePauseStorm,clearStormByBomb,stormScreenShake,beginStormReturn,updateStormReturn } from './pauseStorm';
export * from './core';
import { Vec, BombParticle, Phase, CutPiece, CutTelegraph, Entity, Shot, WorldActor, Effect, Link, Laser, Pattern, polygonArea, polygonCentroid, pointInPolygon, clipPolygon, constrainToPolygon, segmentDistance, circleRect, reflectedPath, CANVAS_W, CANVAS_H, CANVAS_CX, CANVAS_CY, PLAYER_MOVE_SPEED, PLAYER_HIT_RADIUS, MAX_HP, MAX_BOMBS, BASE_FIELD_W, BASE_FIELD_H, BOMBARD_FIELD_W, BOMBARD_FIELD_H, SMART_BOMB_SPEED, SMART_BOMB_BOSS_DAMAGE, modes, clamp, smooth, distance, dot } from './core';
export class Engine {
  nativeWeapon=freshNativeWeapon();
  continuity=freshContinuity();bossVisibility=1;bossVisualSize=268;
  get emitting(){return !this.encounter.enabled||!this.continuity.closing;}
  encounter=freshEncounter();playStorySound:(kind:StorySound)=>void=()=>{};
  startEncounter(practice=false){startEncounter(this,practice);}
  leaveEncounter(){leaveEncounter(this);}
  get storyInputLocked(){return storyCinematic(this);}
  hostPauseDialog=false;useResources=true; bossForm=1; purification=-1;
  fullViewport:{w:number;h:number}|null=null;fullField=false;selectedSupports=new Set<string>(['miss']);supportPreviewId='flowers';advanced=freshAdvanced();
  get combatPattern(){return this.pattern.category==='support'?this.patterns.find(p=>p.id===this.supportPreviewId&&p.category==='normal')??this.patterns.find(p=>p.category==='normal')!:this.pattern;}
  tileStream=freshTileStream();
  fieldTricks=freshFieldTricks();extraNormal=freshExtraNormal();unseen=freshUnseen();gateBombSpent=false;
  graduationStamp=freshGraduationStamp();pathFold=freshPathFold();recycle=freshRecycle();
  get recycleEnabled(){return supports(this).has('recycle');}
  volley=freshVolley();
  corridor=freshCorridor();fieldWarp=freshFieldWarp();
  pauseStorm=freshPauseStorm();menuDeception=freshMenuDeception();
  get stormInputLocked(){return menuInputLocked(this)||this.pattern?.id==='pause-storm'&&this.phase==='active'&&this.pauseStorm.phase!=='attack';}
  get cutEnabled(){return ['intro','active','outro'].includes(this.phase)&&supports(this).has('cut');}
  get fieldWarpEnabled(){return (this.phase==='intro'||this.phase==='active')&&supports(this).has('shape');}
  get timeFieldFull(){return this.fieldWarpEnabled?this.fieldWarp.full:this.fullField;}
  finalStand=freshFinalStand();
  get attackLocked(){return this.storyInputLocked||this.finalStand.pending||this.finalStand.started&&!this.finalStand.complete;}
  localTime(p:Vec){return timeScale(this,p);}
  motionTime(p:Vec,dt:number,vx=0,vy=0){return timedMotion(this.phase==='active'?this.advanced.zones:[],p,{x:vx,y:vy},dt);}
  get debtEnabled(){return supports(this).has('miss');}
  ctx:CanvasRenderingContext2D; pattern!:Pattern; index=0; stage=0; phase:Phase='intro'; phaseTime=0;
  t=0; clock=0; bossMapScroll=0; beat=0; counter=0; orientation=0; angle=0;
  rotation=0; rotationDuration=2; fromAngle=0; targetAngle=0; rotationLive=false;
  fieldW=540; fieldH=650; player:Vec={x:CANVAS_CX,y:884}; boss:Vec={x:0,y:-300};
  hazards:Entity[]=[]; shots:Shot[]=[];enemies:WorldActor[]=[];items:WorldActor[]=[]; effects:Effect[]=[]; links:Link[]=[]; lasers:Laser[]=[];
  keys=new Set<string>(); logs:string[]=[]; invincible=false; hitboxes=false; expert=false;
  autoFire=false; autoplay=false; speed=1; paused=false; hits=0; deaths=0; bossHits=0; cooldown=1;
  hp=MAX_HP; bombs=MAX_BOMBS; bossHpMax=240; bossHp=240; damageFlash=0; gameOver=false;
  smartBombActive=false; smartBombRadius=0; smartBombLimit=0; smartBombWorldOrigin:Vec={x:0,y:404};smartBombHitBoss=false;smartBombOrigin:Vec={x:CANVAS_CX,y:884}; bombParticles:BombParticle[]=[];
  dead=0; split=0; flightV=0; lane=2; laneCooldown=0; shotTimer=0; bombCooldown=0; shake=0;
  cutPolygon:Vec[]=[];cutPieces:CutPiece[]=[];cutTelegraph:CutTelegraph|null=null;cutCount=0;cutLimit=0;cutTimer=0;
  tileDanger:number[]=[];tileSafe:number[]=[];tileRound=0;tileState:'idle'|'warning'|'blast'|'recover'='idle';tileTimer=0;
  bodyAnimClocks=[0,0,0];cloneShotTimers=[0,0];playerFacing=0;playerAnimClock=0;bossAnimClock=0;fluidWet=false;
  fluidFill=0;fluidPlayerV:Vec={x:0,y:0};fluidHeading=0;fluidThrottle=0;fluidFlow:Vec={x:0,y:0};fluidTilt=0;
  miss=0; missCap=120; missTimer=0; pendingBombard=false; bombTotal=0; bombSpawned=0; bombTimer=0; bombardAge=0;
  queuedIndex:number|null=null; queuedStage=0; visited=new Set<string>();
  fps=60; seed=314159; serial=0; running=false; raf=0; acc=0; last=0; notify=()=>{};
  constructor(public canvas:HTMLCanvasElement,public patterns:Pattern[]){this.ctx=canvas.getContext('2d')!;this.begin(0,0);}
  get zoom(){return 1;} // The physical canvas rotates rigidly. Never resize it by angle.
  get intro(){return this.phase==='intro'?Math.max(0,2.2-this.phaseTime):0;}
  get banner(){return this.pattern.stages[this.stage];}
  get width(){return Math.abs(Math.cos(this.angle))*this.fieldW+Math.abs(Math.sin(this.angle))*this.fieldH;}
  get height(){return Math.abs(Math.sin(this.angle))*this.fieldW+Math.abs(Math.cos(this.angle))*this.fieldH;}
  bounds(){return {l:CANVAS_CX-this.width/2,r:CANVAS_CX+this.width/2,t:CANVAS_CY-this.height/2,b:CANVAS_CY+this.height/2};}
  screen(p:Vec):Vec{const c=Math.cos(this.angle),s=Math.sin(this.angle);return{x:CANVAS_CX+(p.x*c-p.y*s)*this.zoom,y:CANVAS_CY+(p.x*s+p.y*c)*this.zoom};}
  local(p:Vec):Vec{const x=(p.x-CANVAS_CX)/this.zoom,y=(p.y-CANVAS_CY)/this.zoom,c=Math.cos(this.angle),s=Math.sin(this.angle);return{x:x*c+y*s,y:-x*s+y*c};}
  localPlayer(){return this.local(this.player);}
  gravityLocal():Vec{return{x:Math.sin(this.angle),y:Math.cos(this.angle)};}
  fluidSurface(){
    const g=this.gravityLocal(),corners=[{x:-this.fieldW/2,y:-this.fieldH/2},{x:this.fieldW/2,y:-this.fieldH/2},{x:this.fieldW/2,y:this.fieldH/2},{x:-this.fieldW/2,y:this.fieldH/2}],vals=corners.map(p=>dot(p,g));
    const lo=Math.min(...vals),hi=Math.max(...vals);return hi-(hi-lo)*clamp(this.fluidFill,0,1);
  }
  submerged(p:Vec){return dot(p,this.gravityLocal())>=this.fluidSurface()-2;}
  tileCols=3;tileRows=3;
  tileIndex(p:Vec){
    if(Math.abs(p.x)>this.fieldW/2||Math.abs(p.y)>this.fieldH/2)return -1;
    const col=clamp(Math.floor((p.x+this.fieldW/2)/(this.fieldW/this.tileCols)),0,this.tileCols-1);
    const row=clamp(Math.floor((p.y+this.fieldH/2)/(this.fieldH/this.tileRows)),0,this.tileRows-1);
    return row*this.tileCols+col;
  }
  inTileCenter(_p:Vec,_margin=0){return false;} // Every grid cell is playable.
  gridSize(){
    if(typeof window==='undefined')return {w:1600,h:960};
    return {w:window.innerWidth/this.displayScale,h:window.innerHeight/this.displayScale};
  }
  point(u:number,v:number){return this.screen({x:(u-.5)*this.fieldW,y:(v-.5)*this.fieldH});}
  random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
  log(s:string){this.logs.unshift(`${this.clock.toFixed(1).padStart(5,'0')}  ${s}`);this.logs=this.logs.slice(0,80);}
  clearAttack(){this.tileStream=freshTileStream();this.fieldTricks=freshFieldTricks();this.extraNormal=freshExtraNormal();this.unseen=freshUnseen();this.gateBombSpent=false;this.graduationStamp=freshGraduationStamp();this.graduationStamp.limit=this.stage>=2?4:3;this.pathFold=freshPathFold();this.pathFold.limit=this.stage>=2?4:3;this.pathFold.zipDuration=2.6-this.stage*.2;this.recycle=freshRecycle();this.hazards=[];this.links=[];this.lasers=[];this.shots=[];if(this.corridor)this.corridor.beams=[];if(this.pauseStorm)this.pauseStorm.windows=[];if(this.advanced){this.advanced.bolts=[];this.advanced.walls=[];}}
  begin(i:number,stage:number,continuous=false){
    const carry=continuous?{player:this.localPlayer(),boss:{...this.boss},geometry:{w:this.fieldW,h:this.fieldH,angle:this.angle},
      hazards:this.hazards,shots:this.shots,effects:this.effects,enemies:this.enemies,items:this.items,walls:this.advanced.walls,
      bossAnimClock:this.bossAnimClock,playerAnimClock:this.playerAnimClock,bodyAnimClocks:this.bodyAnimClocks,cloneShotTimers:this.cloneShotTimers,
      playerFacing:this.playerFacing,split:this.split,cooldown:this.cooldown,shotTimer:this.shotTimer,bombCooldown:this.bombCooldown,
      hp:this.hp,bombs:this.bombs,bossHp:this.bossHp,damageFlash:this.damageFlash,keys:new Set(this.keys),
      bomb:{smartBombActive:this.smartBombActive,smartBombRadius:this.smartBombRadius,smartBombLimit:this.smartBombLimit,smartBombWorldOrigin:this.smartBombWorldOrigin,smartBombHitBoss:this.smartBombHitBoss,smartBombOrigin:this.smartBombOrigin,bombParticles:this.bombParticles}}:null;
    this.continuity=freshContinuity();
    this.pattern?.exit(this);this.index=i;this.pattern=this.patterns[i];this.stage=stage;
    this.finalStand=freshFinalStand();
    this.corridor=freshCorridor();this.fieldWarp=freshFieldWarp();
    this.pauseStorm=freshPauseStorm();this.menuDeception=freshMenuDeception();
    this.purification=-1;this.bossForm=1;
    this.phase='intro';this.phaseTime=0;this.t=0;this.beat=0;this.counter=0;this.clearAttack();
    this.advanced=freshAdvanced();this.fullViewport=this.gridSize();this.fieldW=this.fullField&&this.pattern.category!=='special'?this.gridSize().w:BASE_FIELD_W;this.fieldH=this.pattern.id==='flight'?this.gridSize().w:this.pattern.id==='rhythm'?1600:this.fullField&&this.pattern.category!=='special'?this.gridSize().h:BASE_FIELD_H;this.bossAnimClock=0;this.enemies=[];this.items=[];
    this.hp=MAX_HP;this.bombs=MAX_BOMBS;this.bossHp=this.bossHpMax;this.damageFlash=0;this.gameOver=false;this.smartBombActive=false;this.smartBombRadius=0;this.smartBombLimit=0;this.smartBombHitBoss=false;this.bombParticles=[];
    this.bodyAnimClocks=[0,0,0];this.cloneShotTimers=[0,0];this.dead=0;this.split=0;this.flightV=0;this.lane=2;this.cooldown=1;this.player=this.screen({x:0,y:404});
    this.cutPolygon=[];this.cutPieces=[];this.cutTelegraph=null;this.cutCount=0;this.cutLimit=0;this.cutTimer=0;
    this.tileDanger=[];this.tileSafe=[];this.tileRound=0;this.tileState='idle';this.tileTimer=0;
    this.fluidWet=false;this.fluidFill=0;this.fluidPlayerV={x:0,y:0};this.fluidHeading=0;this.fluidThrottle=0;this.fluidFlow={x:0,y:0};this.fluidTilt=0;
    this.boss={x:0,y:-300};
    if(carry){this.boss={...carry.boss};this.player=this.screen(carry.player);}
    this.visited.add(this.pattern.id);this.pattern.enter(this);if(this.pattern.category==='support')this.combatPattern.enter(this);configureZones(this);
    this.rotation=0;this.rotateTo(supports(this).has('wall')?1:this.pattern.orientation,false);
    if(this.pattern.id==='rhythm')this.boss.y=-this.fieldH/2+180;
    initSpaceCut(this);
    if(carry){
      const target={w:this.fieldW,h:this.fieldH,angle:this.targetAngle};
      this.hazards=carry.hazards;this.shots=carry.shots;this.effects=carry.effects;this.enemies=carry.enemies;this.items=carry.items;this.advanced.walls=carry.walls;
      this.boss=carry.boss;this.bossAnimClock=carry.bossAnimClock;this.playerAnimClock=carry.playerAnimClock;this.bodyAnimClocks=carry.bodyAnimClocks;this.cloneShotTimers=carry.cloneShotTimers;
      this.playerFacing=carry.playerFacing;this.split=carry.split;this.cooldown=carry.cooldown;this.shotTimer=carry.shotTimer;this.bombCooldown=carry.bombCooldown;
      this.hp=carry.hp;this.bombs=carry.bombs;this.bossHp=carry.bossHp;this.damageFlash=carry.damageFlash;this.keys=carry.keys;Object.assign(this,carry.bomb);
      beginBridge(this,carry.geometry,target,carry.player);
    }
    this.log(`패턴 진입 · ${this.pattern.name} / ${stage+1}단계`);
  }
  select(i:number){
    // Explicit selection must also escape game-over, purification and bombardment.
    if(!this.patterns[i])return;
    if(this.encounter.enabled)leaveEncounter(this,false);
    this.index=i;this.restart();
  }
  restart(){if(this.encounter.preview){startStoryPreview(this,this.encounter.preview);return;}if(this.encounter.enabled){startEncounter(this,this.encounter.practice);return;}this.paused=false;this.keys.clear();this.bombCooldown=0;this.shotTimer=0;this.seed=314159;this.miss=0;this.missTimer=0;this.pendingBombard=false;this.hits=0;this.deaths=0;this.bossHits=0;this.effects=[];this.queuedIndex=null;this.begin(this.index,this.expert?2:0);this.log('현재 패턴 즉시 재시작 · LIFE 3 / BOMB 3');}
  next(){if(this.encounter.enabled)return;if(this.attackLocked)return;this.queuedIndex=this.index;this.queuedStage=(this.stage+1)%4;this.finish();}
  finish(){
    if(this.attackLocked)return;
    if(this.phase==='outro'||this.phase==='restore')return;
    if(this.phase==='bombard'){this.log('폭격 완료 후 이동 예약');return;}
    if(this.encounter.enabled&&this.phase==='active'&&!this.finalStand.started){requestHandoff(this);return;}
    if(this.pattern.id==='pause-storm'&&this.phase==='active'){beginStormReturn(this);return;}
    if(isMenuDeception(this)&&this.phase==='active'){beginMenuReturn(this);return;}
    this.phase='outro';this.phaseTime=0;this.clearAttack();
    if(this.pattern.id==='miss')this.pendingBombard=true;this.advanced.walls=[];this.advanced.zones=[];this.advanced.bolts=[];
    this.log('패턴 종료 · 현재 전장 방향 유지');
  }
  completeNativeReturn(){if(this.pattern.id==='pause-storm')beginStormReturn(this);else if(isMenuDeception(this))beginMenuReturn(this);}
  advance(){
    if(this.encounter.enabled){advanceEncounterCue(this);return;}
    const i=this.queuedIndex??(this.autoplay&&this.stage===3?(this.index+1)%this.patterns.length:this.index);
    const s=this.queuedIndex!==null?this.queuedStage:(this.stage+1)%4;
    this.queuedIndex=null;this.begin(i,s);
  }
  rotate(){if(this.encounter.enabled)return;if(this.attackLocked||['exile','pause-storm','menu-deception','menu-deception-mobs'].includes(this.pattern.id)&&this.phase==='active')return;if(this.phase==='bombard'||this.phase==='restore'){this.log('폭격 중에는 전장 확장을 유지합니다');return;}this.rotateTo((this.orientation+1)%4,supports(this).has('rotation')&&this.phase==='active');}
  rotateTo(q:number,live:boolean){
    if(this.rotation>0)return;
    let target=q*Math.PI/2;while(target-this.angle>Math.PI)target-=Math.PI*2;while(target-this.angle< -Math.PI)target+=Math.PI*2;
    if(Math.abs(target-this.angle)<.01){this.targetAngle=target;return;}
    this.fromAngle=this.angle;this.targetAngle=target;this.rotation=this.rotationDuration;this.rotationLive=live;
    if(!live)this.clearAttack();this.log(live?'회전 예고 · 공격 유지':'회전 예고 · 공격 일시 정지');
  }
  skip(){
    if(this.storyInputLocked){skipStoryScene(this);return;}
    if(this.phase==='outro'&&(this.pattern.id==='pause-storm'||isMenuDeception(this)))return;
    if(this.rotation>0){const anchor=this.localPlayer();this.angle=this.targetAngle;this.player=this.screen(anchor);this.rotation=0;this.orientation=(Math.round(this.angle/(Math.PI/2))%4+4)%4;}
    if(this.phase==='intro')this.phaseTime=2.3;
    else if(this.phase==='outro')this.phaseTime=2.3;
    else if(this.phase==='restore')this.phaseTime=1.6;
    else if(this.phase==='bombard')this.phaseTime=Math.max(1.8,this.phaseTime);
    this.log('연출 스킵 · 공격 예고는 유지');
  }
  add(p:Partial<Entity>):Entity {
    const e:Entity={id:++this.serial,x:0,y:-200,kind:'orb',vx:0,vy:0,r:9,w:25,h:25,age:0,warn:1,life:6,color:'#c09aff',tag:'탄환',trail:[],lane:0,hold:0,fired:false,...p};
    this.hazards.push(e);return e;
  }
  damageBoss(amount:number){
    if(this.attackLocked||this.purification>=0||gateBlocksBoss(this)||this.pattern.id==='outside-hands'&&this.phase==='active')return false;
    if(this.encounter.enabled)return encounterDamage(this,amount);
    const next=Math.max(0,this.bossHp-amount),floor=Math.max(1,this.bossHpMax*.01);
    if(this.bossForm===2&&!this.finalStand.started&&this.phase==='active'&&next<=floor&&this.patterns.some(p=>p.id==='last-stand')){
      this.bossHp=floor;this.finalStand.pending=true;
    }else this.bossHp=next;
    return true;
  }
  startFinalStand(){
    const index=this.patterns.findIndex(p=>p.id==='last-stand');if(index<0||this.finalStand.started||this.gameOver||this.dead>0)return;
    const hp=this.hp,bombs=this.bombs,cooldown=this.cooldown,angle=this.angle,player={...this.player};
    this.begin(index,0);this.hp=hp;this.bombs=bombs;this.cooldown=cooldown;
    this.angle=angle;this.player=player;this.rotation=0;this.rotateTo(0,false);
    this.log('최종 형태 HP 1% · 최후의 40초 · 사격과 폭탄 봉인');this.notify();
  }
  fx(p:Vec,kind:Effect['kind']='burst',radius=35,color='#b899ff',life=.65,lane=-1){this.effects.push({...p,kind,radius,color,age:0,life,lane});}
  bodies():Vec[]{return (supports(this).has('clones')||this.encounter.enabled)&&this.split>.01?[-1,0,1].map(k=>({x:this.player.x+k*92*this.split,y:this.player.y})):[{...this.player}];}
  hit(tag:string,p=this.player){
    if(this.storyInputLocked||this.cooldown>0||this.dead>0||this.gameOver||this.phase!=='active'&&this.phase!=='bombard'&&!(this.encounter.enabled&&this.continuity.bridge))return;
    this.fx(this.local(p),'burst',45,this.invincible?'#7fe6d6':'#ff87b7');
    if(this.invincible){this.cooldown=.8;this.log(`접촉 / 무적 · ${tag}`);return;}
    this.hits++;this.hp=Math.max(0,this.hp-1);this.cooldown=2.8;this.damageFlash=.85;this.shake=Math.max(this.shake,.32);this.shots=[];
    for(const b of this.bodies())this.fx(this.local(b),'burst',52,'#ff9ab8',.7);
    if(this.hp<=0){this.deaths++;this.dead=1.1;this.log(`LIFE 0 · ${tag} → GAME OVER 대기`);}
    else this.log(`피격 · ${tag} · LIFE ${this.hp}/${MAX_HP} · 2.8초 무적`);
  }
  bomb(){
    if(this.attackLocked||this.stormInputLocked)return;
    if(this.dead>0||this.gameOver||this.bombs<=0||this.bombCooldown>0||this.smartBombActive||this.phase!=='active'&&this.phase!=='bombard')return;
    this.smartBombWorldOrigin=exileOutside(this)?{...this.advanced.exile.world}:this.localPlayer();this.smartBombHitBoss=false;
    if(exileOutside(this))this.advanced.exile.bombOrigin={...this.smartBombWorldOrigin};
    this.gateBombSpent=false;this.bombs--;this.bombCooldown=.25;this.smartBombActive=true;this.smartBombRadius=0;this.smartBombOrigin={...this.player};this.cooldown=Math.max(this.cooldown,1.2);
    this.smartBombLimit=bombExitRadius(this);
    const colors=['#fff7c2','#ffe66f','#ffd43b'];
    for(let i=0;i<60;i++){const a=i*Math.PI*2/60+(this.random()-.5)*.08,sp=450*(.76+this.random()*.28);this.bombParticles.push({x:this.smartBombWorldOrigin.x,y:this.smartBombWorldOrigin.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,age:0,life:1.2,size:8,color:colors[i%3]});}
    this.log(`스마트 폭탄 · BOMB ${this.bombs}/${MAX_BOMBS} · 정화파 1200 px/s`);
  }
  updateSmartBomb(dt:number){
    if(this.smartBombActive){
      this.smartBombRadius+=SMART_BOMB_SPEED*dt;
      this.smartBombLimit=Math.max(this.smartBombLimit,bombExitRadius(this));this.applySmartBombDamage();
    }
    for(const p of this.bombParticles){const pd=this.motionTime(p,dt,p.vx,p.vy);p.age+=pd;p.vx*=Math.exp(-1.5*pd);p.vy*=Math.exp(-1.5*pd);}
    this.bombParticles=this.bombParticles.filter(p=>p.age<p.life);
  }
  applySmartBombDamage(){
    if(this.attackLocked)return;
    if(!this.smartBombActive)return;const p=this.smartBombWorldOrigin,r=this.smartBombRadius;
    this.hazards=this.hazards.filter(h=>!bombReaches(this,h,Math.max(h.r,h.w/2,h.h/2)));
    this.links=this.links.filter(l=>this.hazards.includes(l.a)&&this.hazards.includes(l.b));this.enemies=this.enemies.filter(a=>!bombReaches(this,a,a.r));
    this.advanced.bolts=this.advanced.bolts.filter(b=>!b.points.slice(1).some((v,i)=>bombReaches(this,this.nearestPoint(p,b.points[i],v),10)));
    this.lasers=this.lasers.filter(l=>!l.paths.some(path=>path.slice(1).some((v,i)=>bombReaches(this,this.nearestPoint(p,path[i],v),4))));
    this.corridor.beams=this.corridor.beams.filter(b=>{const [a,z]=waveBeamPath(this,b),rect=waveBeamBounds(this,b);return !bombReaches(this,this.nearestPoint(p,a,z),Math.min(rect.w,rect.h)/2);});
    clearStormByBomb(this);clearMenuByBomb(this);clearStampByBomb(this);clearPathFoldByBomb(this);clearRecycleByBomb(this);clearUnseenByBomb(this);
    for(const w of this.advanced.walls)for(let i=0;i<w.cells.length;i++){if(w.cells[i]<=0)continue;const center={x:-this.fieldW/2+(i%w.cols+.5)*w.cellW,y:w.y+(Math.floor(i/w.cols)+.5-w.rows/2)*w.cellH};if(bombReaches(this,center,Math.hypot(w.cellW,w.cellH)/2))w.cells[i]=0;}
    if(exileOutside(this)){const x=this.advanced.exile;x.enemies=x.enemies.filter(m=>!bombReaches(this,m,27));}
    else if(!isMenuDeception(this)&&!this.smartBombHitBoss&&this.purification<0&&this.phase==='active'&&bombReaches(this,this.boss,52)){this.smartBombHitBoss=true;this.damageBoss(SMART_BOMB_BOSS_DAMAGE);this.fx(this.boss,'burst',82,'#ffe684',.7);}
  }
  nearestPoint(p:Vec,a:Vec,b:Vec):Vec{const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return {x:a.x+dx*t,y:a.y+dy*t};}
  resolveSmartBomb(){
    if(!this.smartBombActive)return;this.smartBombLimit=Math.max(this.smartBombLimit,bombExitRadius(this));
    // Include new enemies/projectiles and the last step before the wave leaves.
    this.applySmartBombDamage();if(this.smartBombRadius>=this.smartBombLimit)this.smartBombActive=false;
  }
  recordMiss(){if(!this.debtEnabled||this.pendingBombard||this.phase!=='active')return;this.miss=Math.min(this.missCap,this.miss+1);if(this.miss>=this.missCap){this.pendingBombard=true;this.log('미스 게이지 가득 참 · 패턴 종료 후 폭격 예약');}}
  startBombard(){
    this.phase='bombard';this.phaseTime=0;this.bombardAge=0;this.rotation=0;this.rotateTo(Math.round(this.angle/(Math.PI/2)),false);this.split=0;this.clearAttack();
    this.bombTotal=clamp(Math.ceil(15*this.miss/this.missCap),1,15);this.bombSpawned=0;this.bombTimer=.2;this.cooldown=1.8;
    this.log(`오염 폭격 · ${this.bombTotal}발 / 미스 ${this.miss}`);
  }
  updateRotation(dt:number){
    if(this.rotation<=0)return;this.rotation=Math.max(0,this.rotation-dt);
    const f=1-this.rotation/this.rotationDuration;
    this.angle=this.fromAngle+(this.targetAngle-this.fromAngle)*smooth((f-.25)/.75);
    if(this.rotation===0){this.orientation=(Math.round(this.targetAngle/(Math.PI/2))%4+4)%4;this.angle=this.targetAngle;
      if(!this.rotationLive)this.cooldown=Math.max(this.cooldown,.65);this.log(`전장 · ${modes[this.orientation]}`);}
  }
  move(dt:number){
    if(this.storyInputLocked||this.dead>0)return;
    const dx=Number(this.keys.has('ArrowRight')||this.keys.has('d'))-Number(this.keys.has('ArrowLeft')||this.keys.has('a'));
    // Screen y increases downward. W/up must always move toward screen top.
    const screenY=Number(this.keys.has('ArrowDown')||this.keys.has('s'))-Number(this.keys.has('ArrowUp')||this.keys.has('w'));
    if(this.pattern.id==='exile'&&this.phase==='active'){moveExile(this,dt,dx,screenY);return;}
    if(isMenuDeception(this)&&(this.phase==='active'||this.phase==='outro')){moveMenuPlayer(this,dt,dx,screenY);return;}
    if(this.pattern.id==='pause-storm'&&(this.phase==='active'||this.phase==='outro')){movePauseStorm(this,dt,dx,screenY);return;}
    const realDt=dt;dt*=this.localTime(this.localPlayer());
    const restricted=this.phase==='active'&&!this.rotation;
    if(this.pattern.id==='rhythm'&&restricted){
      const q=this.orientation%2?screenY:dx*(this.orientation===2?-1:1);
      const dir=this.orientation===3?-q:q;
      if(dir&&this.laneCooldown<=0){this.lane=clamp(this.lane+dir,0,4);this.laneCooldown=.145;}
      const p=this.screen({x:(this.lane-2)*this.fieldW/5,y:this.fieldH/2-100});
      this.player.x+=(p.x-this.player.x)*Math.min(1,dt*28);this.player.y+=(p.y-this.player.y)*Math.min(1,dt*28);
    }else if(this.pattern.id==='flight'&&restricted){
      const p=this.localPlayer();const a=260+this.stage*80+Math.min(this.t/24,1)*140;
      this.flightV=clamp(this.flightV+(this.keys.has(' ')?-a:a)*dt,-260,260);
      p.x+=this.flightV*dt;p.y=this.fieldH/6;
      if(p.x<-this.fieldW/2+12||p.x>this.fieldW/2-12){this.hit('천장·바닥 접촉');this.flightV=0;}
      p.x=clamp(p.x,-this.fieldW/2+13,this.fieldW/2-13);this.player=this.screen(p);
    }else if(this.pattern.id==='fluid'&&restricted){
      const p=this.localPlayer(),mag=Math.hypot(dx,screenY),c=Math.cos(this.angle),s=Math.sin(this.angle);
      const submerged=this.submerged(p);
      if(submerged&&!this.fluidWet){
        this.fluidPlayerV.x*=.35;this.fluidPlayerV.y*=.35;
        this.fx(p,'burst',72,'#dfb5ff',.65);this.fx(p,'ring',95,'#bc8aff',.8);
        this.log('입수 · 방향키로 헤엄치기');
      }
      this.fluidWet=submerged;
      if(!submerged){
        // Airborne: gravity points toward the visible liquid; swimming starts on contact.
        const g=this.gravityLocal();
        this.fluidPlayerV.x+=g.x*720*dt;this.fluidPlayerV.y+=g.y*720*dt;
        const v=Math.hypot(this.fluidPlayerV.x,this.fluidPlayerV.y);
        if(v>520){this.fluidPlayerV.x*=520/v;this.fluidPlayerV.y*=520/v;}
        p.x=clamp(p.x+this.fluidPlayerV.x*dt,-this.fieldW/2+14,this.fieldW/2-14);
        p.y=clamp(p.y+this.fluidPlayerV.y*dt,-this.fieldH/2+14,this.fieldH/2-14);
        this.player=this.screen(p);return;
      }
      if(mag){
        const sx=dx/mag,sy=screenY/mag,dir={x:sx*c+sy*s,y:-sx*s+sy*c};
        this.fluidThrottle=clamp(this.fluidThrottle+dt*.9,0,1.6);
        const target=Math.atan2(dir.y,dir.x)+Math.PI/2;let d=target-this.fluidHeading;while(d>Math.PI)d-=Math.PI*2;while(d< -Math.PI)d+=Math.PI*2;
        this.fluidHeading+=d*Math.min(1,dt*(4.2-this.fluidThrottle*.7));
        const thrust=235+this.fluidThrottle*115;
        this.fluidPlayerV.x+=dir.x*thrust*dt;this.fluidPlayerV.y+=dir.y*thrust*dt;
      }else this.fluidThrottle=Math.max(0,this.fluidThrottle-dt*1.25);
      const drag=Math.exp(-1.55*dt),flowPull=.72;
      this.fluidPlayerV.x+=(this.fluidFlow.x-this.fluidPlayerV.x)*flowPull*dt;this.fluidPlayerV.y+=(this.fluidFlow.y-this.fluidPlayerV.y)*flowPull*dt;
      this.fluidPlayerV.x*=drag;this.fluidPlayerV.y*=drag;
      const max=205+this.fluidThrottle*55,sp=Math.hypot(this.fluidPlayerV.x,this.fluidPlayerV.y);if(sp>max){this.fluidPlayerV.x*=max/sp;this.fluidPlayerV.y*=max/sp;}
      const n={x:p.x+this.fluidPlayerV.x*dt,y:p.y+this.fluidPlayerV.y*dt},m=14;
      const clamped={x:clamp(n.x,-this.fieldW/2+m,this.fieldW/2-m),y:clamp(n.y,-this.fieldH/2+m,this.fieldH/2-m)};
      if(clamped.x!==n.x)this.fluidPlayerV.x*=-.18;if(clamped.y!==n.y)this.fluidPlayerV.y*=-.18;this.player=this.screen(clamped);
      return;
    }else{
      const before=this.localPlayer();
      const v=PLAYER_MOVE_SPEED/(Math.hypot(dx,screenY)||1),c=Math.cos(this.angle),sn=Math.sin(this.angle);let p={...before};
      this.motionTime(p,realDt,(dx*c+screenY*sn)*v,(-dx*sn+screenY*c)*v);
      p=constrainWalls(this,before,p);this.player=this.screen(p);
      if(this.cutEnabled&&restricted&&this.cutPolygon.length>=3){p=constrainCutPlayer(this,before,p);this.player=this.screen(p);}
      else if(['split8','tile-stream'].includes(this.pattern.id)&&restricted){
        p.x=clamp(p.x,-this.fieldW/2+13,this.fieldW/2-13);p.y=clamp(p.y,-this.fieldH/2+13,this.fieldH/2-13);
        if(this.inTileCenter(p,10)){
          const xOnly={x:p.x,y:before.y},yOnly={x:before.x,y:p.y};
          p=!this.inTileCenter(xOnly,10)?xOnly:!this.inTileCenter(yOnly,10)?yOnly:before;
        }this.player=this.screen(p);
      }
    }
    const p=this.localPlayer(),span=supports(this).has('clones')?92*this.split:0,mx=13+Math.abs(Math.cos(this.angle))*span,my=13+Math.abs(Math.sin(this.angle))*span;
    p.x=clamp(p.x,-this.fieldW/2+mx,this.fieldW/2-mx);p.y=clamp(p.y,-this.fieldH/2+my,this.fieldH/2-my);this.player=this.screen(constrainCutPlayer(this,this.localPlayer(),p));
  }
  syncTimeZones(){
    if(this.encounter.enabled&&this.continuity.bridge){configureZones(this);return;}
    if(isMenuDeception(this))syncMenuField(this);
    else if(this.pattern.id==='pause-storm')syncPauseStormField(this);
    else if(this.fieldWarpEnabled)syncFieldWarp(this);
    else if(this.fullField&&this.pattern.category!=='special'&&(this.phase==='intro'||this.phase==='active')){const size=this.gridSize();if(this.fullViewport&&(Math.abs(size.w-this.fullViewport.w)>.01||Math.abs(size.h-this.fullViewport.h)>.01)){this.fieldW=size.w;this.fieldH=size.h;configureZones(this);}this.fullViewport=size;}
    syncSpaceCut(this);
    const zones=this.advanced.zones;if((this.phase==='intro'||this.phase==='active')&&supports(this).has('time')&&(!zones.length||Math.abs(zones[0].w-this.fieldW/3)>.01||Math.abs(zones[0].h-this.fieldH/(this.timeFieldFull?2:1))>.01||zones.length!==(this.timeFieldFull?6:3)))configureZones(this);
  }
  addEnemy(p:Partial<WorldActor>={}):WorldActor{const a=this.makeActor(p);this.enemies.push(a);return a;}
  addItem(p:Partial<WorldActor>={}):WorldActor{const a=this.makeActor({...p,color:p.color??'#8affdc'});this.items.push(a);return a;}
  makeActor(p:Partial<WorldActor>):WorldActor{return {id:++this.serial,x:0,y:0,vx:0,vy:60,age:0,life:30,r:18,hp:3,color:'#bd89ee',fireTimer:0,firePeriod:0,item:'energy',value:1,...p};}
  updateWorldActors(dt:number){
    const elapsed=new Map<number,number>();for(const a of [...this.enemies,...this.items]){const ad=this.motionTime(a,dt,a.vx,a.vy);a.age+=ad;elapsed.set(a.id,ad);}
    for(const a of this.enemies){const ad=elapsed.get(a.id)??0;a.fireTimer-=ad;if(a.firePeriod>0&&a.fireTimer<=0){a.fireTimer+=a.firePeriod;const p=this.localPlayer(),d=distance(a,p)||1;this.add({x:a.x,y:a.y,vx:(p.x-a.x)/d*155,vy:(p.y-a.y)/d*155,warn:0,life:10,color:a.color,tag:'일반 몬스터 탄'});}if(distance(a,this.localPlayer())<a.r+PLAYER_HIT_RADIUS)this.hit('일반 몬스터 접촉');}
    this.enemies=this.enemies.filter(a=>a.hp>0&&a.age<a.life);this.items=this.items.filter(a=>{if(distance(a,this.localPlayer())<a.r+PLAYER_HIT_RADIUS){if(a.item==='life')this.hp=Math.min(MAX_HP,this.hp+a.value);if(a.item==='bomb')this.bombs=Math.min(MAX_BOMBS,this.bombs+a.value);this.fx(a,'ring',32,a.color,.4);return false;}return a.age<a.life;});
  }
  updateShots(dt:number){
    if(this.attackLocked)return;
    if(this.pattern.id==='flight'){this.shots=[];return;}
    if(this.stormInputLocked)return;
    this.shotTimer-=dt*this.localTime(this.localPlayer());
    const bodies=this.bodies(),individual=bodies.length===3&&this.advanced.zones.length>0;
    if(individual)for(const i of [0,2])this.cloneShotTimers[i===0?0:1]-=dt*this.localTime(this.local(bodies[i]));
    if(this.dead<=0&&!this.gameOver&&playerFireAllowed(this)&&this.keys.has(' '))for(const [i,b] of bodies.entries()){
      const side=individual&&i!==1?i===0?0:1:-1,timer=side<0?this.shotTimer:this.cloneShotTimers[side];
      if(timer>0||!nativeCanFire(this))continue;const p=this.local(b);
      const heading=this.pattern.id==='fluid'?this.fluidHeading:this.pattern.id==='pause-storm'||isMenuDeception(this)?this.playerFacing:0;
      this.shots.push(...emitNativeShots(this,p,heading));
      if(side>=0)this.cloneShotTimers[side]=nativeFireInterval(this);
      // Linked bodies at equal time fire together. Commit the shared timer below.
    }
    if(this.dead<=0&&!this.gameOver&&this.keys.has(' ')&&this.shotTimer<=0&&nativeCanFire(this))this.shotTimer=nativeFireInterval(this);
    for(const s of this.shots){moveNativeShot(this,s,dt*this.localTime(s));if(s.age>=3)continue;bendInMagnet(this,s,dt*this.localTime(s));const prev={x:s.x,y:s.y},sd=this.pattern.id==='fluid'?dt*this.localTime(s):this.motionTime(s,dt,s.vx??0,s.vy);s.age+=sd;
      if(this.pattern.id==='fluid'){
        s.phase=(s.phase??0)+sd;let vx=s.vx??0,vy=s.vy,g=this.gravityLocal(),flow=this.fluidFlow,sp=Math.hypot(vx,vy)||1;
        const wobble=Math.sin((s.phase??0)*8+s.age*3.7)*38,px=-vy/sp,py=vx/sp;
        vx+=px*wobble*sd;vy+=py*wobble*sd;vx+=(flow.x-vx)*.48*sd+g.x*95*sd;vy+=(flow.y-vy)*.48*sd+g.y*95*sd;
        const drag=Math.exp(-1.05*sd);s.vx=vx*drag;s.vy=vy*drag;s.x+=(s.vx??0)*sd;s.y+=s.vy*sd;
      }
      if(teleportProjectile(this,s,prev,sd)){prev.x=s.x;prev.y=s.y;}
      if(shootGraduationLock(this,s,prev)){s.age=100;}
      else if(attackDestructibles(this,s,prev)){s.age=100;}
      else if(this.enemies.some(a=>{if(segmentDistance(a,prev,s)>=a.r+4)return false;a.hp-=shotDamage(s);s.age=100;this.fx(a,'ring',20,a.color,.25);return true;})){}
      else if(!isMenuDeception(this)&&!gateBlocksBoss(this)&&!(this.pattern.id==='outside-hands'&&this.phase==='active')&&(isNativeBeam(s)||segmentDistance(this.boss,prev,s)<52)){if(isNativeBeam(s)){if(this.clock<(s.beamNextHit??0))continue;s.beamNextHit=this.clock+.12;}else s.age=100;if(this.damageBoss(shotDamage(s))){this.bossHits++;this.fx(s,'ring',12,'#97f8eb',.18);}}
      else if(Math.abs(s.x)>this.fieldW/2+18||s.y<-this.fieldH/2-18||s.y>this.fieldH/2+18){s.age=100;this.recordMiss();}
    }
    this.shots=this.shots.filter(s=>s.age<3);
  }
  updateEntities(dt:number){
    for(const h of [...this.hazards]){
      let moveDt=dt,hd=0;
      // Warnings and flight have separate clocks; only the remaining real time moves the body.
      if(h.age<h.warn){
        if(h.kind==='seed'&&h.seedFrom&&h.seedTarget){const v={x:(h.seedTarget.x-h.seedFrom.x)/h.warn,y:(h.seedTarget.y-h.seedFrom.y)/h.warn},trial={x:h.x,y:h.y},elapsed=this.motionTime(trial,dt,v.x,v.y),remaining=h.warn-h.age;
          if(elapsed<=remaining){h.x=trial.x;h.y=trial.y;h.age+=elapsed;moveDt=0;}else{let lo=0,hi=dt;for(let i=0;i<18;i++){const t=(lo+hi)/2,q={x:h.x,y:h.y};if(this.motionTime(q,t,v.x,v.y)<remaining)lo=t;else hi=t;}moveDt=dt-hi;h.age=h.warn;h.x=h.seedTarget.x;h.y=h.seedTarget.y;}
        }else{const scale=this.localTime(h),wait=Math.min(dt,(h.warn-h.age)/scale);h.age+=wait*scale;hd+=wait*scale;moveDt-=wait;}
      }
      if(h.kind==='seed'){const local=moveDt*this.localTime(h);h.age+=local;if(h.age>=h.warn)updateSeed(this,h,local);continue;}
      if(moveDt<=1e-10)continue;
      const local=moveDt*this.localTime(h);prepareBullet(this,h,local);bendInMagnet(this,h,local);
      if(this.pattern.id==='fluid'&&h.tag==='유체 오염탄'){
        const g=this.gravityLocal(),flow=this.fluidFlow,sp=Math.hypot(h.vx,h.vy)||1,w=Math.sin(h.age*3.2+h.id)*18;
        const px=-h.vy/sp,py=h.vx/sp;h.vx+=(flow.x-h.vx)*.24*local+g.x*28*local+px*w*local;h.vy+=(flow.y-h.vy)*.24*local+g.y*28*local+py*w*local;
      }
      const before={x:h.x,y:h.y},moved=this.motionTime(h,moveDt,h.vx,h.vy);teleportProjectile(this,h,before,moved);h.age+=moved;hd+=moved;finishBullet(this,h,moved);
      if(h.kind==='note'){
        h.vy+=100*hd;
        if(!h.fired&&h.y>=this.fieldH/2-100){h.fired=true;h.life=0;
          const duration=h.hold||.16;
          this.add({kind:'rect',x:h.x,y:0,w:this.fieldW/5-12,h:this.fieldH,warn:0,life:duration,color:'#b878ff',tag:'판정선 레인 폭발'});
          this.fx({x:h.x,y:this.fieldH/2-100},'lane',65,'#b58aff',Math.max(.65,duration),h.lane);
          this.log(`리듬 ${h.lane+1}레인 · ${h.hold?'홀드':'폭발'}`);
        }continue;
      }
      if(h.kind==='bomb'){
        if(!h.fired&&h.age>=h.warn+.35){h.fired=true;h.life=0;this.shake=.15;this.fx(h,'bomb',75,'#c297ff',.8);
          this.add({x:h.x,y:h.y,r:30,warn:0,life:.16,tag:'폭격 착탄'});
          const base=this.random()*Math.PI*2;
          for(let i=0;i<10;i++){const a=base+i*Math.PI*2/10+(this.random()-.5)*.17;
            this.add({x:h.x,y:h.y,vx:Math.cos(a)*(90+this.random()*50),vy:Math.sin(a)*(90+this.random()*50),r:5,warn:0,life:3.5,tag:'오염 파편'});}
        }continue;
      }
      if(bulletHarmless(h))continue;
      for(const b of this.bodies()){
        const p=this.local(b);
        const touch=h.motion?.kind==='spear'?segmentDistance(p,{x:h.x-(h.motion.direction?.x??0)*37,y:h.y-(h.motion.direction?.y??1)*37},{x:h.x+(h.motion.direction?.x??0)*37,y:h.y+(h.motion.direction?.y??1)*37})<h.r+PLAYER_HIT_RADIUS:h.kind==='rect'||h.kind==='rocket'?circleRect(p,PLAYER_HIT_RADIUS,h):h.kind==='spike'?this.spikeHit(p,h):distance(p,h)<h.r+PLAYER_HIT_RADIUS;
        if(touch)this.hit(h.tag,b);
      }
    }
    collectRecycledBullets(this);
    this.hazards=this.hazards.filter(h=>h.age<h.warn+h.life&&Math.abs(h.x)<this.fieldW/2+180&&(h.group!==undefined?h.y<this.fieldH/2+250:Math.abs(h.y)<this.fieldH/2+200));
  }
  spikeHit(p:Vec,h:Entity){
    // Triangle tip follows sign(vx): use exact interior plus the 4px player-core edge distance.
    const sign=h.vx>=0?1:-1;
    const a={x:h.x+sign*h.w/2,y:h.y},b={x:h.x-sign*h.w/2,y:h.y-h.h/2},c={x:b.x,y:h.y+h.h/2};
    const cross=(u:Vec,v:Vec)=> (v.x-u.x)*(p.y-u.y)-(v.y-u.y)*(p.x-u.x);
    const vals=[cross(a,b),cross(b,c),cross(c,a)];
    return vals.every(v=>v>=0)||vals.every(v=>v<=0)||Math.min(segmentDistance(p,a,b),segmentDistance(p,b,c),segmentDistance(p,c,a))<PLAYER_HIT_RADIUS;
  }
  get presentationScale(){
    if(typeof window==='undefined')return 1;
    return Math.min(window.innerWidth,window.innerHeight)/CANVAS_H;
  }
  get displayScale(){
    if(typeof window==='undefined')return 1;
    const base=this.presentationScale;
    return this.pattern.id==='rhythm'?Math.min(base,Math.max(window.innerWidth,window.innerHeight)/1600):base;
  }
  get bossMapStage():BossMapStage{
    const mode=this.encounter.mode;
    if(this.purification>=0||this.encounter.enabled&&['false-clear','taunt','victory','complete'].includes(mode))return 'defeated';
    if(this.encounter.enabled&&mode==='awakening')return 'awakening';
    return (this.encounter.enabled?this.encounter.phase:this.bossForm)===2?'phase2':'phase1';
  }
  bombardSize(){
    if(typeof window==='undefined')return {w:BOMBARD_FIELD_W,h:BOMBARD_FIELD_H};
    const scale=this.displayScale;
    const sideways=Math.abs(Math.round(this.targetAngle/(Math.PI/2)))%2===1;
    return {w:(sideways?window.innerHeight:window.innerWidth)/scale,
      h:(sideways?window.innerWidth:window.innerHeight)/scale};
  }
  updateBombard(dt:number){
    const k=smooth(this.phaseTime/1.6),size=this.bombardSize();this.fieldW=BASE_FIELD_W+(size.w-BASE_FIELD_W)*k;this.fieldH=(this.pattern.id==='rhythm'?1600:BASE_FIELD_H)+(size.h-(this.pattern.id==='rhythm'?1600:BASE_FIELD_H))*k;if(['split8','tile-stream'].includes(this.pattern.id)){this.fieldW=size.w;this.fieldH=size.h;}
    if(this.phaseTime<1.8)return;
    this.bombardAge+=dt;this.bombTimer-=dt;
    if(this.bombSpawned<this.bombTotal&&this.bombTimer<=0){
      this.bombTimer=.85;const p=this.bombSpawned%2===0?this.localPlayer():{x:(this.random()-.5)*(this.fieldW-140),y:(this.random()-.5)*(this.fieldH-140)};
      this.add({kind:'bomb',x:clamp(p.x,-this.fieldW/2+50,this.fieldW/2-50),y:clamp(p.y,-this.fieldH/2+50,this.fieldH/2-50),r:20,warn:1.2,life:.4,tag:'오염 폭탄'});this.bombSpawned++;
    }
    this.updateEntities(dt);
    if(this.bombSpawned>=this.bombTotal&&this.hazards.length===0){this.phase='restore';this.phaseTime=0;this.miss=0;this.missTimer=0;this.pendingBombard=false;this.log('폭격 종료 · 전장 복구');}
  }
  step(dt:number){
    if(this.paused)return;this.bossMapScroll+=dt*bossMapSpeed(this.bossMapStage);if(updateEncounter(this,dt)){this.clock+=dt;this.playerAnimClock+=dt;for(let i=0;i<3;i++)this.bodyAnimClocks[i]+=dt;return;}tickBridge(this,dt);this.syncTimeZones();const playerDt=dt*this.localTime(this.localPlayer()),bossDt=dt*this.localTime(this.boss);this.playerAnimClock+=playerDt;for(const [i,b] of this.bodies().entries())this.bodyAnimClocks[this.bodies().length===3?i:1]+=dt*this.localTime(this.local(b));this.bossAnimClock+=bossDt;this.clock+=dt;this.phaseTime+=dt;this.cooldown=Math.max(0,this.cooldown-playerDt);this.bombCooldown=Math.max(0,this.bombCooldown-playerDt);this.damageFlash=Math.max(0,this.damageFlash-playerDt);this.laneCooldown-=playerDt;this.shake=Math.max(0,this.shake-dt);for(const z of this.advanced.zones)z.clock+=dt*z.scale;
    this.updateSmartBomb(dt);
    if(this.purification>=0){this.purification+=dt;this.resolveSmartBomb();return;}
    if(!this.encounter.enabled&&!this.finalStand.started&&this.bossForm===2&&this.phase==='active'&&(this.finalStand.pending||this.bossHp<=Math.max(1,this.bossHpMax*.01)))this.startFinalStand();
    if(!this.encounter.enabled&&(this.useResources||this.finalStand.complete)&&this.bossHp<=0){
      if(this.bossForm===1){this.bossForm=2;this.bossHp=this.bossHpMax;this.fx(this.boss,'burst',125,'#dab4ff',1.5);this.log('디그리온 최종 형태');}
      else{this.purification=0;this.clearAttack();this.fx(this.boss,'burst',180,'#ffefb4',2);this.log('졸업의 핵 · 정화');this.resolveSmartBomb();return;}
    }
    const facingTarget=this.pattern.id==='exile'&&this.phase==='active'?this.advanced.exile.heading:isMenuDeception(this)?this.menuDeception.heading:this.pattern.id==='pause-storm'&&this.phase==='active'?this.pauseStorm.heading:this.pattern.id==='fluid'&&this.phase==='active'&&this.fluidWet?this.fluidHeading:0;
    let facingDelta=facingTarget-this.playerFacing;
    while(facingDelta>Math.PI)facingDelta-=Math.PI*2;
    while(facingDelta< -Math.PI)facingDelta+=Math.PI*2;
    this.playerFacing+=facingDelta*(1-Math.exp(-12*playerDt));
    if(this.gameOver){this.resolveSmartBomb();return;}
    const rotationAnchor=this.localPlayer();
    this.updateRotation(dt);
    this.player=this.screen(rotationAnchor);
    if(this.fieldWarpEnabled&&!this.continuity.bridge){updateFieldWarp(this,dt);this.syncTimeZones();}
    if(this.dead>0){this.dead=Math.max(0,this.dead-playerDt);if(!this.dead&&this.hp<=0){this.gameOver=true;this.keys.clear();this.clearAttack();this.log('GAME OVER · R 또는 재시작 버튼으로 재도전');this.resolveSmartBomb();return;}}
    if(this.phase==='outro'&&this.pattern.id==='pause-storm')updateStormReturn(this,dt);
    if(this.phase==='outro'&&isMenuDeception(this))updateMenuReturn(this,dt);
    const targetSplit=supports(this).has('clones')&&this.emitting&&this.phase!=='outro'&&this.phase!=='bombard'&&this.phase!=='restore'&&this.dead<=0?1:0;
    this.split+=(targetSplit-this.split)*Math.min(1,playerDt*5);
    this.move(dt);
    if(this.phase==='intro'&&!this.encounter.enabled){const target=this.point(.5,this.pattern.id==='fluid'?.32:.82);this.player.x+=(target.x-this.player.x)*Math.min(1,dt*7);this.player.y+=(target.y-this.player.y)*Math.min(1,dt*7);}
    if(this.encounter.enabled){const target=bossTarget(this),k=1-Math.exp(-bossDt*4);if(!(this.combatPattern.id==='mirror'&&this.lasers.some(l=>l.age>=1.6))&&!isMenuDeception(this)){this.boss.x+=(target.x-this.boss.x)*k;this.boss.y+=(target.y-this.boss.y)*k;}tickBossPresence(this,dt);}
    if(this.phase==='intro'&&this.encounter.enabled){this.updateEntities(dt);this.updateShots(dt);this.updateWorldActors(dt);updateSupports(this,dt);}
    if(this.phase==='intro'&&this.phaseTime>2.2&&!this.rotation&&!this.continuity.bridge){this.phase='active';this.phaseTime=0;this.player=this.pattern.id==='rhythm'?this.point(.5,1-100/this.fieldH):this.pattern.id==='flight'?this.screen({x:0,y:this.fieldH/6}):this.player;this.log('공격 개시 · 빗나간 탄은 폭격 자원으로 누적');}
    else if(this.phase==='active'&&(!this.rotation||this.rotationLive)){
      this.t+=dt;this.beat-=bossDt;this.missTimer+=dt;
      if(this.debtEnabled&&this.missTimer>=30&&!this.pendingBombard){this.pendingBombard=true;this.log('30초 경과 · 패턴 종료 후 폭격 예약');}
      if(!this.encounter.enabled&&['split8','tile-stream'].includes(this.pattern.id)){this.boss.x=0;this.boss.y=-this.fieldH/2+140;}
      else if(!this.encounter.enabled&&!isMenuDeception(this)&&!(this.combatPattern.id==='mirror'&&this.lasers.some(l=>l.age>=1.6)))this.boss.x+=(Math.sin(this.bossAnimClock*.65)*(this.pattern.id==='miss'?165:65)-this.boss.x)*(1-Math.exp(-bossDt*5));
      if(this.pattern.category==='support')this.combatPattern.update(this,dt);else this.pattern.update(this,dt);
      updateSupports(this,dt);
      if(this.pattern.id!=='exile'){this.updateShots(dt);this.updateEntities(dt);this.updateWorldActors(dt);} 
      if(this.t>=this.pattern.duration||encounterCueExpired(this))this.finish();
      tickHandoff(this,dt);
    }else if(this.phase==='outro'&&this.phaseTime>(this.encounter.enabled&&this.pattern.id!=='pause-storm'&&!isMenuDeception(this)?.65:2.2)&&!this.rotation){if(this.pendingBombard)this.startBombard();else this.advance();}
    else if(this.phase==='bombard')this.updateBombard(dt);
    else if(this.phase==='restore'){
      const k=smooth(this.phaseTime/1.5),size=this.bombardSize();this.fieldW=size.w-(size.w-BASE_FIELD_W)*k;this.fieldH=size.h-(size.h-(this.pattern.id==='rhythm'?1600:BASE_FIELD_H))*k;
      if(['split8','tile-stream'].includes(this.pattern.id)){const size=this.gridSize();this.fieldW=size.w;this.fieldH=size.h;}
      if(this.phaseTime>=1.5)this.advance();
    }
    this.resolveSmartBomb();
    for(const f of this.effects)f.age+=dt*this.localTime(f);this.effects=this.effects.filter(f=>f.age<f.life).slice(-250);
  }
  start(){if(this.running)return;this.running=true;this.last=performance.now();let report=0;
    const frame=(now:number)=>{if(!this.running)return;const dt=Math.min(.05,(now-this.last)/1000);this.last=now;this.fps=this.fps*.92+.08/Math.max(.001,dt);this.acc+=dt*this.speed;
      let n=0;while(this.acc>=1/120&&n++<24){this.step(1/120);this.acc-=1/120;}this.draw();report+=dt;if(report>.1){this.notify();report=0;}this.raf=requestAnimationFrame(frame);};
    this.raf=requestAnimationFrame(frame);
  }
  stop(){this.running=false;cancelAnimationFrame(this.raf);}
  draw(){
    if(this.storyInputLocked){drawEncounterScene(this);return;}
    if(this.pattern.id==='flight'&&!this.continuity.bridge&&['intro','active'].includes(this.phase)){const p=this.localPlayer();this.fieldH=this.gridSize().w;this.player=this.screen({x:p.x,y:this.fieldH/6});}
    this.syncTimeZones();
    // Rotate the ACTUAL display rectangle, not just a map inside a fixed viewport.
    const plane=this.canvas.parentElement;
    const outside=exileOutside(this);
    const expanded=!!this.continuity.bridge||outside||this.fieldWarpEnabled||this.phase==='bombard'||this.phase==='restore'||['rhythm','flight'].includes(this.pattern.id)||['split8','tile-stream'].includes(this.pattern.id)||this.pattern.id==='pause-storm'||isMenuDeception(this)||this.fullField&&this.pattern.category!=='special';
    const viewport=this.gridSize(),warp=this.fieldWarpEnabled&&!this.continuity.bridge?fieldWarpCanvasSize(this):null;const w=outside?Math.round(viewport.w):warp?warp.w:expanded?Math.round(this.fieldW):CANVAS_W,h=outside?Math.round(viewport.h):warp?warp.h:expanded?Math.round(this.fieldH):CANVAS_H;
    if(this.canvas.width!==w)this.canvas.width=w;
    if(this.canvas.height!==h)this.canvas.height=h;
    if(plane){
      const scale=this.displayScale;
      plane.style.border=outside||isMenuDeception(this)?'0':'';plane.style.borderRadius=outside||isMenuDeception(this)?'0':'';
      // Explicit dimensions also avoid the canvas's intrinsic width overriding CSS aspect-ratio.
      plane.style.width=w*scale+'px';
      plane.style.height=h*scale+'px';
      plane.style.aspectRatio=w+'/'+h;
    }
    if(plane){const jolt=stormScreenShake(this),stampJolt=stampScreenShake(this),scale=this.displayScale;jolt.x+=stampJolt.x;jolt.y+=stampJolt.y;plane.style.transform=`translate(-50%, -50%) rotate(${this.angle}rad) translate(${jolt.x*scale}px, ${jolt.y*scale}px)`;}
    drawScene(this);
  }
}
