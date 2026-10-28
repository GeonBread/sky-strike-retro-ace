import {useEffect,useRef,useState} from 'react';
import {Engine} from '../../game/chapter3/degreeon/engine';
import {patterns} from '../../game/chapter3/degreeon/patterns';
import {phaseOneScore,phaseTwoScore,startCuePractice,startStoryPreview,advanceStoryDialogue,skipEncounterPattern,skipEncounterPhase,type StoryPreview} from '../../game/chapter3/degreeon/encounter';
import {supportOptions,categoryNames} from '../../game/chapter3/degreeon/advanced';
import {EncounterOverlay} from '../../game/chapter3/degreeon/EncounterOverlay';
import {EncounterAudio} from '../../game/chapter3/degreeon/encounterAudio';
import {useAppStore} from '../../store';
import {sfx} from '../../game/AudioSystem';
import '../../game/chapter3/degreeon/bossFont.css';
import '../../game/chapter3/degreeon/font.css';
import '../../game/chapter3/degreeon/encounterOverlay.css';
import './chapter3BossBattle.css';
export type Chapter3BossLaunch={phase?:1|2;tests?:boolean};
type Props={key?:string;launch?:Chapter3BossLaunch;power?:number;onComplete:()=>void;onExit:()=>void};
export function Chapter3BossBattle({launch={},power=1,onComplete,onExit}:Props){
 const canvas=useRef<HTMLCanvasElement>(null),engine=useRef<Engine|null>(null),audio=useRef<EncounterAudio|null>(null);
 const [revision,refresh]=useState(0),[tests,setTests]=useState(!!launch.tests),[tab,setTab]=useState<1|2|3>(launch.phase??1),[learning,setLearning]=useState<'first'|'expert'>('first'),[confirmExit,setConfirmExit]=useState(false);
 const testsRef=useRef(tests),exitRef=useRef(false),pausedBeforeTests=useRef(false),initial=useRef({launch,power});
 const callbacks=useRef({onComplete,onExit});callbacks.current={onComplete,onExit};
 const focus=()=>canvas.current?.focus({preventScroll:true});
 const openTests=(open:boolean)=>{const e=engine.current;if(!e)return;if(open&&!testsRef.current)pausedBeforeTests.current=e.paused;testsRef.current=open;setTests(open);e.keys.clear();e.paused=open?true:pausedBeforeTests.current;if(!open)focus();};
 const act=(fn:(e:Engine)=>void,resume=false)=>{const e=engine.current;if(!e)return;audio.current?.unlock();fn(e);e.keys.clear();if(resume){testsRef.current=false;setTests(false);pausedBeforeTests.current=false;e.paused=false;focus();}e.notify();};
 useEffect(()=>{
  const e=new Engine(canvas.current!,patterns),a=new EncounterAudio();engine.current=e;audio.current=a;
  const state=useAppStore.getState();e.nativeWeapon={style:state.shipStyle,color:state.shipColor,power:initial.current.power,shotIndex:0};e.hostPauseDialog=true;
  e.playStorySound=k=>{a.enabled=useAppStore.getState().settings.sfxVolume>0;a.play(k);};e.notify=()=>refresh(x=>x+1);
  e.startEncounter(initial.current.launch.phase===2);if(initial.current.launch.tests)e.paused=true;
  void document.fonts.load('400 52px "Degreeon Black Han"');
  const keyName=(v:KeyboardEvent)=>v.key.length===1?v.key.toLowerCase():v.key;
  const down=(v:KeyboardEvent)=>{
   const k=keyName(v);if(['F6','F7','F8','Escape'].includes(k))v.preventDefault();
   if(k==='F7'&&!v.repeat){openTests(!testsRef.current);return;}
   if(testsRef.current){if(k==='Escape')openTests(false);return;}
   if(exitRef.current)return;
   if((v.target as HTMLElement)?.matches('button,input,select')&&k!=='Escape')return;
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k))v.preventDefault();
   a.unlock();sfx.resumeAll();
   if(k==='Escape'&&!v.repeat){e.paused=!e.paused;e.keys.clear();e.notify();return;}
   if(e.paused)return;
   if(k==='F6'&&!v.repeat){skipEncounterPattern(e);return;}
   if(k==='F8'&&!v.repeat){skipEncounterPhase(e);return;}
   if(k==='r'&&!v.repeat){e.restart();return;}
   if((k==='Enter'||k===' ')&&e.storyInputLocked){if(!v.repeat)advanceStoryDialogue(e);return;}
   e.keys.add(k);if((k==='x'||k==='b')&&!v.repeat){e.bomb();sfx.bossExplode();}
  };
  const up=(v:KeyboardEvent)=>e.keys.delete(keyName(v));
  const blur=()=>{e.keys.clear();e.paused=true;e.notify();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  // Reuse the existing CH3 final-space track. There is no replacement BGM asset in the boss ZIP.
  sfx.startChapter3FinalSpaceBgm();e.start();focus();
  return()=>{e.stop();e.keys.clear();a.close();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
 },[]);
 useEffect(()=>{if(tests||confirmExit)document.querySelector<HTMLElement>('.c3boss-modal button')?.focus();},[tests,confirmExit]);
 const e=engine.current;
 const begin=(phase:1|2)=>act(e=>e.startEncounter(phase===2),true);
 const preview=(scene:StoryPreview)=>act(e=>startStoryPreview(e,scene),true);
 const phaseIds=(phase:1|2)=>new Set((phase===1?phaseOneScore:phaseTwoScore).flatMap(c=>[c.id,...c.supports]));
 const one=phaseIds(1),two=phaseIds(2);
 const leave=()=>{if(!e)return;e.paused=true;e.keys.clear();exitRef.current=true;setConfirmExit(true);};
 const closeExit=()=>{exitRef.current=false;setConfirmExit(false);if(e){e.paused=false;e.notify();}focus();};
 const trap=(v:{key:string;shiftKey:boolean;currentTarget:HTMLElement;preventDefault:()=>void})=>{if(v.key!=='Tab')return;const all=[...v.currentTarget.querySelectorAll<HTMLElement>('button,input,select')].filter(x=>!(x as HTMLButtonElement).disabled),first=all[0],last=all[all.length-1];if(v.shiftKey&&document.activeElement===first){v.preventDefault();last?.focus();}else if(!v.shiftKey&&document.activeElement===last){v.preventDefault();first?.focus();}};
 return <div className="c3boss-root" data-revision={revision}>
  <div className="c3boss-stage"><div className="c3boss-plane"><canvas ref={canvas} width={922} height={960} tabIndex={0} aria-label="챕터 3 디그리온 최종 보스 전투"/></div></div>
  <div className="c3boss-tools"><button onClick={()=>openTests(true)}>TEST · F7</button><button onClick={()=>act(e=>{e.paused=!e.paused;})}>{e?.paused?'재개':'일시정지'}</button></div>
  {e&&!tests&&!confirmExit&&<EncounterOverlay e={e} onNext={()=>act(advanceStoryDialogue)} onSkip={()=>act(e=>e.skip())} onRestart={()=>act(e=>e.restart(),true)} onPractice={()=>openTests(true)} onContinue={e.encounter.preview?undefined:()=>callbacks.current.onComplete()}/>}
  {e?.paused&&!tests&&!confirmExit&&<div className="chapterGamePauseOverlay"><section className="chapterGamePauseDialog" role="dialog" aria-modal="true" aria-label="보스전 일시 정지" onKeyDown={trap}><small>GAME PAUSED</small><h2>일시 정지</h2><p>디그리온의 전투가 잠시 멈췄습니다.</p><div className="chapterGamePauseActions"><button className="primary" onClick={()=>act(e=>{e.paused=false;},true)}>계속하기</button><button className="secondary" onClick={leave}>챕터 선택으로</button></div></section></div>}
  {e?.gameOver&&!tests&&!confirmExit&&<div className="c3boss-retry"><button onClick={()=>act(e=>e.restart(),true)}>다시 도전 · R</button><button onClick={leave}>챕터 선택으로</button></div>}
  {confirmExit&&<div className="c3boss-dim"><section className="c3boss-modal c3boss-confirm" role="dialog" aria-modal="true" aria-label="보스전 종료 확인" onKeyDown={trap}><h2>챕터 선택으로 돌아가시겠습니까?</h2><p>현재 보스전은 처음부터 다시 시작합니다.</p><button onClick={()=>callbacks.current.onExit()}>돌아가기</button><button onClick={closeExit}>계속하기</button></section></div>}
  {tests&&e&&<div className="c3boss-dim"><section className="c3boss-modal" role="dialog" aria-modal="true" aria-label="디그리온 패턴 테스트" onKeyDown={trap}>
   <header><div><small>CHAPTER 03 / DEVELOPER TEST</small><h2>디그리온 전투 테스트</h2><p>테스트 창이 열린 동안 전투와 연출은 정지합니다.</p></div><button onClick={()=>openTests(false)}>닫기 · F7 / ESC</button></header>
   <div className="c3boss-test-actions"><button onClick={()=>begin(1)}>전체 보스전 시작</button><button onClick={()=>begin(2)}>2페이즈부터 시작</button><button onClick={()=>act(skipEncounterPattern,true)}>다음 패턴 · F6</button><button onClick={()=>act(skipEncounterPhase,true)}>현재 페이즈 클리어 · F8</button><button onClick={leave}>챕터 선택으로</button></div>
   <div className="c3boss-test-options"><label>패턴 학습 <select value={learning} onChange={v=>setLearning(v.target.value as 'first'|'expert')}><option value="first">최초 학습 · 1 → 4단계</option><option value="expert">숙련 버전 · 3 → 4단계</option></select></label><label><input type="checkbox" checked={e.invincible} onChange={v=>act(e=>{e.invincible=v.target.checked;})}/> 테스트 무적</label><label>탄 강화 <select value={e.nativeWeapon.power} onChange={v=>act(e=>{e.nativeWeapon.power=Number(v.target.value);})}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label></div>
   <p className="c3boss-state">{e.encounter.enabled?`${e.encounter.phase}페이즈`: '예비 패턴'} · {e.pattern.name} · {e.encounter.learning.first?'최초 학습':'숙련'} {e.stage+1}단계 · LIFE {e.hp} / BOMB {e.bombs}</p>
   <nav className="c3boss-tabs" aria-label="테스트 페이즈">{([1,2,3] as const).map(n=><button key={n} aria-pressed={tab===n} onClick={()=>setTab(n)}>{n===3?'미편성 패턴':`${n}페이즈`}</button>)}</nav>
   {tab!==3?<div className="c3boss-pattern-list">{(tab===1?phaseOneScore:phaseTwoScore).map((c,i)=>{const p=patterns.find(p=>p.id===c.id)!;return <button key={`${c.id}-${i}`} onClick={()=>act(e=>startCuePractice(e,tab,i,learning),true)}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{p.name}</strong><small>{categoryNames[p.category]} · {one.has(c.id)&&two.has(c.id)?'공통 패턴':`${tab}페이즈 전용`}{c.supports.length?' + '+c.supports.map(id=>supportOptions.find(s=>s.id===id)?.name??id).join(' · '):''}</small></div><em>반복 테스트 ↗</em></button>;})}</div>:<div className="c3boss-pattern-list">{patterns.filter(p=>!one.has(p.id)&&!two.has(p.id)).map(p=><button key={p.id} onClick={()=>act(e=>{e.leaveEncounter();e.selectedSupports.clear();e.expert=learning==='expert';e.select(patterns.indexOf(p));e.bossForm=2;},true)}><div><strong>{p.name}</strong><small>{categoryNames[p.category]} · 현재 전투 편성에 포함되지 않은 원본 패턴</small></div></button>)}</div>}
   <p className="c3boss-test-note">선택한 패턴은 해당 페이즈의 보조 공격 조합까지 반복합니다. 전체 보스전에서는 처음 만난 패턴을 학습하고, 재등장 시 숙련 버전을 사용합니다. 재도전하면 학습 기록을 초기화합니다.</p>
   <footer><strong>연출 바로 보기</strong>{([['arrival','첫 등장'],['phase-clear','1페이즈 클리어'],['awakening','각성'],['victory','최종 처치'],['complete','클리어 화면']] as const).map(([id,title])=><button key={id} onClick={()=>preview(id)}>{title}</button>)}</footer>
  </section></div>}
 </div>;
}
